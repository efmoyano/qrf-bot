import { EventType, ParticipationRole, Team } from "@prisma/client";
import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { db } from "../../lib/db.js";
import { eventLabel, teamLabel } from "../../lib/events.js";
import { autoSelectLineup, buildLineupEmbed, setPlayerRole } from "../../lib/lineup.js";

export async function handleLineupAuto(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const type = interaction.options.getString("event", true) as EventType;
  const team = interaction.options.getString("team", true) as Team;

  const event = await db.event.findFirst({
    where: { guildId, type, team, startsAt: { gt: new Date() } },
    orderBy: { startsAt: "asc" },
  });

  if (!event) {
    await interaction.reply({
      content: `❌ No upcoming event found for **${eventLabel(type)} - ${teamLabel(team)}**.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const result = await autoSelectLineup(event.id);

  const registrations = await db.registration.findMany({
    where: { eventId: event.id },
    include: { player: true },
  });

  const embed = buildLineupEmbed(event, registrations);

  await interaction.reply({
    content: `✅ Auto-selected lineup: **${result.mainCount}** Main, **${result.subCount}** Substitutes, **${result.unselectedCount}** Standby (Total: ${result.total}).`,
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleLineupView(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const type = interaction.options.getString("event", true) as EventType;
  const team = interaction.options.getString("team", true) as Team;

  const event = await db.event.findFirst({
    where: { guildId, type, team, startsAt: { gt: new Date() } },
    orderBy: { startsAt: "asc" },
  });

  if (!event) {
    await interaction.reply({
      content: `❌ No upcoming event found for **${eventLabel(type)} - ${teamLabel(team)}**.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const registrations = await db.registration.findMany({
    where: { eventId: event.id },
    include: { player: true },
  });

  if (registrations.length === 0) {
    await interaction.reply({
      content: `ℹ️ No registrations found for **${eventLabel(type)} - ${teamLabel(team)}**.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const embed = buildLineupEmbed(event, registrations);
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

export async function handleLineupSet(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const type = interaction.options.getString("event", true) as EventType;
  const team = interaction.options.getString("team", true) as Team;
  const user = interaction.options.getUser("player", true);
  const role = interaction.options.getString("role", true) as ParticipationRole;

  const event = await db.event.findFirst({
    where: { guildId, type, team, startsAt: { gt: new Date() } },
    orderBy: { startsAt: "asc" },
  });

  if (!event) {
    await interaction.reply({
      content: `❌ No upcoming event found for **${eventLabel(type)} - ${teamLabel(team)}**.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const player = await db.player.findUnique({
    where: { guildId_discordId: { guildId, discordId: user.id } },
  });

  if (!player) {
    await interaction.reply({
      content: `❌ Profile not found for ${user}.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const reg = await db.registration.findUnique({
    where: { eventId_playerId: { eventId: event.id, playerId: player.id } },
  });

  if (!reg) {
    await interaction.reply({
      content: `❌ **${player.gameName}** is not registered for this event.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await setPlayerRole(event.id, player.id, role);

  await interaction.reply({
    content: `✅ Updated **${player.gameName}** (${user}) to **${role}** in ${eventLabel(type)} - ${teamLabel(team)}.`,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleLineupPublish(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const type = interaction.options.getString("event", true) as EventType;
  const team = interaction.options.getString("team", true) as Team;

  const event = await db.event.findFirst({
    where: { guildId, type, team, startsAt: { gt: new Date() } },
    orderBy: { startsAt: "asc" },
  });

  if (!event) {
    await interaction.reply({
      content: `❌ No upcoming event found for **${eventLabel(type)} - ${teamLabel(team)}**.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const cfg = await db.eventConfig.findUnique({
    where: { guildId_eventType: { guildId, eventType: type } },
  });

  const channelId = event.channelId ?? cfg?.channelId ?? interaction.channelId;
  const channel = await interaction.client.channels.fetch(channelId).catch(() => null);

  if (!channel || !channel.isSendable()) {
    await interaction.reply({
      content: `❌ Could not send to channel <#${channelId}>.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const registrations = await db.registration.findMany({
    where: { eventId: event.id },
    include: { player: true },
  });

  const embed = buildLineupEmbed(event, registrations);
  await channel.send({ embeds: [embed] });

  await interaction.reply({
    content: `✅ Lineup published to <#${channelId}>!`,
    flags: MessageFlags.Ephemeral,
  });
}
