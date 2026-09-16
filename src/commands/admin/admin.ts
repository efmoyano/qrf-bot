import { EventType, SquadType, Team } from "@prisma/client";
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
import { requireAdmin } from "../../lib/permissions.js";
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
// STORM GROUP HANDLERS
// ---------------------------------------------------------------------------

async function handleStormConfig(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const type = interaction.options.getString("event", true) as EventType;
  const morningCron = interaction.options.getString("morning-cron", true);
  const nightCron = interaction.options.getString("night-cron", true);
  const channel = interaction.options.getChannel("channel", true);

  await db.eventConfig.upsert({
    where: { guildId_eventType: { guildId, eventType: type } },
    update: { morningCron, nightCron, channelId: channel.id },
    create: { guildId, eventType: type, morningCron, nightCron, channelId: channel.id },
  });

  await interaction.reply({
    content: `✅ Automatic posting configured for **${eventLabel(type)}** in <#${channel.id}>.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleStormUpcoming(
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
      content: "No upcoming storm events found.",
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
    .setTitle("📅 Upcoming Storm Events")
    .setDescription(lines.join("\n"))
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleStormCreate(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const type = interaction.options.getString("event", true) as EventType;
  const team = interaction.options.getString("team", true) as Team;
  const startStr = interaction.options.getString("start", true);
  const closeStr = interaction.options.getString("close", true);

  const start = new Date(startStr);
  const close = new Date(closeStr);

  if (isNaN(start.getTime()) || isNaN(close.getTime()) || close >= start) {
    await interaction.reply({
      content: "❌ Invalid dates. Registration close must be before start time.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const event = await db.event.create({
    data: {
      guildId,
      type,
      team,
      startsAt: start,
      registrationClosesAt: close,
      channelId: interaction.channelId,
    },
  });

  await interaction.reply({
    content: [
      `✅ Created **${eventLabel(type)} - ${teamLabel(team)}**`,
      `Start: <t:${Math.floor(start.getTime() / 1000)}:F>`,
      `Closes: <t:${Math.floor(close.getTime() / 1000)}:F>`,
      `ID: \`${event.id}\``,
    ].join("\n"),
    flags: MessageFlags.Ephemeral,
  });
}

// ---------------------------------------------------------------------------
// MEMBER GROUP HANDLERS
// ---------------------------------------------------------------------------

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
        "",
        `📌 Status: **${player.active ? "Active" : "Inactive"}**`,
      ].join("\n"),
    )
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: "Alliance Administration" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
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

async function handleStormGroup(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const sub = interaction.options.getSubcommand();
  if (sub === "config") return handleStormConfig(interaction);
  if (sub === "upcoming") return handleStormUpcoming(interaction);
  if (sub === "create") return handleStormCreate(interaction);
}

async function handleMemberGroup(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const sub = interaction.options.getSubcommand();
  if (sub === "list") return handleMemberList(interaction);
  if (sub === "view") return handleMemberView(interaction);
  if (sub === "update") return handleMemberUpdate(interaction);
  if (sub === "delete") return handleMemberDelete(interaction);
  if (sub === "restore") return handleMemberRestore(interaction);
  if (sub === "count") return handleMemberCount(interaction);
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
  description: "Alliance and Storm administration commands",
  data: new SlashCommandBuilder()
    .setName("admin")
    .setDescription("Alliance and Storm administration commands")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommandGroup((g) =>
      g
        .setName("storm")
        .setDescription("Storm event configuration and manual controls")
        .addSubcommand((s) =>
          s
            .setName("config")
            .setDescription("Configure automatic Storm posting")
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
                .setName("morning-cron")
                .setDescription("Cron expression for morning team")
                .setRequired(true),
            )
            .addStringOption((o) =>
              o
                .setName("night-cron")
                .setDescription("Cron expression for night team")
                .setRequired(true),
            )
            .addChannelOption((o) =>
              o
                .setName("channel")
                .setDescription("Posting channel")
                .setRequired(true),
            ),
        )
        .addSubcommand((s) =>
          s.setName("upcoming").setDescription("Show upcoming scheduled Storm events"),
        )
        .addSubcommand((s) =>
          s
            .setName("create")
            .setDescription("Manually create a Storm event")
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
                  { name: "Morning", value: "MORNING" },
                  { name: "Night", value: "NIGHT" },
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
    if (!(await requireAdmin(interaction))) return;

    const group = interaction.options.getSubcommandGroup();
    if (group === "storm") {
      await handleStormGroup(interaction);
      return;
    }
    if (group === "member") {
      await handleMemberGroup(interaction);
      return;
    }
    if (group === "role") {
      await handleRoleGroup(interaction);
      return;
    }
  },
};
