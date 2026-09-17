import { AttendanceStatus, ParticipationRole } from "@prisma/client";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { db } from "../lib/db.js";
import { eventLabel, teamLabel } from "../lib/events.js";
import { formatPower } from "../lib/format.js";
import {
  finalizeAttendance,
  playerTagIcon,
  playerTagLabel,
} from "../lib/lineup.js";
import {
  buildAttendanceBroadcastEmbed,
  notifyAttendanceFinalized,
} from "../lib/notifications.js";
import { cleanBotMessages } from "../lib/cleanup.js";

export interface AttendanceWizardPayload {
  content?: string;
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[];
}

export async function buildAttendanceWizardPayload(
  eventId: string,
): Promise<AttendanceWizardPayload> {
  const event = await db.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return { content: "❌ Event not found.", components: [], embeds: [] };
  }

  const registrations = await db.registration.findMany({
    where: { eventId },
    include: { player: true },
  });

  const selectedPlayers = registrations.filter(
    (r) =>
      r.role === ParticipationRole.MAIN ||
      r.role === ParticipationRole.SUBSTITUTE,
  );
  const unselected = registrations.filter(
    (r) => r.role === ParticipationRole.UNSELECTED,
  );

  const noShows = selectedPlayers.filter(
    (r) => r.attendance === AttendanceStatus.NO_SHOW,
  );
  const attendedCount = selectedPlayers.length - noShows.length;

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(`🏁 Attendance Wizard: ${eventLabel(event.type)} — ${teamLabel(event.team)}`)
    .setDescription(
      [
        "Use the multi-select menu below to **check any players who were NO-SHOW** (did not attend the match).",
        "Unchecked players will be counted as **Attended**.",
        "",
        `📊 **Selected Players:** ${selectedPlayers.length}`,
        `• ✅ **Attended:** ${attendedCount}`,
        `• 🔴 **No-Shows (Checked):** ${noShows.length}`,
        `• 🔵 **Benched / Reserves:** ${unselected.length} (will receive Blue priority tag)`,
        "",
        "Click **Finalize Attendance** when done to save records and update player priority tags!",
      ].join("\n"),
    )
    .setFooter({
      text: "No-Shows will be tagged Red. Benched players will be tagged Blue.",
    })
    .setTimestamp();

  const components: Array<ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>> = [];

  if (selectedPlayers.length > 0) {
    const displayPlayers = selectedPlayers.slice(0, 25);
    const select = new StringSelectMenuBuilder()
      .setCustomId(`att_wiz:select:${eventId}`)
      .setPlaceholder("Check players who were NO-SHOW (Absent)")
      .setMinValues(0)
      .setMaxValues(displayPlayers.length);

    for (const item of displayPlayers) {
      const option = new StringSelectMenuOptionBuilder()
        .setLabel(item.player.gameName.slice(0, 100))
        .setValue(item.playerId)
        .setDescription(
          `${item.role} • ${playerTagLabel(item.player.tag)} • ${formatPower(item.powerSnapshot)}`.slice(0, 100),
        )
        .setEmoji(item.attendance === AttendanceStatus.NO_SHOW ? "🔴" : playerTagIcon(item.player.tag))
        .setDefault(item.attendance === AttendanceStatus.NO_SHOW);

      select.addOptions(option);
    }

    components.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
    );
  }

  const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`att_wiz:finalize:${eventId}`)
      .setLabel("Finalize Attendance")
      .setEmoji("🏁")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`att_wiz:reset:${eventId}`)
      .setLabel("Reset to All Attended")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary),
  );

  components.push(buttonsRow);

  return { embeds: [embed], components };
}

export async function handleAttendanceWizardSelect(
  interaction: StringSelectMenuInteraction,
): Promise<void> {
  const [, , eventId] = interaction.customId.split(":");
  const noShowPlayerIds = interaction.values;

  const registrations = await db.registration.findMany({
    where: {
      eventId,
      role: { in: [ParticipationRole.MAIN, ParticipationRole.SUBSTITUTE] },
    },
  });

  const updates: Array<Promise<unknown>> = [];

  for (const r of registrations) {
    const isNoShow = noShowPlayerIds.includes(r.playerId);
    const targetStatus = isNoShow
      ? AttendanceStatus.NO_SHOW
      : AttendanceStatus.PENDING;

    if (r.attendance !== targetStatus) {
      updates.push(
        db.registration.update({
          where: { id: r.id },
          data: { attendance: targetStatus },
        }),
      );
    }
  }

  await Promise.all(updates);

  const payload = await buildAttendanceWizardPayload(eventId);
  await interaction.update(payload);
}

async function handleCleanupAction(
  interaction: ButtonInteraction,
  eventId: string,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const event = await db.event.findUnique({ where: { id: eventId } });
  const channelId = event?.channelId ?? interaction.channelId;
  const channel = await interaction.client.channels.fetch(channelId).catch(() => null);

  if (!channel || !channel.isTextBased()) {
    await interaction.editReply({
      content: `❌ Could not find or access channel <#${channelId}>.`,
    });
    return;
  }

  const deletedCount = await cleanBotMessages({
    channel,
    clientUserId: interaction.client.user.id,
    limit: 100,
    keepLatestRecap: true,
  });

  await interaction.editReply({
    content: `🧹 Successfully cleaned **${deletedCount}** past bot message(s) from <#${channelId}>. The match conclusion recap was preserved!`,
  });
}

async function handleFinalizeAction(
  interaction: ButtonInteraction,
  eventId: string,
): Promise<void> {
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) {
    await interaction.reply({
      content: "❌ Event not found.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const noShowRegs = await db.registration.findMany({
    where: { eventId, attendance: AttendanceStatus.NO_SHOW },
    select: { playerId: true },
  });

  const noShowPlayerIds = noShowRegs.map((r) => r.playerId);
  const summary = await finalizeAttendance(eventId, noShowPlayerIds);

  const updatedRegs = await db.registration.findMany({
    where: { eventId },
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
    .setTitle(`🏁 Attendance Finalized: ${eventLabel(event.type)} — ${teamLabel(event.team)}`)
    .setDescription(
      [
        "Attendance records and player priority tags have been updated in the database.",
        "",
        "### 📊 Final Summary",
        `• ✅ **Attended:** ${summary.attendedCount} players (tags kept/reset to White)`,
        `• 🔴 **No-Shows:** ${summary.noShowCount} players (penalized with Red tag)`,
        `• 🔵 **Benched / Reserves:** ${summary.benchedCount} players (awarded Blue priority tag for next event!)`,
        "",
        `📢 *Public recap broadcast to <#${channelId}> and individual DMs dispatched to players.*`,
      ].join("\n"),
    )
    .setFooter({ text: "Last War Battlefield Attendance" })
    .setTimestamp();

  const cleanupRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`att_wiz:cleanup:${eventId}`)
      .setLabel("Clean Channel Messages")
      .setEmoji("🧹")
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [cleanupRow] });
}

export async function handleAttendanceWizardButton(
  interaction: ButtonInteraction,
): Promise<void> {
  const [, action, eventId] = interaction.customId.split(":");

  if (action === "reset") {
    await db.registration.updateMany({
      where: {
        eventId,
        role: { in: [ParticipationRole.MAIN, ParticipationRole.SUBSTITUTE] },
      },
      data: { attendance: AttendanceStatus.PENDING },
    });

    const payload = await buildAttendanceWizardPayload(eventId);
    await interaction.update(payload);
    return;
  }

  if (action === "cleanup") {
    return handleCleanupAction(interaction, eventId);
  }

  if (action === "finalize") {
    return handleFinalizeAction(interaction, eventId);
  }
}
