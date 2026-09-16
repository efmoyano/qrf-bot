import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { db } from "../../lib/db.js";
import { formatPower, parsePower } from "../../lib/format.js";
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

function getSquadColor(squadType: string): number {
  switch (squadType) {
    case "TANK":
      return 0x4caf50;
    case "AIR":
      return 0x42a5f5;
    case "MISSILE":
      return 0xf44336;
    default:
      return 0x5865f2;
  }
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

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  const name = interaction.options.getString("name", true).trim();
  const squadType = interaction.options.getString("squad", true);
  const powerInput = interaction.options.getString("power", true);

  let power: bigint;
  try {
    power = parsePower(powerInput);
  } catch {
    await interaction.reply({
      content:
        "❌ Invalid power. Please enter something like `80m`, `90mill`, `90millones`, or simply `90`.",
      ephemeral: true,
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
    },
  });

  const icon = getSquadIcon(player.squadType);
  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(`${icon} Profile Registered`)
    .setDescription(
      [
        `Welcome **${player.gameName}**!`,
        "",
        `${icon} Squad: **${getSquadLabel(player.squadType)}**`,
        `💥 Power: **${formatPower(player.power)}**`,
        "",
        "Your player profile is ready for Storm registration.",
      ].join("\n"),
    )
    .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: "Last War • Player Profile" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
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
      ephemeral: true,
    });
    return;
  }

  const name = interaction.options.getString("name");
  const squadType = interaction.options.getString("squad");
  const powerInput = interaction.options.getString("power");

  let power: bigint | undefined;
  if (powerInput) {
    try {
      power = parsePower(powerInput);
    } catch {
      await interaction.reply({
        content:
          "❌ Invalid power. Please enter something like `80m`, `90mill`, `90millones`, or simply `90`.",
        ephemeral: true,
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
    },
  });

  const icon = getSquadIcon(player.squadType);
  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(`${icon} Profile Updated`)
    .setDescription(
      [
        `👤 **${player.gameName}**`,
        "",
        `${icon} **${getSquadLabel(player.squadType)}** Squad`,
        `💥 **${formatPower(player.power)}** Power`,
      ].join("\n"),
    )
    .setThumbnail(interaction.user.displayAvatarURL())
    .setFooter({ text: "Last War • Player Profile" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function showProfile(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const discordId = interaction.user.id;

  const player = await db.player.findUnique({
    where: { guildId_discordId: { guildId, discordId } },
  });

  if (!player) {
    await interaction.reply({
      content:
        "❌ You do not have a profile yet. Use `/profile register` to create one.",
      ephemeral: true,
    });
    return;
  }

  const icon = getSquadIcon(player.squadType);
  const embed = new EmbedBuilder()
    .setColor(getSquadColor(player.squadType))
    .setTitle(`${icon} ${player.gameName}`)
    .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
    .setDescription(
      [
        `### ${icon} ${getSquadLabel(player.squadType)} Squad`,
        "",
        `💥 **${formatPower(player.power)} Power**`,
        "",
        "⚔️ **PLAYER PROFILE**",
        "",
        `👤 Discord: ${interaction.user}`,
        `${icon} Main Squad: **${getSquadLabel(player.squadType)}**`,
        `💪 Power: **${formatPower(player.power)}**`,
      ].join("\n"),
    )
    .setFooter({ text: "Last War • Player Profile" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

export const profileCommand: Command = {
  name: "profile",
  category: "Player",
  description: "Manage your Last War player profile",
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Manage your Last War player profile")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("register")
        .setDescription("Register or create your profile")
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
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("update")
        .setDescription("Update your profile")
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
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("me").setDescription("Show your profile"),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "❌ This command can only be used inside a server.",
        ephemeral: true,
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
