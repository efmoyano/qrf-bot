import {
  type ChatInputCommandInteraction,
  type GuildMember,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import { env } from "./config.js";

const ADMIN_ROLES = new Set(["Alliance Admin", "Event Admin", "Storm Admin"]);

export function hasAdminRole(
  interaction: ChatInputCommandInteraction,
): boolean {
  const member = interaction.member as GuildMember | null;
  if (!member) return false;

  return member.roles.cache.some(
    (role) => role.name === env.adminRole || ADMIN_ROLES.has(role.name),
  );
}

export function canManageBotRoles(
  interaction: ChatInputCommandInteraction,
): boolean {
  const member = interaction.member as GuildMember | null;
  if (!member) return false;

  return (
    hasAdminRole(interaction) ||
    member.guild.ownerId === member.id ||
    member.permissions.has(PermissionFlagsBits.Administrator)
  );
}

export function isAdmin(interaction: ChatInputCommandInteraction): boolean {
  return hasAdminRole(interaction);
}

export async function requireAdmin(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  if (isAdmin(interaction)) return true;
  await interaction.reply({
    content:
      "❌ You need the **Alliance Admin** or **Event Admin** role to use this command.",
    flags: MessageFlags.Ephemeral,
  });
  return false;
}

export async function requireRoleManager(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  if (canManageBotRoles(interaction)) return true;
  await interaction.reply({
    content:
      "❌ You need an admin role or Server Owner / Administrator permissions to manage roles.",
    flags: MessageFlags.Ephemeral,
  });
  return false;
}
