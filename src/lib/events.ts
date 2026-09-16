import { EventType, Team } from "@prisma/client";
import { db } from "./db.js";

export interface CreateEventOptions {
  guildId: string;
  type: EventType;
  team: Team;
  startsAt: Date;
  registrationClosesAt: Date;
}

export async function createOrGetEvent(options: CreateEventOptions) {
  const { guildId, type, team, startsAt, registrationClosesAt } = options;
  return db.event.upsert({
    where: { guildId_type_team_startsAt: { guildId, type, team, startsAt } },
    update: { registrationClosesAt },
    create: { guildId, type, team, startsAt, registrationClosesAt },
  });
}

export function eventLabel(type: EventType): string {
  return type === EventType.DESERT_STORM
    ? "Desert Storm Battlefield"
    : "Canyon Storm Battlefield";
}

export function teamLabel(team: Team): string {
  return team === Team.MORNING ? "Morning Team" : "Night Team";
}
