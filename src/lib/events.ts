import { EventType, Team } from "@prisma/client";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { db } from "./db.js";

const ART_OFFSET_MS = -3 * 60 * 60 * 1000;

export interface CreateEventOptions {
  guildId: string;
  type: EventType;
  team: Team;
  startsAt: Date;
  registrationClosesAt: Date;
}

export interface BattlefieldSchedule {
  type: EventType;
  announcedAt: Date;
  registrationClosesAt: Date;
  teamAStartsAt: Date;
  teamBStartsAt: Date;
}

export function eventLabel(type: EventType): string {
  return type === EventType.DESERT_STORM
    ? "Desert Storm Battlefield"
    : "Canyon Storm Battlefield";
}

export function teamLabel(team: Team): string {
  return team === Team.TEAM_A ? "Team A" : "Team B";
}

export function getArgentinaDate(d: Date = new Date()): {
  year: number;
  month: number;
  date: number;
  day: number;
  hours: number;
  minutes: number;
} {
  const art = new Date(d.getTime() + ART_OFFSET_MS);
  return {
    year: art.getUTCFullYear(),
    month: art.getUTCMonth(),
    date: art.getUTCDate(),
    day: art.getUTCDay(),
    hours: art.getUTCHours(),
    minutes: art.getUTCMinutes(),
  };
}

export function createArgentinaDate(
  year: number,
  month: number,
  date: number,
  hours = 0,
): Date {
  return new Date(Date.UTC(year, month, date, hours + 3, 0, 0, 0));
}

export function getCurrentCycleAnnouncement(from: Date = new Date()): Date {
  const art = getArgentinaDate(from);
  const daysSinceSaturday = (art.day + 1) % 7;
  return createArgentinaDate(art.year, art.month, art.date - daysSinceSaturday, 23);
}

export function getBattlefieldSchedule(
  type: EventType,
  announcedSaturday: Date,
): BattlefieldSchedule {
  const t = announcedSaturday.getTime();
  const registrationClosesAt = new Date(t + 48 * 60 * 60 * 1000);

  if (type === EventType.CANYON_STORM) {
    return {
      type,
      announcedAt: announcedSaturday,
      registrationClosesAt,
      teamBStartsAt: new Date(t + 108 * 60 * 60 * 1000), // Thursday 11:00 ART
      teamAStartsAt: new Date(t + 119 * 60 * 60 * 1000), // Thursday 22:00 ART
    };
  }

  return {
    type,
    announcedAt: announcedSaturday,
    registrationClosesAt,
    teamBStartsAt: new Date(t + 138 * 60 * 60 * 1000), // Friday 17:00 ART
    teamAStartsAt: new Date(t + 143 * 60 * 60 * 1000), // Friday 22:00 ART
  };
}

export async function createOrGetEvent(options: CreateEventOptions) {
  const { guildId, type, team, startsAt, registrationClosesAt } = options;
  return db.event.upsert({
    where: { guildId_type_team_startsAt: { guildId, type, team, startsAt } },
    update: { registrationClosesAt },
    create: { guildId, type, team, startsAt, registrationClosesAt },
  });
}

export interface CreateBattlefieldCycleOptions {
  guildId: string;
  type: EventType;
  announcedSaturday: Date;
  channelId?: string | null;
  registrationClosesAt?: Date;
}

export async function createBattlefieldCycle(
  options: CreateBattlefieldCycleOptions,
) {
  const { guildId, type, announcedSaturday, channelId, registrationClosesAt } = options;
  const baseSchedule = getBattlefieldSchedule(type, announcedSaturday);
  const effectiveClosesAt = registrationClosesAt ?? baseSchedule.registrationClosesAt;
  const schedule: BattlefieldSchedule = {
    ...baseSchedule,
    registrationClosesAt: effectiveClosesAt,
  };

  const [eventA, eventB] = await Promise.all([
    db.event.upsert({
      where: {
        guildId_type_team_startsAt: {
          guildId,
          type,
          team: Team.TEAM_A,
          startsAt: schedule.teamAStartsAt,
        },
      },
      update: {
        registrationClosesAt: schedule.registrationClosesAt,
        channelId: channelId ?? undefined,
      },
      create: {
        guildId,
        type,
        team: Team.TEAM_A,
        startsAt: schedule.teamAStartsAt,
        registrationClosesAt: schedule.registrationClosesAt,
        channelId,
      },
    }),
    db.event.upsert({
      where: {
        guildId_type_team_startsAt: {
          guildId,
          type,
          team: Team.TEAM_B,
          startsAt: schedule.teamBStartsAt,
        },
      },
      update: {
        registrationClosesAt: schedule.registrationClosesAt,
        channelId: channelId ?? undefined,
      },
      create: {
        guildId,
        type,
        team: Team.TEAM_B,
        startsAt: schedule.teamBStartsAt,
        registrationClosesAt: schedule.registrationClosesAt,
        channelId,
      },
    }),
  ]);

  return { schedule, eventA, eventB };
}

export function buildAnnouncementEmbed(
  type: EventType,
  schedule: BattlefieldSchedule,
): EmbedBuilder {
  const isDesert = type === EventType.DESERT_STORM;
  const emoji = isDesert ? "🌩️" : "🏜️";
  const color = isDesert ? 0xe67e22 : 0x9b59b6;
  const closeSec = Math.floor(schedule.registrationClosesAt.getTime() / 1000);
  const aSec = Math.floor(schedule.teamAStartsAt.getTime() / 1000);
  const bSec = Math.floor(schedule.teamBStartsAt.getTime() / 1000);

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`${emoji} ${eventLabel(type)} — Registration OPEN`)
    .setDescription(
      [
        `Registrations are now open for the upcoming **${eventLabel(type)}**!`,
        "",
        "### 📅 Match Schedule",
        `• 🅰️ **Team A:** <t:${aSec}:F> (<t:${aSec}:R>)`,
        `• 🅱️ **Team B:** <t:${bSec}:F> (<t:${bSec}:R>)`,
        "",
        "### ⏳ Registration Deadline",
        `Registrations close on <t:${closeSec}:F> (<t:${closeSec}:R>).`,
        "",
        "### 📝 Quick Actions",
        "Click the buttons below to register for **Team A** or **Team B**, unregister, or view current rosters!",
        "> 💡 **Tip:** Keep your profile and main squad updated with `/profile update`.",
      ].join("\n"),
    )
    .setFooter({ text: "Alliance Battlefield Registration" })
    .setTimestamp();
}

export function buildAnnouncementActionRow(
  type: EventType,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event:reg:TEAM_A:${type}`)
      .setLabel("Register Team A")
      .setEmoji("🅰️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`event:reg:TEAM_B:${type}`)
      .setLabel("Register Team B")
      .setEmoji("🅱️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`event:unreg:${type}`)
      .setLabel("Unregister")
      .setEmoji("✖️")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`event:roster:${type}`)
      .setLabel("View Roster")
      .setEmoji("📋")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("event:profile")
      .setLabel("My Profile")
      .setEmoji("👤")
      .setStyle(ButtonStyle.Secondary),
  );
}
