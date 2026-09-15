import "dotenv/config";
import cron from "node-cron";
import { Client, GatewayIntentBits, Events } from "discord.js";
import { db } from "./lib/db.js";
import { env } from "./lib/config.js";
import { handleProfile } from './commands/profile.js';
import { handleStorm } from "./commands/events.js";
import { handleAdmin } from "./commands/admin.js";
import {

  handleAllianceAdmin,
} from "./commands/alliance-admin.js";
import { EventType, Team } from "@prisma/client";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, c => {
  console.log(`Logged in as ${c.user.tag}`);
  startSchedulers();
});

client.on(Events.InteractionCreate, async i => {
  if (!i.isChatInputCommand() || !i.guildId) return;
  try {
    if (i.commandName === "profile") return handleProfile(i);
    if (i.commandName === "storm") return handleStorm(i);
    if (i.commandName === "storm-admin") return handleAdmin(i);
    if (i.commandName === "alliance-admin") return handleAllianceAdmin(i);

  } catch (err) {
    console.error(err);
    if (i.replied || i.deferred) await i.followUp({ content: "Unexpected error.", ephemeral: true });
    else await i.reply({ content: "Unexpected error.", ephemeral: true });
  }
});

async function startSchedulers() {
  const configs = await db.eventConfig.findMany({ where: { enabled: true } });
  for (const cfg of configs) {
    schedulePosting(cfg.guildId, cfg.eventType, cfg.morningCron, Team.MORNING, cfg.channelId);
    schedulePosting(cfg.guildId, cfg.eventType, cfg.nightCron, Team.NIGHT, cfg.channelId);
  }
}

function schedulePosting(guildId: string, type: EventType, expression: string, team: Team, channelId: string | null) {
  if (!channelId || !cron.validate(expression)) {
    console.warn(`Invalid scheduler config for ${type}/${team}`);
    return;
  }
  cron.schedule(expression, async () => {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;
    const nextStart = new Date(Date.now() + 60 * 60 * 1000);
    const close = new Date(nextStart.getTime() - 30 * 60 * 1000);
    const event = await db.event.create({ data: { guildId, type, team, startsAt: nextStart, registrationClosesAt: close, channelId } });
    await channel.send(`🌩️ **${type === EventType.DESERT_STORM ? "Desert Storm Battlefield" : "Canyon Storm Battlefield"}**\\n**${team === Team.MORNING ? "Morning" : "Night"} Team registration is OPEN!**\\n\\nUse \`/storm register event:${type} team:${team}\`\\nEvent time: <t:${Math.floor(nextStart.getTime() / 1000)}:F>\\nRegistration closes: <t:${Math.floor(close.getTime() / 1000)}:R>\\n\\nPlease make sure your profile is up to date with \`/profile update\`.`);
    console.log(`Posted registration for ${event.id}`);
  }, { timezone: env.timezone });
}

client.login(env.token);
