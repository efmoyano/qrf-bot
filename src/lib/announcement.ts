import { Client } from "discord.js";
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
}

export async function postBattlefieldAnnouncement(
  options: PostAnnouncementOptions,
): Promise<{ success: boolean; message: string }> {
  const { client, guildId, type, channelId, targetSaturday, closeInMinutes } = options;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isSendable()) {
    return {
      success: false,
      message: `Channel <#${channelId}> not found or cannot send messages.`,
    };
  }

  const saturday = targetSaturday ?? getCurrentCycleAnnouncement(new Date());
  const registrationClosesAt =
    closeInMinutes && closeInMinutes > 0
      ? new Date(Date.now() + closeInMinutes * 60 * 1000)
      : undefined;

  const { schedule, eventA, eventB } = await createBattlefieldCycle({
    guildId,
    type,
    announcedSaturday: saturday,
    channelId,
    registrationClosesAt,
  });

  const embed = buildAnnouncementEmbed(type, schedule);
  const actionRow = buildAnnouncementActionRow(type);
  const sent = await channel.send({ embeds: [embed], components: [actionRow] });

  await db.event.updateMany({
    where: { id: { in: [eventA.id, eventB.id] } },
    data: { messageId: sent.id },
  });

  return {
    success: true,
    message: `Announced **${eventLabel(type)}** in <#${channelId}> for upcoming match cycle.`,
  };
}
