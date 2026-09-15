import "dotenv/config";

import { REST, Routes } from "discord.js";

import { env } from "./lib/config.js";

import { profileCommand } from "./commands/profile.js";
import { eventsCommand } from "./commands/events.js";
import { adminCommand } from "./commands/admin.js";
import { allianceAdminCommand } from "./commands/alliance-admin.js";

const commands = [
  profileCommand,
  eventsCommand,
  adminCommand,
  allianceAdminCommand,
].map((command) => {
  // Commands wrapped as { data, execute }
  if ("data" in command) {
    return command.data.toJSON();
  }

  // Commands that are directly SlashCommandBuilder
  return command.toJSON();
});

const rest = new REST({ version: "10" }).setToken(env.token);

await rest.put(
  Routes.applicationCommands(env.clientId),
  {
    body: commands,
  },
);

console.log("Global commands registered.");