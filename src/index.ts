import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  GatewayIntentBits,
  Events,
  MessageFlags,
  StringSelectMenuInteraction,
} from "discord.js";
import { env } from "./lib/config.js";
import { commandMap } from "./commands/index.js";
import { initAllSchedulers } from "./lib/scheduler.js";
import { handleButtonInteraction } from "./interactions/button-handler.js";
import {
  handleLineupWizardButton,
  handleLineupWizardSelect,
} from "./interactions/lineup-wizard.js";
import {
  handleAttendanceWizardButton,
  handleAttendanceWizardSelect,
} from "./interactions/attendance-wizard.js";
import {
  handleStrategyWizardButton,
  handleStrategyWizardSelect,
} from "./interactions/strategy-wizard.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);
  await initAllSchedulers(client);
});

type AppInteraction =
  | ButtonInteraction
  | ChatInputCommandInteraction
  | StringSelectMenuInteraction;

async function replyError(i: AppInteraction): Promise<void> {
  try {
    if (i.replied || i.deferred) {
      await i.followUp({ content: "Unexpected error.", flags: MessageFlags.Ephemeral }).catch(() => undefined);
      return;
    }
    await i.reply({ content: "Unexpected error.", flags: MessageFlags.Ephemeral }).catch(() => undefined);
  } catch {
    // Ignore expired or already handled interactions
  }
}

async function onButton(i: ButtonInteraction): Promise<void> {
  try {
    if (i.customId.startsWith("lineup_wiz:")) {
      await handleLineupWizardButton(i);
      return;
    }
    if (i.customId.startsWith("att_wiz:")) {
      await handleAttendanceWizardButton(i);
      return;
    }
    if (i.customId.startsWith("strat_wiz:")) {
      await handleStrategyWizardButton(i);
      return;
    }
    await handleButtonInteraction(i);
  } catch (err) {
    console.error(err);
    await replyError(i);
  }
}

async function onSelectMenu(i: StringSelectMenuInteraction): Promise<void> {
  try {
    if (i.customId.startsWith("lineup_wiz:")) {
      await handleLineupWizardSelect(i);
      return;
    }
    if (i.customId.startsWith("att_wiz:")) {
      await handleAttendanceWizardSelect(i);
      return;
    }
    if (i.customId.startsWith("strat_wiz:")) {
      await handleStrategyWizardSelect(i);
      return;
    }
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
  if (i.isStringSelectMenu()) return onSelectMenu(i);
  if (i.isChatInputCommand()) return onCommand(i);
});

client.login(env.token);
