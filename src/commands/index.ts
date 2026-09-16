import { adminCommand } from "./admin/admin.js";
import { helpCommand } from "./general/help.js";
import { profileCommand } from "./player/profile.js";
import { stormCommand } from "./storm/events.js";
import { Command } from "./types.js";

export * from "./types.js";

export const commands: Command[] = [
  profileCommand,
  stormCommand,
  adminCommand,
  helpCommand,
];

export const commandMap = new Map<string, Command>(
  commands.map((cmd) => [cmd.name, cmd]),
);
