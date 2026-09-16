import "dotenv/config";
import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  GatewayIntentBits,
  Events,
  MessageFlags,
} from "discord.js";
import { env } from "./lib/config.js";
import { commandMap } from "./commands/index.js";
import { initAllSchedulers } from "./lib/scheduler.js";
import { handleButtonInteraction } from "./interactions/button-handler.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);
  await initAllSchedulers(client);
});

type AppInteraction = ButtonInteraction | ChatInputCommandInteraction;

async function replyError(i: AppInteraction): Promise<void> {
  if (i.replied || i.deferred) {
    await i.followUp({ content: "Unexpected error.", flags: MessageFlags.Ephemeral });
    return;
  }
  await i.reply({ content: "Unexpected error.", flags: MessageFlags.Ephemeral });
}

async function onButton(i: ButtonInteraction): Promise<void> {
  try {
    await handleButtonInteraction(i);
  } catch (err) {
    console.error(err);
    await replyError(i);
  }
}

async function onCommand(i: ChatInputCommandInteraction): Promise<void> {
  const command = commandMap.get(i.commandName);
  if (!command) return;

  try {
    await command.execute(i);
  } catch (err) {
    console.error(err);
    await replyError(i);
  }
}

client.on(Events.InteractionCreate, async (i) => {
  if (!i.guildId) return;
  if (i.isButton()) return onButton(i);
  if (i.isChatInputCommand()) return onCommand(i);
});

client.login(env.token);
