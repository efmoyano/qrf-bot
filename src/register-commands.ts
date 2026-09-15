import "dotenv/config";
import { REST, Routes } from "discord.js";
import { env } from "./lib/config.js";
import { profileCommand } from "./commands/profile.js";
import { eventsCommand } from "./commands/events.js";
import { adminCommand } from "./commands/admin.js";

const rest=new REST({version:"10"}).setToken(env.token);
await rest.put(Routes.applicationCommands(env.clientId), {
  body:[profileCommand.toJSON(),eventsCommand.toJSON(),adminCommand.toJSON()]
});
console.log("Global commands registered.");
