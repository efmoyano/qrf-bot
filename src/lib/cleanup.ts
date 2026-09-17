import { TextBasedChannel } from "discord.js";

export interface CleanBotMessagesOptions {
  channel: TextBasedChannel | any;
  clientUserId: string;
  limit?: number;
  keepLatestRecap?: boolean;
}

async function fallbackDelete(botMessages: Array<any>): Promise<number> {
  const results = await Promise.allSettled(
    botMessages.map((m) => m.delete().catch(() => null)),
  );
  return results.filter((r) => r.status === "fulfilled").length;
}

function filterTargetBotMessages(
  botMessages: Array<any>,
  keepLatestRecap: boolean,
): Array<any> {
  if (!keepLatestRecap || botMessages.length <= 1) {
    return botMessages;
  }
  const sorted = [...botMessages].sort(
    (a, b) => b.createdTimestamp - a.createdTimestamp,
  );
  return sorted.slice(1);
}

export async function cleanBotMessages(
  options: CleanBotMessagesOptions,
): Promise<number> {
  const { channel, clientUserId, limit = 50, keepLatestRecap = false } = options;
  if (!channel || !channel.isTextBased()) return 0;

  const messages = await channel.messages.fetch({ limit: Math.min(limit, 100) });
  const rawBotMessages = Array.from(
    messages.filter((m: any) => m.author.id === clientUserId).values(),
  );

  const targets = filterTargetBotMessages(rawBotMessages, keepLatestRecap);
  if (targets.length === 0) return 0;

  try {
    const deleted = await channel.bulkDelete(targets, true);
    return deleted.size;
  } catch {
    return fallbackDelete(targets);
  }
}
