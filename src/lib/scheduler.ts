import cron, { type ScheduledTask } from "node-cron";
import { Client } from "discord.js";
import { EventType } from "@prisma/client";
import { db } from "./db.js";
import { env } from "./config.js";
import {
  postBattlefieldAnnouncement,
  scheduleRegistrationCloseTimer,
} from "./announcement.js";

export interface EventSchedulerConfig {
  guildId: string;
  eventType: EventType;
  announcementCron: string;
  channelId: string | null;
  enabled?: boolean;
}

const activeSchedulers = new Map<string, ScheduledTask>();

function getSchedulerKey(guildId: string, type: EventType): string {
  return `${guildId}:${type}`;
}

export function registerOrUpdateScheduler(
  client: Client,
  cfg: EventSchedulerConfig,
): boolean {
  const key = getSchedulerKey(cfg.guildId, cfg.eventType);

  const existing = activeSchedulers.get(key);
  if (existing) {
    existing.stop();
    activeSchedulers.delete(key);
  }

  if (cfg.enabled === false || !cfg.channelId) {
    return false;
  }

  if (!cron.validate(cfg.announcementCron)) {
    console.warn(`[Scheduler] Invalid cron for ${cfg.eventType}: "${cfg.announcementCron}"`);
    return false;
  }

  const task = cron.schedule(
    cfg.announcementCron,
    async () => {
      console.log(`[Scheduler] Cron triggered for ${cfg.eventType} (${cfg.announcementCron})`);
      try {
        const res = await postBattlefieldAnnouncement({
          client,
          guildId: cfg.guildId,
          type: cfg.eventType,
          channelId: cfg.channelId!,
        });
        console.log(`[Scheduler] ${res.message}`);
      } catch (err) {
        console.error(`[Scheduler] Failed announcement for ${cfg.eventType}:`, err);
      }
    },
    { timezone: env.timezone },
  );

  activeSchedulers.set(key, task);
  console.log(
    `[Scheduler] Scheduled ${cfg.eventType} with cron '${cfg.announcementCron}' (Timezone: ${env.timezone})`,
  );
  return true;
}

export async function recoverPendingRegistrationCloses(client: Client): Promise<void> {
  const pendingEvents = await db.event.findMany({
    where: {
      registrationClosesAt: { gt: new Date() },
      messageId: { not: null },
      channelId: { not: null },
    },
  });

  for (const e of pendingEvents) {
    scheduleRegistrationCloseTimer({
      client,
      channelId: e.channelId!,
      messageId: e.messageId!,
      type: e.type,
      closesAt: e.registrationClosesAt,
    });
  }
}

export async function initAllSchedulers(client: Client): Promise<void> {
  const configs = await db.eventConfig.findMany({ where: { enabled: true } });
  for (const cfg of configs) {
    registerOrUpdateScheduler(client, cfg);
  }
  await recoverPendingRegistrationCloses(client);
}

