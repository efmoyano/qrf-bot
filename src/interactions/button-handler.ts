import { ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { EventType, SquadType, Team } from "@prisma/client";
import { db } from "../lib/db.js";
import { formatPower } from "../lib/format.js";
import { eventLabel, teamLabel } from "../lib/events.js";

const SQUAD_ICONS: Record<SquadType, string> = {
  TANK: "🛡️",
  AIR: "✈️",
  MISSILE: "🚀",
};

function squadIcon(squad: SquadType): string {
  return SQUAD_ICONS[squad] ?? "⚔️";
}

async function handleButtonRegister(
  interaction: ButtonInteraction,
  team: Team,
  type: EventType,
): Promise<void> {
  const guildId = interaction.guildId!;
  const discordId = interaction.user.id;

  const player = await db.player.findUnique({
    where: { guildId_discordId: { guildId, discordId } },
  });

  if (!player) {
    await interaction.reply({
      content:
        "❌ You haven't registered your player profile yet.\nPlease create your profile first with `/profile register`.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const event = await db.event.findFirst({
    where: { guildId, type, team, startsAt: { gt: new Date() } },
    orderBy: { startsAt: "asc" },
  });

  if (!event) {
    await interaction.reply({
      content: "❌ No upcoming event found for that team.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (new Date() >= event.registrationClosesAt) {
    await interaction.reply({
      content: "❌ Registration for this event has closed.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Seamless team switching: remove registration from the other team in this cycle
  const otherEvents = await db.event.findMany({
    where: {
      guildId,
      type,
      startsAt: { gt: new Date() },
      id: { not: event.id },
    },
    select: { id: true },
  });

  if (otherEvents.length > 0) {
    await db.registration.deleteMany({
      where: {
        playerId: player.id,
        eventId: { in: otherEvents.map((e) => e.id) },
      },
    });
  }

  await db.registration.upsert({
    where: { eventId_playerId: { eventId: event.id, playerId: player.id } },
    update: {
      powerSnapshot: player.power,
      squadSnapshot: player.squadType,
    },
    create: {
      eventId: event.id,
      playerId: player.id,
      powerSnapshot: player.power,
      squadSnapshot: player.squadType,
    },
  });

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("✅ Registered for Battlefield Event")
    .setDescription(
      [
        `**Player:** ${player.gameName}`,
        `**Event:** ${eventLabel(type)}`,
        `**Team:** ${teamLabel(team)}`,
        `**Match Time:** <t:${Math.floor(event.startsAt.getTime() / 1000)}:F>`,
        `**Power Snapshot:** ${squadIcon(player.squadType)} ${formatPower(player.power)} (${player.squadType})`,
        "",
        "> 💡 Need to change? Click the other team button anytime before the deadline.",
      ].join("\n"),
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleButtonUnregister(
  interaction: ButtonInteraction,
  type: EventType,
): Promise<void> {
  const guildId = interaction.guildId!;
  const discordId = interaction.user.id;

  const player = await db.player.findUnique({
    where: { guildId_discordId: { guildId, discordId } },
  });

  if (!player) {
    await interaction.reply({
      content: "❌ Profile not found. Create one with `/profile register`.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const events = await db.event.findMany({
    where: { guildId, type, startsAt: { gt: new Date() } },
    select: { id: true },
  });

  const res = await db.registration.deleteMany({
    where: {
      playerId: player.id,
      eventId: { in: events.map((e) => e.id) },
    },
  });

  if (res.count === 0) {
    await interaction.reply({
      content: `⚠️ You are not currently registered for **${eventLabel(type)}**.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.reply({
    content: `✅ You have been removed from **${eventLabel(type)}** registrations.`,
    flags: MessageFlags.Ephemeral,
  });
}

function formatPlayerList(
  regs: Array<{
    powerSnapshot: bigint;
    squadSnapshot: SquadType;
    player: { gameName: string };
  }>,
): string {
  if (regs.length === 0) return "_No registrations yet._";
  const lines = regs.slice(0, 15).map(
    (r, idx) =>
      `${idx + 1}. **${r.player.gameName}** • ${squadIcon(r.squadSnapshot)} ${formatPower(r.powerSnapshot)}`,
  );
  if (regs.length > 15) {
    lines.push(`_...and ${regs.length - 15} more_`);
  }
  return lines.join("\n");
}

async function handleButtonRoster(
  interaction: ButtonInteraction,
  type: EventType,
): Promise<void> {
  const guildId = interaction.guildId!;

  const [eventA, eventB] = await Promise.all([
    db.event.findFirst({
      where: { guildId, type, team: Team.TEAM_A, startsAt: { gt: new Date() } },
      orderBy: { startsAt: "asc" },
      include: {
        registrations: {
          include: { player: true },
          orderBy: { powerSnapshot: "desc" },
        },
      },
    }),
    db.event.findFirst({
      where: { guildId, type, team: Team.TEAM_B, startsAt: { gt: new Date() } },
      orderBy: { startsAt: "asc" },
      include: {
        registrations: {
          include: { player: true },
          orderBy: { powerSnapshot: "desc" },
        },
      },
    }),
  ]);

  if (!eventA && !eventB) {
    await interaction.reply({
      content: "❌ No upcoming events found.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const regsA = eventA?.registrations ?? [];
  const regsB = eventB?.registrations ?? [];
  const total = regsA.length + regsB.length;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`📋 ${eventLabel(type)} — Current Registrations (${total})`)
    .addFields(
      {
        name: `🅰️ Team A (${regsA.length})`,
        value: formatPlayerList(regsA),
        inline: true,
      },
      {
        name: `🅱️ Team B (${regsB.length})`,
        value: formatPlayerList(regsB),
        inline: true,
      },
    )
    .setFooter({ text: "Ranked by squad power snapshot" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleButtonProfile(
  interaction: ButtonInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const discordId = interaction.user.id;

  const player = await db.player.findUnique({
    where: { guildId_discordId: { guildId, discordId } },
  });

  if (!player) {
    await interaction.reply({
      content:
        "❌ You don't have a player profile yet.\nUse `/profile register` to set up your in-game name, squad, and power!",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("👤 Your Player Profile")
    .setDescription(
      [
        `**In-Game Name:** ${player.gameName}`,
        `**Main Squad:** ${squadIcon(player.squadType)} ${player.squadType}`,
        `**Power:** ${formatPower(player.power)}`,
        `**Status:** ${player.active ? "🟢 Active" : "🔴 Inactive"}`,
        "",
        "> 💡 Has your power increased? Run `/profile update` to update your squad stats.",
      ].join("\n"),
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

export async function handleButtonInteraction(
  interaction: ButtonInteraction,
): Promise<void> {
  const customId = interaction.customId;
  const parts = customId.split(":");

  if (parts[0] !== "event") return;

  const action = parts[1];

  if (action === "reg") {
    const team = parts[2] as Team;
    const type = parts[3] as EventType;
    await handleButtonRegister(interaction, team, type);
    return;
  }

  if (action === "unreg") {
    const type = parts[2] as EventType;
    await handleButtonUnregister(interaction, type);
    return;
  }

  if (action === "roster") {
    const type = parts[2] as EventType;
    await handleButtonRoster(interaction, type);
    return;
  }

  if (action === "profile") {
    await handleButtonProfile(interaction);
    return;
  }
}
