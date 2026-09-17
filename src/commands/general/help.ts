import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { buildLocalizedHelpEmbed, getUserLanguage } from "../../lib/i18n-commands.js";
import { isAdmin } from "../../lib/permissions.js";
import { Command } from "../types.js";

export const helpCommand: Command = {
  name: "help",
  category: "General",
  description: "Show available commands organized by category",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show available commands organized by category")
    .setDescriptionLocalizations({
      "es-ES": "Muestra los comandos disponibles organizados por categoría",
      "es-419": "Muestra los comandos disponibles organizados por categoría",
      "pt-BR": "Mostra os comandos disponíveis organizados por categoria",
      fr: "Affiche les commandes disponibles organisées par catégorie",
      de: "Zeigt verfügbare Befehle nach Kategorien an",
      ru: "Показать доступные команды по категориям",
      ko: "카테고리별 사용 가능한 명령어 목록을 표시합니다",
      ja: "利用可能なコマンドをカテゴリ別に表示します",
    }),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const isUserAdmin = isAdmin(interaction);
    const lang = await getUserLanguage(
      interaction.guildId,
      interaction.user.id,
      interaction.locale,
    );

    const embed = buildLocalizedHelpEmbed(lang, isUserAdmin);
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
