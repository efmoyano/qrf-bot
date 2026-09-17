import { AttendanceStatus, EventType, ParticipationRole, PlayerTag, Team } from "@prisma/client";
import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { db } from "../../lib/db.js";
import { eventLabel, teamLabel } from "../../lib/events.js";
import { finalizeAttendance, playerTagIcon, playerTagLabel } from "../../lib/lineup.js";
import { buildAttendanceWizardPayload } from "../../interactions/attendance-wizard.js";
import {
  buildAttendanceBroadcastEmbed,
  notifyAttendanceFinalized,
} from "../../lib/notifications.js";

export async function handleAttendanceWizard(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const type = interaction.options.getString("event", true) as EventType;
  const team = interaction.options.getString("team", true) as Team;

  const event = await db.event.findFirst({
    where: { guildId, type, team },
    orderBy: { startsAt: "desc" },
  });

  if (!event) {
    await interaction.reply({
      content: `❌ No event found for **${eventLabel(type)} - ${teamLabel(team)}**.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const selectedCount = await db.registration.count({
    where: {
      eventId: event.id,
      role: { in: [ParticipationRole.MAIN, ParticipationRole.SUBSTITUTE] },
    },
  });

  if (selectedCount === 0) {
    await interaction.reply({
      content: `❌ No players are assigned to Main Squad or Substitutes for this event. Please configure the lineup first with \`/admin lineup wizard\`.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const payload = await buildAttendanceWizardPayload(event.id);
  await interaction.reply({
    ...payload,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleAttendanceMark(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const type = interaction.options.getString("event", true) as EventType;
  const team = interaction.options.getString("team", true) as Team;
  const user = interaction.options.getUser("player", true);
  const status = interaction.options.getString("status", true) as AttendanceStatus;

  const event = await db.event.findFirst({
    where: { guildId, type, team },
    orderBy: { startsAt: "desc" },
  });

  if (!event) {
    await interaction.reply({
      content: `❌ No event found for **${eventLabel(type)} - ${teamLabel(team)}**.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

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

  const reg = await db.registration.findUnique({
    where: { eventId_playerId: { eventId: event.id, playerId: player.id } },
  });

  if (!reg) {
    await interaction.reply({
      content: `❌ **${player.gameName}** (${user}) was not registered for this event.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await db.registration.update({
    where: { id: reg.id },
    data: { attendance: status },
  });

  if (status === AttendanceStatus.NO_SHOW) {
    await db.player.update({
      where: { id: player.id },
      data: {
        tag: PlayerTag.RED,
        noShowCount: { increment: 1 },
      },
    });
    await interaction.reply({
      content: `🔴 Marked **${player.gameName}** (${user}) as **NO-SHOW**. Their priority tag is now **Red** (No-Show penalty).`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const nextTag =
    player.tag === PlayerTag.BLUE || player.tag === PlayerTag.RED
      ? PlayerTag.WHITE
      : undefined;

  await db.player.update({
    where: { id: player.id },
    data: {
      attendanceCount: { increment: 1 },
      tag: nextTag,
    },
  });

  await interaction.reply({
    content: `✅ Marked **${player.gameName}** (${user}) as **ATTENDED**. Tag: **${playerTagIcon(nextTag ?? player.tag)} ${playerTagLabel(nextTag ?? player.tag)}**.`,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleAttendanceFinalize(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const type = interaction.options.getString("event", true) as EventType;
  const team = interaction.options.getString("team", true) as Team;

  const event = await db.event.findFirst({
    where: { guildId, type, team },
    orderBy: { startsAt: "desc" },
    include: {
      registrations: {
        include: { player: true },
      },
    },
  });

  if (!event || event.registrations.length === 0) {
    await interaction.reply({
      content: `❌ No registrations found to finalize for **${eventLabel(type)} - ${teamLabel(team)}**.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const noShowIds = event.registrations
    .filter((r) => r.attendance === AttendanceStatus.NO_SHOW)
    .map((r) => r.playerId);

  const summary = await finalizeAttendance(event.id, noShowIds);

  const updatedRegs = await db.registration.findMany({
    where: { eventId: event.id },
    include: { player: true },
  });

  const channelId = event.channelId ?? interaction.channelId;
  const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
  if (channel && channel.isSendable()) {
    const broadcastEmbed = buildAttendanceBroadcastEmbed(event, updatedRegs);
    await channel.send({ embeds: [broadcastEmbed] }).catch(console.error);
  }

  notifyAttendanceFinalized(interaction.client, event, updatedRegs).catch(console.error);

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(`🏁 Attendance Finalized: ${eventLabel(type)} — ${teamLabel(team)}`)
    .setDescription(
      [
        `Attendance records and player priority tags have been updated for future event selection.`,
        "",
        `### 📊 Summary`,
        `• ✅ **Attended:** ${summary.attendedCount} players (tags updated to White/kept Core)`,
        `• 🔴 **No-Shows:** ${summary.noShowCount} players (penalized with Red tag)`,
        `• 🔵 **Benched / Reserves:** ${summary.benchedCount} players (awarded Blue priority tag for next event!)`,
        "",
        `📢 *Public recap broadcast to <#${channelId}> and individual DMs dispatched to players.*`,
      ].join("\n"),
    )
    .setFooter({ text: "Player priority tags updated in database" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
