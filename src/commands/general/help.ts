import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../types.js";

export const helpCommand: Command = {
  name: "help",
  category: "General",
  description: "Show available commands organized by category",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show available commands organized by category"),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📖 Last War Bot — Commands Guide")
      .setDescription(
        "Here are all available commands categorized for easy access.\n\n" +
          "> 💡 **Tip:** When entering power, you can write `80m`, `90mill`, `95.5`, or `82.4M`.",
      )
      .addFields(
        {
          name: "👤 Player Profile (`/profile`)",
          value: [
            "`/profile register` — Create your profile with name, squad, and power",
            "`/profile update` — Update your in-game name, main squad, or power",
            "`/profile me` — View your player profile card",
          ].join("\n"),
        },
        {
          name: "🌩️ Storm Events (`/storm`)",
          value: [
            "`/storm register` — Sign up for Desert or Canyon Storm (Morning/Night)",
            "`/storm unregister` — Remove your registration from an upcoming event",
            "`/storm list` — View all registered players ranked by squad power",
          ].join("\n"),
        },
        {
          name: "🔐 Alliance Administration (`/admin`)",
          value: [
            "`/admin storm` — Configure auto-announcements, list upcoming, or create events",
            "`/admin member` — List active roster, inspect profiles, update or deactivate members",
            "`/admin role` — Grant or remove Alliance Admin and Event Admin roles",
          ].join("\n"),
        },
      )
      .setFooter({ text: "Last War • Command Center" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
