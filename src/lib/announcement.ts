import { ActionRowBuilder, ButtonBuilder, Client, EmbedBuilder } from "discord.js";
import { computeNextEventDate } from "./events.js";
import { EventType } from "@prisma/client";
import {
  buildAnnouncementActionRow,
  buildAnnouncementEmbed,
  createBattlefieldCycle,
  getCurrentCycleAnnouncement,
  eventLabel,
} from "./events.js";
import { db } from "./db.js";

export interface PostAnnouncementOptions {
  client: Client;
  guildId: string;
  type: EventType;
  channelId: string;
  targetSaturday?: Date;
  closeInMinutes?: number;
  closeInHours?: number;
}

function computeRegistrationClose(
  saturday: Date,
  effectiveCloseHours: number,
  closeInMinutes?: number,
): Date {
  if (closeInMinutes && closeInMinutes > 0) {
    return new Date(Date.now() + closeInMinutes * 60 * 1000);
  }
  return new Date(saturday.getTime() + effectiveCloseHours * 60 * 60 * 1000);
}

export interface CloseNoticeOptions {
  client: Client;
  channelId: string;
  messageId: string;
  type: EventType;
}

export interface ScheduleCloseTimerOptions extends CloseNoticeOptions {
  closesAt: Date;
}

async function handleRegistrationClose(options: CloseNoticeOptions): Promise<void> {
  const { client, channelId, messageId, type } = options;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isSendable()) return;

  try {
    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (message && message.components.length > 0) {
      const disabledRows = message.components.map((row: any) =>
        ActionRowBuilder.from(row).setComponents(
          row.components.map((c: any) => ButtonBuilder.from(c).setDisabled(true)),
        ),
      );
      await message.edit({ components: disabledRows as any });
    }
  } catch (err) {
    console.error("[RegistrationClose] Failed to update announcement message:", err);
  }

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle(`🔒 Registration Closed — ${eventLabel(type)}`)
    .setDescription(
      [
        `Registrations for this match cycle are now **officially closed**!`,
        "",
        `📋 **What's Next?**`,
        `• Team captains and event admins are organizing match lineups.`,
        `• You will receive a direct notification once final **Main Squad** and **Substitutes** rosters are published!`,
      ].join("\n"),
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(console.error);
}

export function scheduleRegistrationCloseTimer(options: ScheduleCloseTimerOptions): void {
  const { client, channelId, messageId, type, closesAt } = options;
  const delay = closesAt.getTime() - Date.now();

  if (delay <= 0) {
    handleRegistrationClose({ client, channelId, messageId, type }).catch(console.error);
    return;
  }

  setTimeout(() => {
    handleRegistrationClose({ client, channelId, messageId, type }).catch(console.error);
  }, delay);
}

interface SendAnnouncementParams {
  client: Client;
  channel: any;
  embed: any;
  actionRow: any;
  eventIds: string[];
  channelId: string;
  type: EventType;
  closesAt: Date;
}

async function sendAnnouncementMessage(
  params: SendAnnouncementParams,
): Promise<{ success: boolean; message: string }> {
  const { client, channel, embed, actionRow, eventIds, channelId, type, closesAt } = params;
  try {
    const sent = await channel.send({ embeds: [embed], components: [actionRow] });

    await db.event.updateMany({
      where: { id: { in: eventIds } },
      data: { messageId: sent.id },
    });

    scheduleRegistrationCloseTimer({
      client,
      channelId,
      messageId: sent.id,
      type,
      closesAt,
    });

    return {
      success: true,
      message: `Announced **${eventLabel(type)}** in <#${channelId}> for upcoming match cycle.`,
    };
  } catch (error: any) {
    console.error("[Announcement] Failed to post to channel:", error);
    return {
      success: false,
      message: `❌ Failed to send announcement to <#${channelId}>: ${error?.message || "Missing Permissions"}. Please ensure the bot has **Send Messages** and **Embed Links** permissions in that channel.`,
    };
  }
}


export async function postBattlefieldAnnouncement(
  options: PostAnnouncementOptions,
): Promise<{ success: boolean; message: string }> {
  const {
    client,
    guildId,
    type,
    channelId,
    targetSaturday,
    closeInMinutes,
    closeInHours,
  } = options;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isSendable()) {
    return {
      success: false,
      message: `Channel <#${channelId}> not found or cannot send messages.`,
    };
  }

  const cfg = await db.eventConfig.findUnique({
    where: { guildId_eventType: { guildId, eventType: type } },
  });

  // Determine the next announcement date based on custom schedule if present
  const nextSaturday = targetSaturday ?? (cfg ? computeNextEventDate(cfg) : getCurrentCycleAnnouncement(new Date()));

  const effectiveCloseHours = closeInHours ?? cfg?.registrationCloseHours ?? 48;
  const registrationClosesAt = computeRegistrationClose(
    nextSaturday,
    effectiveCloseHours,
    closeInMinutes,
  );

  const { schedule, eventA, eventB } = await createBattlefieldCycle({
    guildId,
    type,
    announcedSaturday: nextSaturday,
    channelId,
    registrationClosesAt,
    registrationCloseHours: effectiveCloseHours,
  });

  const embed = buildAnnouncementEmbed(type, schedule);
  const actionRow = buildAnnouncementActionRow(type);

  return sendAnnouncementMessage({
    client,
    channel,
    embed,
    actionRow,
    eventIds: [eventA.id, eventB.id],
    channelId,
    type,
    closesAt: schedule.registrationClosesAt,
  });
}

