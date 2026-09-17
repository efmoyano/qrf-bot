import { adminCommand } from "./admin/admin.js";
import { eventCommand } from "./event/events.js";
import { helpCommand } from "./general/help.js";
import { languageCommand } from "./player/language.js";
import { profileCommand } from "./player/profile.js";
import { Command } from "./types.js";

export * from "./types.js";

export const commands: Command[] = [
  profileCommand,
  languageCommand,
  eventCommand,
  adminCommand,
  helpCommand,
];

export const commandMap = new Map<string, Command>(
  commands.map((cmd) => [cmd.name, cmd]),
);
