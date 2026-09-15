import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { env } from "./config.js";

export function isAdmin(interaction: ChatInputCommandInteraction): boolean {
  const member = interaction.member as GuildMember | null;
  if (!member) return false;
  return member.permissions.has("ManageGuild") ||
    member.roles.cache.some(role => role.name === env.adminRole);
}

export async function requireAdmin(interaction: ChatInputCommandInteraction): Promise<boolean> {
  if (isAdmin(interaction)) return true;
  await interaction.reply({ content: "You need the alliance admin role or Manage Server permission.", ephemeral: true });
  return false;
}
