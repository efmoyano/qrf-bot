import {
  AttendanceStatus,
  Event,
  EventType,
  ParticipationRole,
  Player,
  PlayerTag,
  Registration,
  SquadType,
} from "@prisma/client";
import { EmbedBuilder } from "discord.js";
import { db } from "./db.js";
import { eventLabel, teamLabel } from "./events.js";
import { formatPower } from "./format.js";

export const MAX_MAIN_PLAYERS = 20;
export const MAX_SUBSTITUTE_PLAYERS = 10;

export const PLAYER_TAG_ICONS: Record<PlayerTag, string> = {
  STAR: "⭐",
  BLUE: "🔵",
  WHITE: "⚪",
  RED: "🔴",
};

export const PLAYER_TAG_LABELS: Record<PlayerTag, string> = {
  STAR: "Star (Core Member)",
  BLUE: "Blue (Priority)",
  WHITE: "White (Neutral)",
  RED: "Red (No-Show)",
};

const SQUAD_ICONS: Record<SquadType, string> = {
  TANK: "🛡️",
  AIR: "✈️",
  MISSILE: "🚀",
};

export function playerTagIcon(tag: PlayerTag): string {
  return PLAYER_TAG_ICONS[tag] ?? "⚪";
}

export function playerTagLabel(tag: PlayerTag): string {
  return PLAYER_TAG_LABELS[tag] ?? tag;
}

function squadIcon(squad: SquadType): string {
  return SQUAD_ICONS[squad] ?? "⚔️";
}

const TAG_PRIORITY: Record<PlayerTag, number> = {
  STAR: 0,
  BLUE: 1,
  WHITE: 2,
  RED: 3,
};

type RegistrationWithPlayer = Registration & { player: Player };

export function compareRegistrations(
  a: RegistrationWithPlayer,
  b: RegistrationWithPlayer,
): number {
  const diff = TAG_PRIORITY[a.player.tag] - TAG_PRIORITY[b.player.tag];
  if (diff !== 0) return diff;
  if (b.powerSnapshot > a.powerSnapshot) return 1;
  if (b.powerSnapshot < a.powerSnapshot) return -1;
  return 0;
}

export async function autoSelectLineup(eventId: string): Promise<{
  mainCount: number;
  subCount: number;
  unselectedCount: number;
  total: number;
}> {
  const registrations = await db.registration.findMany({
    where: { eventId },
    include: { player: true },
  });

  const sorted = [...registrations].sort(compareRegistrations);

  const updates: Array<Promise<Registration>> = [];
  let mainCount = 0;
  let subCount = 0;
  let unselectedCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    let role: ParticipationRole = ParticipationRole.UNSELECTED;
    if (i < MAX_MAIN_PLAYERS) {
      role = ParticipationRole.MAIN;
      mainCount++;
    } else if (i < MAX_MAIN_PLAYERS + MAX_SUBSTITUTE_PLAYERS) {
      role = ParticipationRole.SUBSTITUTE;
      subCount++;
    } else {
      unselectedCount++;
    }

    if (sorted[i].role !== role) {
      updates.push(
        db.registration.update({
          where: { id: sorted[i].id },
          data: { role },
        }),
      );
    }
  }

  await Promise.all(updates);

  return {
    mainCount,
    subCount,
    unselectedCount,
    total: sorted.length,
  };
}

export async function setPlayerRole(
  eventId: string,
  playerId: string,
  role: ParticipationRole,
): Promise<Registration> {
  return db.registration.update({
    where: { eventId_playerId: { eventId, playerId } },
    data: { role },
  });
}

export interface FinalizeAttendanceSummary {
  attendedCount: number;
  noShowCount: number;
  benchedCount: number;
}

export async function finalizeAttendance(
  eventId: string,
  noShowPlayerIds: string[],
): Promise<FinalizeAttendanceSummary> {
  const registrations = await db.registration.findMany({
    where: { eventId },
    include: { player: true },
  });

  const noShows = registrations.filter(
    (r) =>
      noShowPlayerIds.includes(r.playerId) ||
      r.attendance === AttendanceStatus.NO_SHOW,
  );
  const selectedAttended = registrations.filter(
    (r) =>
      !noShows.includes(r) &&
      (r.role === ParticipationRole.MAIN ||
        r.role === ParticipationRole.SUBSTITUTE),
  );
  const unselected = registrations.filter(
    (r) => !noShows.includes(r) && r.role === ParticipationRole.UNSELECTED,
  );

  const updates: Array<Promise<unknown>> = [];

  if (noShows.length > 0) {
    const noShowIds = noShows.map((r) => r.playerId);
    const regIds = noShows.map((r) => r.id);
    updates.push(
      db.registration.updateMany({
        where: { id: { in: regIds } },
        data: { attendance: AttendanceStatus.NO_SHOW },
      }),
      db.player.updateMany({
        where: { id: { in: noShowIds } },
        data: { tag: PlayerTag.RED, noShowCount: { increment: 1 } },
      }),
    );
  }

  if (selectedAttended.length > 0) {
    const regIds = selectedAttended.map((r) => r.id);
    const playerIds = selectedAttended.map((r) => r.playerId);
    updates.push(
      db.registration.updateMany({
        where: { id: { in: regIds } },
        data: { attendance: AttendanceStatus.ATTENDED },
      }),
      db.player.updateMany({
        where: { id: { in: playerIds } },
        data: { attendanceCount: { increment: 1 } },
      }),
      db.player.updateMany({
        where: {
          id: { in: playerIds },
          tag: { in: [PlayerTag.BLUE, PlayerTag.RED] },
        },
        data: { tag: PlayerTag.WHITE },
      }),
    );
  }

  if (unselected.length > 0) {
    const playerIds = unselected.map((r) => r.playerId);
    updates.push(
      db.player.updateMany({
        where: { id: { in: playerIds } },
        data: { tag: PlayerTag.BLUE },
      }),
    );
  }

  await Promise.all(updates);

  return {
    attendedCount: selectedAttended.length,
    noShowCount: noShows.length,
    benchedCount: unselected.length,
  };
}

function formatRosterLines(list: RegistrationWithPlayer[]): string {
  if (list.length === 0) return "_None_";
  return list
    .map(
      (r, idx) =>
        `${idx + 1}. ${playerTagIcon(r.player.tag)} **${r.player.gameName}** • ${squadIcon(r.squadSnapshot)} ${formatPower(r.powerSnapshot)}`,
    )
    .join("\n");
}

export function buildLineupEmbed(
  event: Event,
  registrations: RegistrationWithPlayer[],
): EmbedBuilder {
  const isDesert = event.type === EventType.DESERT_STORM;
  const color = isDesert ? 0xe67e22 : 0x9b59b6;

  const mains = registrations.filter((r) => r.role === ParticipationRole.MAIN);
  const subs = registrations.filter((r) => r.role === ParticipationRole.SUBSTITUTE);
  const leftOut = registrations.filter(
    (r) => r.role === ParticipationRole.UNSELECTED,
  );

  const startSec = Math.floor(event.startsAt.getTime() / 1000);

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(
      `🛡️ Official Lineup: ${eventLabel(event.type)} — ${teamLabel(event.team)}`,
    )
    .setDescription(
      [
        `📅 **Match Time:** <t:${startSec}:F> (<t:${startSec}:R>)`,
        "",
        "### 🏷️ Legend",
        "⭐ Core Member • 🔵 Priority (Benched last match) • ⚪ Neutral • 🔴 No-Show",
      ].join("\n"),
    )
    .addFields(
      {
        name: `🏆 Main Squad (${mains.length}/${MAX_MAIN_PLAYERS})`,
        value: formatRosterLines(mains),
        inline: false,
      },
      {
        name: `🔄 Substitutes (${subs.length}/${MAX_SUBSTITUTE_PLAYERS})`,
        value: formatRosterLines(subs),
        inline: false,
      },
      {
        name: `🔵 Standby / Reserves (${leftOut.length}) — Next Event Priority`,
        value: formatRosterLines(leftOut),
        inline: false,
      },
    )
    .setFooter({
      text: `${registrations.length} Total Registrations • Last War Battlefield`,
    })
    .setTimestamp();
}
