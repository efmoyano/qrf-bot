import { EventType, PlayerTag, SquadType } from "@prisma/client";
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  Role,
  SlashCommandBuilder,
} from "discord.js";
import { db } from "../../lib/db.js";
import { eventLabel, teamLabel } from "../../lib/events.js";
import { formatPower, parsePower } from "../../lib/format.js";
import { requireAdmin, requireRoleManager } from "../../lib/permissions.js";
import { postBattlefieldAnnouncement } from "../../lib/announcement.js";
import cron from "node-cron";
import { registerOrUpdateScheduler } from "../../lib/scheduler.js";
import {
  handleLineupAuto,
  handleLineupPublish,
  handleLineupSet,
  handleLineupView,
  handleLineupWizard,
} from "./lineup-handlers.js";
import {
  handleAttendanceFinalize,
  handleAttendanceMark,
  handleAttendanceWizard,
} from "./attendance-handlers.js";
import { playerTagIcon, playerTagLabel } from "../../lib/lineup.js";
import { Command } from "../types.js";

const ROLE_NAMES = {
  ALLIANCE_ADMIN: "Alliance Admin",
  EVENT_ADMIN: "Event Admin",
} as const;

const SQUAD_ICONS = {
  TANK: "🛡️",
  AIR: "✈️",
  MISSILE: "🚀",
} as const;

const SQUAD_LABELS = {
  TANK: "Tank",
  AIR: "Air",
  MISSILE: "Missile",
} as const;

function getSquadIcon(squad: SquadType): string {
  return SQUAD_ICONS[squad] ?? "⚔️";
}

function getSquadLabel(squad: SquadType): string {
  return SQUAD_LABELS[squad] ?? squad;
}

function getRoleName(roleType: string): string | null {
  if (roleType === "ALLIANCE_ADMIN") return ROLE_NAMES.ALLIANCE_ADMIN;
  if (roleType === "EVENT_ADMIN") return ROLE_NAMES.EVENT_ADMIN;
  return null;
}

// ---------------------------------------------------------------------------
// EVENT GROUP HANDLERS
// ---------------------------------------------------------------------------

async function handleEventConfig(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const type = interaction.options.getString("event", true) as EventType;
  const channel = interaction.options.getChannel("channel", true);
  const announcementCron = interaction.options.getString("cron") ?? "0 23 * * 6";
  const closeHours = interaction.options.getInteger("close-hours") ?? undefined;

  const cfg = await db.eventConfig.upsert({
    where: { guildId_eventType: { guildId, eventType: type } },
    update: {
      announcementCron,
      channelId: channel.id,
      ...(closeHours !== undefined ? { registrationCloseHours: closeHours } : {}),
    },
    create: {
      guildId,
      eventType: type,
      announcementCron,
      channelId: channel.id,
      registrationCloseHours: closeHours ?? 48,
    },
  });

  registerOrUpdateScheduler(interaction.client, {
    guildId,
    eventType: type,
    announcementCron,
    channelId: channel.id,
    enabled: true,
  });

  await interaction.reply({
    content: `✅ Automatic posting configured for **${eventLabel(type)}** in <#${channel.id}> (Cron: \`${announcementCron}\`, Closes: **${cfg.registrationCloseHours}h** after announcement).`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleEventAnnounce(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const type = interaction.options.getString("event", true) as EventType;
  const closeInMinutes =
    interaction.options.getInteger("close-in-minutes") ?? undefined;
  const closeInHours =
    interaction.options.getInteger("close-hours") ?? undefined;

  const cfg = await db.eventConfig.findUnique({
    where: { guildId_eventType: { guildId, eventType: type } },
  });

  const channelId = cfg?.channelId ?? interaction.channelId;

  const res = await postBattlefieldAnnouncement({
    client: interaction.client,
    guildId,
    type,
    channelId,
    closeInMinutes,
    closeInHours,
  });

  await interaction.reply({
    content: res.success ? `✅ ${res.message}` : `❌ ${res.message}`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleEventUpcoming(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const events = await db.event.findMany({
    where: { guildId, startsAt: { gt: new Date() } },
    orderBy: { startsAt: "asc" },
    take: 10,
  });

  if (!events.length) {
    await interaction.reply({
      content: "No upcoming battlefield events found.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const lines = events.map(
    (e) =>
      `• **${eventLabel(e.type)}** (${teamLabel(e.team)}) — Starts <t:${Math.floor(e.startsAt.getTime() / 1000)}:F>, closes <t:${Math.floor(e.registrationClosesAt.getTime() / 1000)}:R>`,
  );

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📅 Upcoming Battlefield Events")
    .setDescription(lines.join("\n"))
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function reapplyGuildSchedulers(client: any, guildId: string): Promise<void> {
  const configs = await db.eventConfig.findMany({ where: { guildId, enabled: true } });
  for (const cfg of configs) {
    if (!cfg.cronExpression) continue;
    registerOrUpdateScheduler(client, {
      guildId,
      eventType: cfg.eventType,
      announcementCron: cfg.cronExpression,
      channelId: cfg.channelId,
      enabled: true,
    });
  }
}

function scheduleOneOffAnnouncement(
  client: any,
  guildId: string,
  fallbackChannelId: string,
  startDate: Date,
): void {
  const delay = startDate.getTime() - Date.now();
  if (delay <= 0) return;

  setTimeout(async () => {
    const cfg = await db.eventConfig.findFirst({ where: { guildId, enabled: true } });
    if (!cfg) return;
    await postBattlefieldAnnouncement({
      client,
      guildId,
      type: cfg.eventType,
      channelId: cfg.channelId ?? fallbackChannelId,
    });
  }, delay);
}

// Schedule handler for custom cron or one‑off date
async function handleEventSchedule(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const cronExpr = interaction.options.getString("cron");
  const dateStr = interaction.options.getString("date");

  if (!cronExpr && !dateStr) {
    await interaction.reply({ content: "You must provide either a cron expression or a date.", flags: MessageFlags.Ephemeral });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (cronExpr) {
    if (!cron.validate(cronExpr)) {
      await interaction.reply({ content: `Invalid cron expression: ${cronExpr}`, flags: MessageFlags.Ephemeral });
      return;
    }
    updates.cronExpression = cronExpr;
    updates.startDate = null;
  }
  if (dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      await interaction.reply({ content: "Invalid date format. Use ISO‑8601.", flags: MessageFlags.Ephemeral });
      return;
    }
    updates.startDate = date;
    updates.cronExpression = null;
  }

  await db.eventConfig.updateMany({
    where: { guildId },
    data: updates,
  });

  if (cronExpr) {
    await reapplyGuildSchedulers(interaction.client, guildId);
  }
  if (dateStr && updates.startDate instanceof Date) {
    scheduleOneOffAnnouncement(interaction.client, guildId, interaction.channelId, updates.startDate);
  }

  await interaction.reply({ content: "Event schedule updated successfully.", flags: MessageFlags.Ephemeral });
}




async function handleMemberList(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const players = await db.player.findMany({
    where: { guildId, active: true },
    orderBy: { power: "desc" },
  });

  if (!players.length) {
    await interaction.reply({
      content: "No active alliance members found.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const lines = players.map((player, index) => {
    const icon = getSquadIcon(player.squadType);
    return [
      `**${index + 1}. ${player.gameName}**`,
      `${icon} ${getSquadLabel(player.squadType)} • 💥 ${formatPower(player.power)}`,
      `<@${player.discordId}>`,
    ].join(" | ");
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("⚔️ Alliance Members")
    .setDescription(lines.join("\n"))
    .setFooter({
      text: `${players.length} active member${players.length === 1 ? "" : "s"}`,
    })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleMemberView(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const user = interaction.options.getUser("player", true);

  const player = await db.player.findUnique({
    where: { guildId_discordId: { guildId, discordId: user.id } },
  });

  if (!player) {
    await interaction.reply({
      content: `❌ No profile found for ${user}.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const icon = getSquadIcon(player.squadType);
  const embed = new EmbedBuilder()
    .setColor(player.active ? 0x57f287 : 0x747f8d)
    .setTitle(`${icon} ${player.gameName}`)
    .setDescription(
      [
        `👤 Discord: ${user}`,
        `${icon} Squad: **${getSquadLabel(player.squadType)}**`,
        `💥 Power: **${formatPower(player.power)}**`,
        `🏷️ Priority Tag: **${playerTagIcon(player.tag)} ${playerTagLabel(player.tag)}**`,
        `📊 Battles Attended: **${player.attendanceCount}** • No-Shows: **${player.noShowCount}**`,
        "",
        `📌 Status: **${player.active ? "Active" : "Inactive"}**`,
      ].join("\n"),
    )
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: "Alliance Administration" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleMemberTag(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const user = interaction.options.getUser("player", true);
  const tag = interaction.options.getString("tag", true) as PlayerTag;

  const player = await db.player.findUnique({
    where: { guildId_discordId: { guildId, discordId: user.id } },
  });

  if (!player) {
    await interaction.reply({
      content: `❌ No profile found for ${user}.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await db.player.update({
    where: { id: player.id },
    data: { tag },
  });

  await interaction.reply({
    content: `✅ Updated **${player.gameName}** (${user}) priority tag to **${playerTagIcon(tag)} ${playerTagLabel(tag)}**.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleMemberUpdate(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const user = interaction.options.getUser("player", true);

  const player = await db.player.findUnique({
    where: { guildId_discordId: { guildId, discordId: user.id } },
  });

  if (!player) {
    await interaction.reply({
      content: `❌ No profile found for ${user}.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const name = interaction.options.getString("name");
  const squad = interaction.options.getString("squad") as SquadType | null;
  const powerInput = interaction.options.getString("power");

  if (!name && !squad && !powerInput) {
    await interaction.reply({
      content: "❌ Provide at least one field to update: `name`, `squad`, or `power`.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  let power: bigint | undefined;
  if (powerInput) {
    try {
      power = parsePower(powerInput);
    } catch {
      await interaction.reply({
        content: "❌ Invalid power format.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  const updated = await db.player.update({
    where: { id: player.id },
    data: {
      ...(name ? { gameName: name.trim() } : {}),
      ...(squad ? { squadType: squad } : {}),
      ...(power !== undefined ? { power } : {}),
    },
  });

  const icon = getSquadIcon(updated.squadType);
  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("✅ Player Updated")
    .setDescription(
      [
        `**${updated.gameName}**`,
        "",
        `${icon} Squad: **${getSquadLabel(updated.squadType)}**`,
        `💥 Power: **${formatPower(updated.power)}**`,
        "",
        `👤 Discord: ${user}`,
      ].join("\n"),
    )
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleMemberDelete(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const user = interaction.options.getUser("player", true);

  const player = await db.player.findUnique({
    where: { guildId_discordId: { guildId, discordId: user.id } },
  });

  if (!player) {
    await interaction.reply({
      content: `❌ No profile found for ${user}.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!player.active) {
    await interaction.reply({
      content: `⚠️ **${player.gameName}** is already inactive.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await db.player.update({
    where: { id: player.id },
    data: { active: false },
  });

  await interaction.reply({
    content: `🗑️ **${player.gameName}** deactivated. Use \`/admin member restore\` to reactivate.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleMemberRestore(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const user = interaction.options.getUser("player", true);

  const player = await db.player.findUnique({
    where: { guildId_discordId: { guildId, discordId: user.id } },
  });

  if (!player) {
    await interaction.reply({
      content: `❌ No profile found for ${user}.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (player.active) {
    await interaction.reply({
      content: `⚠️ **${player.gameName}** is already active.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await db.player.update({
    where: { id: player.id },
    data: { active: true },
  });

  await interaction.reply({
    content: `♻️ **${player.gameName}** has been restored.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleMemberCount(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const [total, tank, air, missile] = await Promise.all([
    db.player.count({ where: { guildId, active: true } }),
    db.player.count({ where: { guildId, active: true, squadType: SquadType.TANK } }),
    db.player.count({ where: { guildId, active: true, squadType: SquadType.AIR } }),
    db.player.count({ where: { guildId, active: true, squadType: SquadType.MISSILE } }),
  ]);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📊 Alliance Member Statistics")
    .setDescription(
      [
        `👥 **Total Active:** ${total}`,
        "",
        `🛡️ **Tank:** ${tank}`,
        `✈️ **Air:** ${air}`,
        `🚀 **Missile:** ${missile}`,
      ].join("\n"),
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// ---------------------------------------------------------------------------
// ROLE GROUP HANDLERS
// ---------------------------------------------------------------------------

async function checkManageRoles(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  const guild = interaction.guild;
  if (!guild) return false;

  const botMember = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
  const hasManageRoles =
    interaction.appPermissions?.has(PermissionFlagsBits.ManageRoles) ||
    botMember?.permissions.has(PermissionFlagsBits.ManageRoles);

  if (!hasManageRoles) {
    await interaction.reply({
      content:
        "❌ I need the **Manage Roles** permission.\n" +
        "In **Server Settings > Roles**, please enable **Manage Roles** for the bot's role.",
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }
  return true;
}

async function isRoleAboveBot(
  interaction: ChatInputCommandInteraction,
  role: Role,
): Promise<boolean> {
  const guild = interaction.guild;
  if (!guild) return true;
  const botMember = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
  if (botMember && role.position >= botMember.roles.highest.position) {
    await interaction.reply({
      content:
        `❌ I cannot manage **${role.name}** because it is positioned higher than my role.\n` +
        `In **Server Settings > Roles**, drag the bot's role above **${role.name}**.`,
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }
  return false;
}

async function handleRoleAdd(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;

  const user = interaction.options.getUser("user", true);
  const roleType = interaction.options.getString("role", true);
  const roleName = getRoleName(roleType);

  if (!roleName) {
    await interaction.reply({ content: "❌ Invalid role.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (!(await checkManageRoles(interaction))) return;

  const member = await guild.members.fetch(user.id);
  let role = guild.roles.cache.find((r) => r.name === roleName);
  if (!role) {
    role = await guild.roles.create({ name: roleName, reason: "Bot admin role" });
  }

  if (member.roles.cache.has(role.id)) {
    await interaction.reply({
      content: `⚠️ ${user} already has the **${role.name}** role.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (await isRoleAboveBot(interaction, role)) return;

  await member.roles.add(role);
  await interaction.reply({
    content: `✅ Granted **${role.name}** to ${user}.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleRoleRemove(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;

  const user = interaction.options.getUser("user", true);
  const roleType = interaction.options.getString("role", true);
  const roleName = getRoleName(roleType);

  if (!roleName) {
    await interaction.reply({ content: "❌ Invalid role.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (!(await checkManageRoles(interaction))) return;

  const member = await guild.members.fetch(user.id);
  const role = guild.roles.cache.find((r) => r.name === roleName);

  if (!role || !member.roles.cache.has(role.id)) {
    await interaction.reply({
      content: `⚠️ ${user} does not have the **${roleName}** role.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (await isRoleAboveBot(interaction, role)) return;

  await member.roles.remove(role);
  await interaction.reply({
    content: `✅ Removed **${role.name}** from ${user}.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleRoleList(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;

  const lines: string[] = [];
  for (const roleName of Object.values(ROLE_NAMES)) {
    const role = guild.roles.cache.find((r) => r.name === roleName);
    lines.push(`## ${roleName}`);
    if (!role || role.members.size === 0) {
      lines.push("_No members._\n");
    } else {
      lines.push([...role.members.values()].map((m) => `• ${m}`).join("\n") + "\n");
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🔐 Administration Roles")
    .setDescription(lines.join("\n"))
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// ---------------------------------------------------------------------------
// ROUTERS
// ---------------------------------------------------------------------------

async function handleEventGroup(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const sub = interaction.options.getSubcommand();
  if (sub === "config") return handleEventConfig(interaction);
  if (sub === "announce") return handleEventAnnounce(interaction);
  if (sub === "upcoming") return handleEventUpcoming(interaction);
  if (sub === "schedule") return handleEventSchedule(interaction);
}

async function handleMemberGroup(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const sub = interaction.options.getSubcommand();
  if (sub === "list") return handleMemberList(interaction);
  if (sub === "view") return handleMemberView(interaction);
  if (sub === "tag") return handleMemberTag(interaction);
  if (sub === "update") return handleMemberUpdate(interaction);
  if (sub === "delete") return handleMemberDelete(interaction);
  if (sub === "restore") return handleMemberRestore(interaction);
  if (sub === "count") return handleMemberCount(interaction);
}

async function handleLineupGroup(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const sub = interaction.options.getSubcommand();
  if (sub === "wizard") return handleLineupWizard(interaction);
  if (sub === "auto") return handleLineupAuto(interaction);
  if (sub === "view") return handleLineupView(interaction);
  if (sub === "set") return handleLineupSet(interaction);
  if (sub === "publish") return handleLineupPublish(interaction);
}

async function handleAttendanceGroup(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const sub = interaction.options.getSubcommand();
  if (sub === "wizard") return handleAttendanceWizard(interaction);
  if (sub === "mark") return handleAttendanceMark(interaction);
  if (sub === "finalize") return handleAttendanceFinalize(interaction);
}

async function handleRoleGroup(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const sub = interaction.options.getSubcommand();
  if (sub === "add") return handleRoleAdd(interaction);
  if (sub === "remove") return handleRoleRemove(interaction);
  if (sub === "list") return handleRoleList(interaction);
}

export const adminCommand: Command = {
  name: "admin",
  category: "Administration",
  description: "Alliance and event administration commands",
  data: new SlashCommandBuilder()
    .setName("admin")
    .setDescription("Alliance and event administration commands")
    .setDefaultMemberPermissions(0)
    .addSubcommandGroup((g) =>
      g
        .setName("event")
        .setDescription("Battlefield event configuration and manual controls")
        .addSubcommand((s) =>
          s
            .setName("config")
            .setDescription("Configure automatic event posting")
            .addStringOption((o) =>
              o
                .setName("event")
                .setDescription("Event type")
                .setRequired(true)
                .addChoices(
                  { name: "Desert Storm", value: "DESERT_STORM" },
                  { name: "Canyon Storm", value: "CANYON_STORM" },
                ),
            )
            .addChannelOption((o) =>
              o
                .setName("channel")
                .setDescription("Posting channel")
                .setRequired(true),
            )
            .addStringOption((o) =>
              o
                .setName("cron")
                .setDescription("Cron expression for weekly announcement (default: 0 23 * * 6)")
                .setRequired(false),
            )
            .addIntegerOption((o) =>
              o
                .setName("close-hours")
                .setDescription("Hours after announcement before registration closes (default: 48)")
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(168),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("announce")
            .setDescription("Immediately post battlefield announcement for upcoming cycle")
            .addStringOption((o) =>
              o
                .setName("event")
                .setDescription("Event type")
                .setRequired(true)
                .addChoices(
                  { name: "Desert Storm", value: "DESERT_STORM" },
                  { name: "Canyon Storm", value: "CANYON_STORM" },
                ),
            )
            .addIntegerOption((o) =>
              o
                .setName("close-hours")
                .setDescription("Registration window in hours (overrides event config)")
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(168),
            )
            .addIntegerOption((o) =>
              o
                .setName("close-in-minutes")
                .setDescription("Optional: minutes until registration closes (e.g. 1 to test)")
                .setRequired(false)
                .setMinValue(1),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("schedule")
            .setDescription("Set custom cron or one‑off date for next event")
            .addStringOption((o) =>
              o
                .setName("cron")
                .setDescription("Cron expression (UTC)")
                .setRequired(false),
            )
            .addStringOption((o) =>
              o
                .setName("date")
                .setDescription("ISO‑8601 date for a one‑off event")
                .setRequired(false),
            ),
        )
        .addSubcommand((s) =>
          s.setName("upcoming").setDescription("Show upcoming scheduled battlefield events"),
        )
        .addSubcommand((s) =>
          s
            .setName("create")
            .setDescription("Manually create a battlefield event")
            .addStringOption((o) =>
              o
                .setName("event")
                .setDescription("Event type")
                .setRequired(true)
                .addChoices(
                  { name: "Desert Storm Battlefield", value: "DESERT_STORM" },
                  { name: "Canyon Storm Battlefield", value: "CANYON_STORM" },
                ),
            )
            .addStringOption((o) =>
              o
                .setName("team")
                .setDescription("Team")
                .setRequired(true)
                .addChoices(
                  { name: "Team A", value: "TEAM_A" },
                  { name: "Team B", value: "TEAM_B" },
                ),
            )
            .addStringOption((o) =>
              o
                .setName("start")
                .setDescription("ISO start time, e.g. 2026-09-20T20:00:00")
                .setRequired(true),
            )
            .addStringOption((o) =>
              o
                .setName("close")
                .setDescription("ISO registration close time, e.g. 2026-09-20T19:30:00")
                .setRequired(true),
            ),
        ),
    )
    .addSubcommandGroup((g) =>
      g
        .setName("member")
        .setDescription("Alliance member roster management")
        .addSubcommand((s) =>
          s.setName("list").setDescription("List all active alliance members"),
        )
        .addSubcommand((s) =>
          s
            .setName("view")
            .setDescription("View a player's profile")
            .addUserOption((o) =>
              o.setName("player").setDescription("Discord user").setRequired(true),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("update")
            .setDescription("Update a player's profile")
            .addUserOption((o) =>
              o.setName("player").setDescription("Discord user").setRequired(true),
            )
            .addStringOption((o) =>
              o.setName("name").setDescription("New in-game name").setRequired(false),
            )
            .addStringOption((o) =>
              o
                .setName("squad")
                .setDescription("Main squad")
                .setRequired(false)
                .addChoices(
                  { name: "🛡️ Tank", value: "TANK" },
                  { name: "✈️ Air", value: "AIR" },
                  { name: "🚀 Missile", value: "MISSILE" },
                ),
            )
            .addStringOption((o) =>
              o
                .setName("power")
                .setDescription("Power in millions, e.g. 80m or 90")
                .setRequired(false),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("delete")
            .setDescription("Deactivate a player from the alliance")
            .addUserOption((o) =>
              o.setName("player").setDescription("Discord user").setRequired(true),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("restore")
            .setDescription("Restore a deactivated player")
            .addUserOption((o) =>
              o.setName("player").setDescription("Discord user").setRequired(true),
            ),
        )
        .addSubcommand((s) =>
          s.setName("count").setDescription("Show alliance member statistics"),
        )
        .addSubcommand((s) =>
          s
            .setName("tag")
            .setDescription("Set a member's priority tier tag")
            .addUserOption((o) =>
              o.setName("player").setDescription("Alliance member").setRequired(true),
            )
            .addStringOption((o) =>
              o
                .setName("tag")
                .setDescription("Priority tier")
                .setRequired(true)
                .addChoices(
                  { name: "⭐ Star (Core Member)", value: "STAR" },
                  { name: "🔵 Blue (Priority)", value: "BLUE" },
                  { name: "⚪ White (Neutral)", value: "WHITE" },
                  { name: "🔴 Red (No-Show Penalty)", value: "RED" },
                ),
            ),
        ),
    )
    .addSubcommandGroup((g) =>
      g
        .setName("lineup")
        .setDescription("Battlefield lineup management (20 Main + 10 Substitutes)")
        .addSubcommand((s) =>
          s
            .setName("wizard")
            .setDescription("Interactive UI to select Main starters and Substitutes")
            .addStringOption((o) =>
              o
                .setName("event")
                .setDescription("Event type")
                .setRequired(true)
                .addChoices(
                  { name: "Desert Storm", value: "DESERT_STORM" },
                  { name: "Canyon Storm", value: "CANYON_STORM" },
                ),
            )
            .addStringOption((o) =>
              o
                .setName("team")
                .setDescription("Team")
                .setRequired(true)
                .addChoices(
                  { name: "Team A", value: "TEAM_A" },
                  { name: "Team B", value: "TEAM_B" },
                ),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("auto")
            .setDescription("Auto-select lineup based on player priority tags & power")
            .addStringOption((o) =>
              o
                .setName("event")
                .setDescription("Event type")
                .setRequired(true)
                .addChoices(
                  { name: "Desert Storm", value: "DESERT_STORM" },
                  { name: "Canyon Storm", value: "CANYON_STORM" },
                ),
            )
            .addStringOption((o) =>
              o
                .setName("team")
                .setDescription("Team")
                .setRequired(true)
                .addChoices(
                  { name: "Team A", value: "TEAM_A" },
                  { name: "Team B", value: "TEAM_B" },
                ),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("view")
            .setDescription("View current lineup breakdown")
            .addStringOption((o) =>
              o
                .setName("event")
                .setDescription("Event type")
                .setRequired(true)
                .addChoices(
                  { name: "Desert Storm", value: "DESERT_STORM" },
                  { name: "Canyon Storm", value: "CANYON_STORM" },
                ),
            )
            .addStringOption((o) =>
              o
                .setName("team")
                .setDescription("Team")
                .setRequired(true)
                .addChoices(
                  { name: "Team A", value: "TEAM_A" },
                  { name: "Team B", value: "TEAM_B" },
                ),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("set")
            .setDescription("Manually assign a player's role in the lineup")
            .addStringOption((o) =>
              o
                .setName("event")
                .setDescription("Event type")
                .setRequired(true)
                .addChoices(
                  { name: "Desert Storm", value: "DESERT_STORM" },
                  { name: "Canyon Storm", value: "CANYON_STORM" },
                ),
            )
            .addStringOption((o) =>
              o
                .setName("team")
                .setDescription("Team")
                .setRequired(true)
                .addChoices(
                  { name: "Team A", value: "TEAM_A" },
                  { name: "Team B", value: "TEAM_B" },
                ),
            )
            .addUserOption((o) =>
              o.setName("player").setDescription("Registered player").setRequired(true),
            )
            .addStringOption((o) =>
              o
                .setName("role")
                .setDescription("Role in lineup")
                .setRequired(true)
                .addChoices(
                  { name: "🏆 Main Squad (Starter)", value: "MAIN" },
                  { name: "🔄 Substitute (Reserve)", value: "SUBSTITUTE" },
                  { name: "⏸️ Standby (Unselected)", value: "UNSELECTED" },
                ),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("publish")
            .setDescription("Broadcast official lineup embed to event channel")
            .addStringOption((o) =>
              o
                .setName("event")
                .setDescription("Event type")
                .setRequired(true)
                .addChoices(
                  { name: "Desert Storm", value: "DESERT_STORM" },
                  { name: "Canyon Storm", value: "CANYON_STORM" },
                ),
            )
            .addStringOption((o) =>
              o
                .setName("team")
                .setDescription("Team")
                .setRequired(true)
                .addChoices(
                  { name: "Team A", value: "TEAM_A" },
                  { name: "Team B", value: "TEAM_B" },
                ),
            ),
        ),
    )
    .addSubcommandGroup((g) =>
      g
        .setName("attendance")
        .setDescription("Battlefield attendance tracking & priority updates")
        .addSubcommand((s) =>
          s
            .setName("wizard")
            .setDescription("Interactive UI to mark attendance and record No-Shows")
            .addStringOption((o) =>
              o
                .setName("event")
                .setDescription("Event type")
                .setRequired(true)
                .addChoices(
                  { name: "Desert Storm", value: "DESERT_STORM" },
                  { name: "Canyon Storm", value: "CANYON_STORM" },
                ),
            )
            .addStringOption((o) =>
              o
                .setName("team")
                .setDescription("Team")
                .setRequired(true)
                .addChoices(
                  { name: "Team A", value: "TEAM_A" },
                  { name: "Team B", value: "TEAM_B" },
                ),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("mark")
            .setDescription("Record a player's attendance or no-show")
            .addStringOption((o) =>
              o
                .setName("event")
                .setDescription("Event type")
                .setRequired(true)
                .addChoices(
                  { name: "Desert Storm", value: "DESERT_STORM" },
                  { name: "Canyon Storm", value: "CANYON_STORM" },
                ),
            )
            .addStringOption((o) =>
              o
                .setName("team")
                .setDescription("Team")
                .setRequired(true)
                .addChoices(
                  { name: "Team A", value: "TEAM_A" },
                  { name: "Team B", value: "TEAM_B" },
                ),
            )
            .addUserOption((o) =>
              o.setName("player").setDescription("Registered player").setRequired(true),
            )
            .addStringOption((o) =>
              o
                .setName("status")
                .setDescription("Attendance status")
                .setRequired(true)
                .addChoices(
                  { name: "✅ Attended & Played", value: "ATTENDED" },
                  { name: "🔴 No-Show (Missed Battle)", value: "NO_SHOW" },
                ),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("finalize")
            .setDescription("Finalize match attendance: sets unselected to Blue & no-shows to Red")
            .addStringOption((o) =>
              o
                .setName("event")
                .setDescription("Event type")
                .setRequired(true)
                .addChoices(
                  { name: "Desert Storm", value: "DESERT_STORM" },
                  { name: "Canyon Storm", value: "CANYON_STORM" },
                ),
            )
            .addStringOption((o) =>
              o
                .setName("team")
                .setDescription("Team")
                .setRequired(true)
                .addChoices(
                  { name: "Team A", value: "TEAM_A" },
                  { name: "Team B", value: "TEAM_B" },
                ),
            ),
        ),
    )
    .addSubcommandGroup((g) =>
      g
        .setName("role")
        .setDescription("Alliance admin role management")
        .addSubcommand((s) =>
          s
            .setName("add")
            .setDescription("Grant an administration role to a user")
            .addUserOption((o) =>
              o.setName("user").setDescription("Discord user").setRequired(true),
            )
            .addStringOption((o) =>
              o
                .setName("role")
                .setDescription("Administration role")
                .setRequired(true)
                .addChoices(
                  { name: "👑 Alliance Admin", value: "ALLIANCE_ADMIN" },
                  { name: "⚔️ Event Admin", value: "EVENT_ADMIN" },
                ),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("remove")
            .setDescription("Remove an administration role from a user")
            .addUserOption((o) =>
              o.setName("user").setDescription("Discord user").setRequired(true),
            )
            .addStringOption((o) =>
              o
                .setName("role")
                .setDescription("Administration role")
                .setRequired(true)
                .addChoices(
                  { name: "👑 Alliance Admin", value: "ALLIANCE_ADMIN" },
                  { name: "⚔️ Event Admin", value: "EVENT_ADMIN" },
                ),
            ),
        )
        .addSubcommand((s) =>
          s.setName("list").setDescription("List users with administration roles"),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const group = interaction.options.getSubcommandGroup();
    if (group === "role") {
      if (!(await requireRoleManager(interaction))) return;
      await handleRoleGroup(interaction);
      return;
    }

    if (!(await requireAdmin(interaction))) return;

    if (group === "event") {
      await handleEventGroup(interaction);
      return;
    }
    if (group === "member") {
      await handleMemberGroup(interaction);
      return;
    }
    if (group === "lineup") {
      await handleLineupGroup(interaction);
      return;
    }
    if (group === "attendance") {
      await handleAttendanceGroup(interaction);
      return;
    }
  },
};
