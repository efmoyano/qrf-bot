import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";
import { env } from "./lib/config.js";

const payload = commands.map((cmd) => cmd.data.toJSON());

const rest = new REST({ version: "10" }).setToken(env.token);

await rest.put(Routes.applicationCommands(env.clientId), {
  body: payload,
});

console.log(`Global commands registered (${payload.length} commands).`);