import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { db } from "../../lib/db.js";
import { formatPower, parsePower } from "../../lib/format.js";
import {
  detectLanguage,
  getLanguageMeta,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from "../../lib/i18n.js";
import { buildLocalizedProfileCard } from "../../lib/i18n-commands.js";
import { Command } from "../types.js";

const SQUAD_ICONS = {
  TANK: "🛡️",
  AIR: "✈️",
  MISSILE: "🚀",
} as const;

const SQUAD_LABELS = {
  TANK: "Tank",
  AIR: "Air",
  MISSILE: "Missile",
} as const;

function getSquadIcon(squadType: string): string {
  return SQUAD_ICONS[squadType as keyof typeof SQUAD_ICONS] ?? "⚔️";
}

function getSquadLabel(squadType: string): string {
  return SQUAD_LABELS[squadType as keyof typeof SQUAD_LABELS] ?? squadType;
}

async function registerProfile(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const discordId = interaction.user.id;

  const existingPlayer = await db.player.findUnique({
    where: { guildId_discordId: { guildId, discordId } },
  });

  if (existingPlayer) {
    const icon = getSquadIcon(existingPlayer.squadType);
    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("⚠️ Already Registered")
      .setDescription(
        [
          `You are already registered as **${existingPlayer.gameName}**.`,
          "",
          `${icon} Squad: **${getSquadLabel(existingPlayer.squadType)}**`,
          `💥 Power: **${formatPower(existingPlayer.power)}**`,
          "",
          "Use `/profile update` if you want to change your profile.",
        ].join("\n"),
      )
      .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
      .setFooter({ text: "Last War • Player Profile" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  const name = interaction.options.getString("name", true).trim();
  const squadType = interaction.options.getString("squad", true);
  const powerInput = interaction.options.getString("power", true);
  const languageInput = interaction.options.getString("language");
  const language = languageInput || detectLanguage(interaction.locale);

  let power: bigint;
  try {
    power = parsePower(powerInput);
  } catch {
    await interaction.reply({
      content:
        "❌ Invalid power. Please enter something like `80m`, `90mill`, `90millones`, or simply `90`.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const player = await db.player.create({
    data: {
      guildId,
      discordId,
      gameName: name,
      squadType: squadType as any,
      power,
      language,
    },
  });

  const icon = getSquadIcon(player.squadType);
  const langMeta = getLanguageMeta(player.language);
  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(`${icon} Profile Registered`)
    .setDescription(
      [
        `Welcome **${player.gameName}**!`,
        "",
        `${icon} Squad: **${getSquadLabel(player.squadType)}**`,
        `💥 Power: **${formatPower(player.power)}**`,
        `🌐 Language: **${langMeta.flag} ${langMeta.nativeName}**`,
        "",
        "Your player profile is ready for event registration.",
      ].join("\n"),
    )
    .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: "Last War • Player Profile" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function updateProfile(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const discordId = interaction.user.id;

  const existingPlayer = await db.player.findUnique({
    where: { guildId_discordId: { guildId, discordId } },
  });

  if (!existingPlayer) {
    await interaction.reply({
      content:
        "❌ You do not have a profile yet. Use `/profile register` first.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const name = interaction.options.getString("name");
  const squadType = interaction.options.getString("squad");
  const powerInput = interaction.options.getString("power");
  const languageInput = interaction.options.getString("language");

  let power: bigint | undefined;
  if (powerInput) {
    try {
      power = parsePower(powerInput);
    } catch {
      await interaction.reply({
        content:
          "❌ Invalid power. Please enter something like `80m`, `90mill`, `90millones`, or simply `90`.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
  }

  const player = await db.player.update({
    where: { guildId_discordId: { guildId, discordId } },
    data: {
      ...(name ? { gameName: name.trim() } : {}),
      ...(squadType ? { squadType: squadType as any } : {}),
      ...(power !== undefined ? { power } : {}),
      ...(languageInput ? { language: languageInput } : {}),
    },
  });

  const icon = getSquadIcon(player.squadType);
  const langMeta = getLanguageMeta(player.language);
  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(`${icon} Profile Updated`)
    .setDescription(
      [
        `👤 **${player.gameName}**`,
        "",
        `${icon} **${getSquadLabel(player.squadType)}** Squad`,
        `💥 **${formatPower(player.power)}** Power`,
        `🌐 **${langMeta.flag} ${langMeta.nativeName}**`,
      ].join("\n"),
    )
    .setThumbnail(interaction.user.displayAvatarURL())
    .setFooter({ text: "Last War • Player Profile" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function showProfile(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const discordId = interaction.user.id;

  const player = await db.player.findUnique({
    where: { guildId_discordId: { guildId, discordId } },
  });

  const lang = (player?.language as SupportedLanguage) || detectLanguage(interaction.locale);

  if (!player) {
    const errorMsg: Record<SupportedLanguage, string> = {
      en: "❌ You do not have a profile yet. Use `/profile register` to create one.",
      es: "❌ Aún no tienes un perfil registrado. Usa `/profile register` para crear uno.",
      pt: "❌ Você ainda não tem um perfil registrado. Use `/profile register` para criar um.",
      fr: "❌ Vous n'avez pas encore de profil enregistré. Utilisez `/profile register` pour en créer un.",
      de: "❌ Du hast noch kein Profil registriert. Verwende `/profile register`, um eines zu erstellen.",
      ru: "❌ У вас еще нет профиля. Используйте `/profile register`, чтобы создать его.",
      ko: "❌ 아직 등록된 프로필이 없습니다. `/profile register` 명령어로 프로필을 먼저 생성해 주세요.",
      ja: "❌ まだプロフィールが登録されていません。`/profile register` でプロフィールを作成してください。",
    };
    await interaction.reply({
      content: errorMsg[lang] || errorMsg.en,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const embed = buildLocalizedProfileCard(
    {
      player,
      discordUserMention: `${interaction.user}`,
      avatarUrl: interaction.user.displayAvatarURL({ size: 256 }),
    },
    lang,
  );

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

export const profileCommand: Command = {
  name: "profile",
  category: "Player",
  description: "Manage your Last War player profile",
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Manage your Last War player profile")
    .setDescriptionLocalizations({
      "es-ES": "Administra tu perfil de jugador de Last War",
      "es-419": "Administra tu perfil de jugador de Last War",
      "pt-BR": "Gerenciar seu perfil de jogador do Last War",
      fr: "Gérer votre profil de joueur Last War",
      de: "Verwalte dein Last War-Spielerprofil",
      ru: "Управление вашим профилем игрока Last War",
      ko: "Last War 플레이어 프로필을 관리합니다",
      ja: "ラストウォーのプレイヤープロフィールを管理します",
    })
    .addSubcommand((subcommand) =>
      subcommand
        .setName("register")
        .setDescription("Register or create your profile")
        .setDescriptionLocalizations({
          "es-ES": "Registra o crea tu perfil de jugador",
          "es-419": "Registra o crea tu perfil de jugador",
          "pt-BR": "Registrar ou criar seu perfil",
          fr: "Enregistrer ou créer votre profil",
          de: "Registriere oder erstelle dein Profil",
          ru: "Зарегистрировать или создать профиль",
          ko: "플레이어 프로필을 등록하거나 생성합니다",
          ja: "プレイヤープロフィールを新規作成",
        })
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Your in-game name")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("squad")
            .setDescription("Your main squad type")
            .setRequired(true)
            .addChoices(
              { name: "🛡️ Tank", value: "TANK" },
              { name: "✈️ Air", value: "AIR" },
              { name: "🚀 Missile", value: "MISSILE" },
            ),
        )
        .addStringOption((option) =>
          option
            .setName("power")
            .setDescription("Your power in millions, e.g. 80m, 90mill, 95")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("language")
            .setDescription("Preferred language for match notifications (auto-detected if omitted)")
            .setRequired(false)
            .addChoices(
              SUPPORTED_LANGUAGES.map((l) => ({
                name: `${l.flag} ${l.nativeName} (${l.code})`,
                value: l.code,
              })),
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("update")
        .setDescription("Update your profile")
        .setDescriptionLocalizations({
          "es-ES": "Actualiza los datos de tu perfil",
          "es-419": "Actualiza los datos de tu perfil",
          "pt-BR": "Atualizar os dados do seu perfil",
          fr: "Mettre à jour les informations de votre profil",
          de: "Aktualisiere deine Profildaten",
          ru: "Обновить данные вашего профиля",
          ko: "프로필 정보를 변경하거나 업데이트합니다",
          ja: "プロフィールの情報を更新",
        })
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Your in-game name")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("squad")
            .setDescription("Your main squad type")
            .setRequired(false)
            .addChoices(
              { name: "🛡️ Tank", value: "TANK" },
              { name: "✈️ Air", value: "AIR" },
              { name: "🚀 Missile", value: "MISSILE" },
            ),
        )
        .addStringOption((option) =>
          option
            .setName("power")
            .setDescription("Your power in millions, e.g. 80m, 90mill, 95")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("language")
            .setDescription("Preferred language for match notifications")
            .setRequired(false)
            .addChoices(
              SUPPORTED_LANGUAGES.map((l) => ({
                name: `${l.flag} ${l.nativeName} (${l.code})`,
                value: l.code,
              })),
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("me")
        .setDescription("Show your profile")
        .setDescriptionLocalizations({
          "es-ES": "Muestra tu tarjeta de perfil",
          "es-419": "Muestra tu tarjeta de perfil",
          "pt-BR": "Mostrar seu cartão de perfil",
          fr: "Afficher votre carte de profil",
          de: "Zeige deine Profilkarte an",
          ru: "Показать вашу карточку профиля",
          ko: "내 프로필 카드를 확인합니다",
          ja: "自分のプロフィールカードを表示",
        }),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "❌ This command can only be used inside a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "register") {
      await registerProfile(interaction);
      return;
    }
    if (subcommand === "update") {
      await updateProfile(interaction);
      return;
    }
    if (subcommand === "me") {
      await showProfile(interaction);
      return;
    }
  },
};
