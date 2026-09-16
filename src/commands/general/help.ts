import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { isAdmin } from "../../lib/permissions.js";
import { Command } from "../types.js";

export const helpCommand: Command = {
  name: "help",
  category: "General",
  description: "Show available commands organized by category",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show available commands organized by category"),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const isUserAdmin = isAdmin(interaction);

    const fields = [
      {
        name: "👤 Player Profile (`/profile`)",
        value: [
          "`/profile register` — Create your profile with name, squad, and power",
          "`/profile update` — Update your in-game name, main squad, or power",
          "`/profile me` — View your player profile card",
        ].join("\n"),
      },
      {
        name: "⚔️ Battlefield Events (`/event`)",
        value: [
          "`/event register` — Sign up for Desert Storm or Canyon Storm (Team A / Team B)",
          "`/event unregister` — Remove your registration from an upcoming event",
          "`/event list` — View all registered players ranked by squad power",
        ].join("\n"),
      },
    ];

    if (isUserAdmin) {
      fields.push({
        name: "🔐 Alliance Administration (`/admin`)",
        value: [
          "`/admin event` — Configure auto-announcements, list upcoming, or create events",
          "`/admin member` — List active roster, inspect profiles, update or deactivate members",
          "`/admin role` — Grant or remove Alliance Admin and Event Admin roles",
        ].join("\n"),
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📖 Last War Bot — Commands Guide")
      .setDescription(
        "Here are all available commands you have permission to use.\n\n" +
          "> 💡 **Tip:** When entering power, you can write `80m`, `90mill`, `95.5`, or `82.4M`.",
      )
      .addFields(fields)
      .setFooter({
        text: isUserAdmin
          ? "Viewing all commands (Admin Access) • Last War"
          : "Viewing member commands • Last War",
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
