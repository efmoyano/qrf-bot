import {
  type ChatInputCommandInteraction,
  type GuildMember,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import { env } from "./config.js";

const ADMIN_ROLES = new Set(["Alliance Admin", "Event Admin", "Storm Admin"]);

export function isAdmin(interaction: ChatInputCommandInteraction): boolean {
  const member = interaction.member as GuildMember | null;
  if (!member) return false;

  return (
    member.permissions.has(PermissionFlagsBits.ManageGuild) ||
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.roles.cache.some(
      (role) => role.name === env.adminRole || ADMIN_ROLES.has(role.name),
    )
  );
}

export async function requireAdmin(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  if (isAdmin(interaction)) return true;
  await interaction.reply({
    content: "❌ You need an admin role (Alliance Admin / Event Admin) or Manage Server permission.",
    flags: MessageFlags.Ephemeral,
  });
  return false;
}
