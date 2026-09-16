import { EventType, Team } from "@prisma/client";
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { db } from "../../lib/db.js";
import { formatPower } from "../../lib/format.js";
import { eventLabel, teamLabel } from "../../lib/events.js";
import { Command } from "../types.js";

async function handleRegister(
  interaction: ChatInputCommandInteraction,
  type: EventType,
  team: Team,
): Promise<void> {
  const guildId = interaction.guildId!;
  const discordId = interaction.user.id;

  const event = await db.event.findFirst({
    where: { guildId, type, team, startsAt: { gt: new Date() } },
    orderBy: { startsAt: "asc" },
  });

  if (!event) {
    await interaction.reply({
      content: "❌ No upcoming event found for that event/team.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const player = await db.player.findUnique({
    where: { guildId_discordId: { guildId, discordId } },
  });

  if (!player) {
    await interaction.reply({
      content: "❌ Create your profile first with `/profile register`.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (new Date() >= event.registrationClosesAt) {
    await interaction.reply({
      content: "❌ Registration for this event has closed.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await db.registration.upsert({
    where: { eventId_playerId: { eventId: event.id, playerId: player.id } },
    update: {
      powerSnapshot: player.power,
      squadSnapshot: player.squadType,
    },
    create: {
      eventId: event.id,
      playerId: player.id,
      powerSnapshot: player.power,
      squadSnapshot: player.squadType,
    },
  });

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("✅ Registered for Battlefield Event")
    .setDescription(
      [
        `**Event:** ${eventLabel(type)}`,
        `**Team:** ${teamLabel(team)}`,
        `**Time:** <t:${Math.floor(event.startsAt.getTime() / 1000)}:F>`,
        `**Power Snapshot:** ${formatPower(player.power)}`,
      ].join("\n"),
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleUnregister(
  interaction: ChatInputCommandInteraction,
  type: EventType,
  team: Team,
): Promise<void> {
  const guildId = interaction.guildId!;
  const discordId = interaction.user.id;

  const event = await db.event.findFirst({
    where: { guildId, type, team, startsAt: { gt: new Date() } },
    orderBy: { startsAt: "asc" },
  });

  if (!event) {
    await interaction.reply({
      content: "❌ No upcoming event found for that event/team.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const player = await db.player.findUnique({
    where: { guildId_discordId: { guildId, discordId } },
  });

  if (!player) {
    await interaction.reply({
      content: "❌ Profile not found.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await db.registration.deleteMany({
    where: { eventId: event.id, playerId: player.id },
  });

  await interaction.reply({
    content: "✅ You have been removed from the event registration.",
    flags: MessageFlags.Ephemeral,
  });
}

async function handleList(
  interaction: ChatInputCommandInteraction,
  type: EventType,
  team: Team,
): Promise<void> {
  const guildId = interaction.guildId!;

  const event = await db.event.findFirst({
    where: { guildId, type, team, startsAt: { gt: new Date() } },
    orderBy: { startsAt: "asc" },
  });

  if (!event) {
    await interaction.reply({
      content: "❌ No upcoming event found for that event/team.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const rows = await db.registration.findMany({
    where: { eventId: event.id },
    include: { player: true },
    orderBy: { powerSnapshot: "desc" },
  });

  if (!rows.length) {
    await interaction.reply({
      content: `**${eventLabel(type)} - ${teamLabel(team)}**\n_No registrations yet._`,
    });
    return;
  }

  const body = rows
    .map(
      (r, n) =>
        `${n + 1}. **${r.player.gameName}** • ${r.squadSnapshot} • ${formatPower(r.powerSnapshot)}`,
    )
    .join("\n");

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🌩️ ${eventLabel(type)} - ${teamLabel(team)}`)
    .setDescription(
      [
        `📅 Starts: <t:${Math.floor(event.startsAt.getTime() / 1000)}:F>`,
        `⏳ Closes: <t:${Math.floor(event.registrationClosesAt.getTime() / 1000)}:R>`,
        "",
        "### Registered Players",
        body,
      ].join("\n"),
    )
    .setFooter({ text: `${rows.length} player${rows.length === 1 ? "" : "s"} registered` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

export const eventCommand: Command = {
  name: "event",
  category: "Events",
  description: "Desert Storm and Canyon Storm event commands",
  data: new SlashCommandBuilder()
    .setName("event")
    .setDescription("Desert Storm and Canyon Storm event commands")
    .addSubcommand((s) =>
      s
        .setName("register")
        .setDescription("Register for a Storm event")
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
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("unregister")
        .setDescription("Remove yourself from an event")
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
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("list")
        .setDescription("List registered players for an event")
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
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();
    const type = interaction.options.getString("event", true) as EventType;
    const team = interaction.options.getString("team", true) as Team;

    if (sub === "register") {
      await handleRegister(interaction, type, team);
      return;
    }
    if (sub === "unregister") {
      await handleUnregister(interaction, type, team);
      return;
    }
    if (sub === "list") {
      await handleList(interaction, type, team);
      return;
    }
  },
};
