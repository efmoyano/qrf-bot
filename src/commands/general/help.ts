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
          "`/profile register` — Create your profile with in-game name, main squad, and power",
          "`/profile update` — Update your in-game name, main squad, or power",
          "`/profile me` — View your profile card, priority tag, and battle stats",
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
      fields.push(
        {
          name: "📢 Event Setup & Broadcast (`/admin event`)",
          value: [
            "`/admin event config` — Set automated announcement cron and channel",
            "`/admin event announce` — Immediately post announcement embed with 1-click buttons",
            "`/admin event upcoming` — List upcoming scheduled battlefield events",
            "`/admin event create` — Manually create an event with custom start/close times",
          ].join("\n"),
        },
        {
          name: "🛡️ Lineup Selection (`/admin lineup`)",
          value: [
            "`/admin lineup wizard` — Interactive UI with checkboxes to select Main starters & Subs in 1 click",
            "`/admin lineup auto` — Auto-select 20 Main & 10 Subs by priority tags & power",
            "`/admin lineup view` — Inspect the current Main, Substitute, and Standby rosters",
            "`/admin lineup set` — Manually assign/move a player (Main, Substitute, Standby)",
            "`/admin lineup publish` — Broadcast official lineup embed to the event channel",
          ].join("\n"),
        },
        {
          name: "📊 Attendance & Priority (`/admin attendance`)",
          value: [
            "`/admin attendance wizard` — Interactive UI with checkboxes to easily flag No-Shows & finalize match",
            "`/admin attendance mark` — Record a player as Attended or No-Show (penalizes with Red tag)",
            "`/admin attendance finalize` — Finalize match: awards Blue priority tags to benched players",
          ].join("\n"),
        },
        {
          name: "👥 Member Roster & Tags (`/admin member`)",
          value: [
            "`/admin member list` — List all active alliance members ranked by power",
            "`/admin member view` — View a member's profile, priority tag, and attendance stats",
            "`/admin member tag` — Assign priority tier tag (⭐ Star, 🔵 Blue, ⚪ White, 🔴 Red)",
            "`/admin member update` — Update a member's in-game name, squad, or power",
            "`/admin member delete` — Deactivate a member from the active roster",
            "`/admin member restore` — Restore a deactivated member",
            "`/admin member count` — Show alliance roster statistics and squad breakdown",
          ].join("\n"),
        },
        {
          name: "🔐 Admin Roles & Permissions (`/admin role`)",
          value: [
            "`/admin role add` — Grant Alliance Admin or Event Admin role to a user",
            "`/admin role remove` — Remove an administration role from a user",
            "`/admin role list` — View all users holding administrative roles",
          ].join("\n"),
        },
      );
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📖 Last War Bot — Commands Guide")
      .setDescription(
        [
          "*Made with ❤️ by QRF alliance*",
          "",
          "Here are all available commands you have permission to use.",
          "",
          "> 💡 **Tip:** When entering power, you can write `80m`, `90mill`, `95.5`, or `82.4M`.",
        ].join("\n"),
      )
      .addFields(fields)
      .setFooter({
        text: isUserAdmin
          ? "Viewing all commands (Admin Access) • Made with ❤️ by QRF alliance"
          : "Viewing member commands • Made with ❤️ by QRF alliance",
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
