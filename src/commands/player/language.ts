import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { db } from "../../lib/db.js";
import {
  getLanguageMeta,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from "../../lib/i18n.js";
import { Command } from "../types.js";

const CONFIRMATION_MESSAGES: Record<SupportedLanguage, string> = {
  en: "✅ Language updated to **English**! Your future match notifications and tactical assignments will be sent in English.",
  es: "✅ ¡Idioma actualizado a **Español**! Tus futuras notificaciones de partidas y asignaciones tácticas se enviarán en español.",
  pt: "✅ Idioma atualizado para **Português**! Suas futuras notificações de partida e objetivos táticos serão enviados em português.",
  fr: "✅ Langue mise à jour en **Français** ! Vos prochaines notifications de match et assignations tactiques seront envoyées en français.",
  de: "✅ Sprache auf **Deutsch** aktualisiert! Deine zukünftigen Spielbenachrichtigungen und taktischen Aufgaben werden auf Deutsch gesendet.",
  ru: "✅ Язык изменен на **Русский**! Ваши уведомления о матчах и боевые задачи будут отправляться на русском языке.",
  ko: "✅ 언어가 **한국어**로 설정되었습니다! 향후 경기 알림 및 전술 작전 임무는 한국어로 전송됩니다.",
  ja: "✅ 言語を**日本語**に設定しました！今後のマッチ通知および戦術目標は日本語で送信されます。",
};

export const languageCommand: Command = {
  name: "language",
  category: "Player",
  description: "Set your preferred language for match notifications and tactical DMs",
  data: new SlashCommandBuilder()
    .setName("language")
    .setDescription("Set your preferred language for match notifications and tactical DMs")
    .setDescriptionLocalizations({
      "es-ES": "Configura tu idioma preferido para notificaciones y asignaciones",
      "es-419": "Configura tu idioma preferido para notificaciones y asignaciones",
      "pt-BR": "Defina seu idioma preferido para notificações e DMs táticas",
      fr: "Définir votre langue préférée pour les notifications et les MP tactiques",
      de: "Wähle deine bevorzugte Sprache für Benachrichtigungen und Einsatzzuweisungen",
      ru: "Установите предпочитаемый язык для уведомлений и боевых задач",
      ko: "경기 알림 및 전술 작전 수신 언어를 설정합니다",
      ja: "マッチ通知および戦術目標用の優先言語を設定します",
    })
    .addStringOption((option) =>
      option
        .setName("language")
        .setDescription("Choose your preferred language")
        .setDescriptionLocalizations({
          "es-ES": "Elige tu idioma preferido",
          "es-419": "Elige tu idioma preferido",
          "pt-BR": "Escolha seu idioma preferido",
          fr: "Choisissez votre langue préférée",
          de: "Wähle deine bevorzugte Sprache",
          ru: "Выберите предпочитаемый язык",
          ko: "원하는 언어를 선택하세요",
          ja: "希望の言語を選択してください",
        })
        .setRequired(true)
        .addChoices(
          SUPPORTED_LANGUAGES.map((l) => ({
            name: `${l.flag} ${l.nativeName} (${l.code})`,
            value: l.code,
          })),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        content: "❌ This command can only be used inside a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const discordId = interaction.user.id;
    const selectedLang = interaction.options.getString("language", true) as SupportedLanguage;

    const player = await db.player.findUnique({
      where: { guildId_discordId: { guildId, discordId } },
    });

    if (!player) {
      await interaction.reply({
        content:
          "❌ You do not have a registered profile yet. Please use `/profile register` to set up your profile first!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await db.player.update({
      where: { guildId_discordId: { guildId, discordId } },
      data: { language: selectedLang },
    });

    const meta = getLanguageMeta(selectedLang);
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle(`${meta.flag} Language Preference Updated`)
      .setDescription(CONFIRMATION_MESSAGES[selectedLang] || CONFIRMATION_MESSAGES.en)
      .setFooter({ text: "Last War • Multi-Language Support" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
