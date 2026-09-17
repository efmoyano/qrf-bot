import {
  AttendanceStatus,
  Event,
  ParticipationRole,
  Player,
  Registration,
} from "@prisma/client";
import { Client, EmbedBuilder } from "discord.js";
import { eventLabel, teamLabel } from "./events.js";
import {
  getAttendanceNotice,
  getLineupMainDM,
  getLineupStandbyDM,
  getLineupSubDM,
  getLocalizedBuildingName,
  getLocalizedSquadName,
  getStrategyObjectiveDM,
  getStrategyReserveDM,
  LocalizedLineupNotice,
  SupportedLanguage,
} from "./i18n.js";

export type RegistrationWithPlayer = Registration & { player: Player };

export async function sendDirectMessage(
  client: Client,
  discordId: string,
  payload: string | { embeds: EmbedBuilder[] },
): Promise<boolean> {
  try {
    const user = await client.users.fetch(discordId);
    if (!user) return false;
    if (typeof payload === "string") {
      await user.send(payload);
    } else {
      await user.send(payload);
    }
    return true;
  } catch {
    // User may have DMs disabled or bot blocked
    return false;
  }
}

export async function notifyLineupPublished(
  client: Client,
  event: Event,
  registrations: RegistrationWithPlayer[],
): Promise<void> {
  const eventTitle = `${eventLabel(event.type)} (${teamLabel(event.team)})`;
  const matchTimestamp = Math.floor(event.startsAt.getTime() / 1000);

  const notifications = registrations.map(async (r) => {
    const lang = (r.player.language as SupportedLanguage) || "en";
    const localizedSquad = r.player.squadType
      ? getLocalizedSquadName(r.player.squadType, lang)
      : "General";

    let notice: LocalizedLineupNotice;
    let color = 0x5865f2;

    if (r.role === ParticipationRole.MAIN) {
      notice = getLineupMainDM(lang, eventTitle, matchTimestamp, localizedSquad);
      color = 0x57f287;
    } else if (r.role === ParticipationRole.SUBSTITUTE) {
      notice = getLineupSubDM(lang, eventTitle, matchTimestamp, localizedSquad);
      color = 0xfee75c;
    } else {
      notice = getLineupStandbyDM(lang, eventTitle);
      color = 0x5865f2;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(notice.title)
      .setDescription(notice.description)
      .setFooter({ text: notice.footer })
      .setTimestamp();

    return sendDirectMessage(client, r.player.discordId, { embeds: [embed] });
  });

  await Promise.allSettled(notifications);
}

export async function notifyAttendanceFinalized(
  client: Client,
  event: Event,
  registrations: RegistrationWithPlayer[],
): Promise<void> {
  const eventTitle = `${eventLabel(event.type)} (${teamLabel(event.team)})`;

  const notifications = registrations.map(async (r) => {
    const lang = (r.player.language as SupportedLanguage) || "en";
    let notice: LocalizedLineupNotice;
    let color = 0x5865f2;

    if (r.attendance === AttendanceStatus.NO_SHOW) {
      notice = getAttendanceNotice(lang, eventTitle, "NO_SHOW");
      color = 0xed4245;
    } else if (
      r.role === ParticipationRole.MAIN ||
      r.role === ParticipationRole.SUBSTITUTE
    ) {
      notice = getAttendanceNotice(lang, eventTitle, "ATTENDED");
      color = 0x57f287;
    } else {
      notice = getAttendanceNotice(lang, eventTitle, "BLUE_TAG");
      color = 0x3498db;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(notice.title)
      .setDescription(notice.description)
      .setFooter({ text: notice.footer })
      .setTimestamp();

    return sendDirectMessage(client, r.player.discordId, { embeds: [embed] });
  });

  await Promise.allSettled(notifications);
}

export function buildAttendanceBroadcastEmbed(
  event: Event,
  registrations: RegistrationWithPlayer[],
): EmbedBuilder {
  const eventTitle = `${eventLabel(event.type)} — ${teamLabel(event.team)}`;

  const mains = registrations.filter(
    (r) =>
      r.role === ParticipationRole.MAIN &&
      r.attendance !== AttendanceStatus.NO_SHOW,
  );
  const subs = registrations.filter(
    (r) =>
      r.role === ParticipationRole.SUBSTITUTE &&
      r.attendance !== AttendanceStatus.NO_SHOW,
  );
  const benched = registrations.filter(
    (r) => r.role === ParticipationRole.UNSELECTED,
  );
  const noShows = registrations.filter(
    (r) => r.attendance === AttendanceStatus.NO_SHOW,
  );

  const formatList = (list: RegistrationWithPlayer[]) =>
    list.length > 0
      ? list.map((r) => `• <@${r.player.discordId}> (**${r.player.gameName}**)`).join("\n")
      : "*None*";

  const descriptionLines = [
    `Official attendance for **${eventTitle}** has been finalized!`,
    "",
    `### 🏆 Main Squad Participants (${mains.length})`,
    formatList(mains),
    "",
    `### 🔄 Substitute Participants (${subs.length})`,
    formatList(subs),
    "",
    `### 🔵 Next Event Priority Awarded (${benched.length})`,
    `*The following members registered and supported the team on standby. They are awarded the **Blue Priority Tag** for guaranteed selection in the next match!*`,
    formatList(benched),
  ];

  if (noShows.length > 0) {
    descriptionLines.push(
      "",
      `### 🔴 Absent / No-Shows (${noShows.length})`,
      formatList(noShows),
    );
  }

  return new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(`🏁 Match Concluded & Attendance Finalized: ${eventTitle}`)
    .setDescription(descriptionLines.join("\n"))
    .setFooter({
      text: "Attendance and priority tags have been updated in the alliance database.",
    })
    .setTimestamp();
}

export async function notifyStrategyPublished(
  client: Client,
  event: Event,
  registrations: RegistrationWithPlayer[],
  buildingMap: Record<string, string>,
): Promise<void> {
  const eventTitle = `${eventLabel(event.type)} (${teamLabel(event.team)})`;
  const matchTimestamp = Math.floor(event.startsAt.getTime() / 1000);

  const notifications = registrations.map(async (r) => {
    const lang = (r.player.language as SupportedLanguage) || "en";
    const localizedSquad = r.player.squadType
      ? getLocalizedSquadName(r.player.squadType, lang)
      : "General";

    let notice: LocalizedLineupNotice;
    let color = 0x5865f2;

    if (r.role === ParticipationRole.MAIN && r.assignedBuilding) {
      const rawBuildingName = buildingMap[r.assignedBuilding] ?? r.assignedBuilding;
      const buildingName =
        getLocalizedBuildingName(r.assignedBuilding, lang) || rawBuildingName;

      notice = getStrategyObjectiveDM({
        lang,
        eventTitle,
        buildingName,
        squad: localizedSquad,
        timestamp: matchTimestamp,
      });
      color = 0xf97316;
    } else if (r.role === ParticipationRole.SUBSTITUTE) {
      notice = getStrategyReserveDM(lang, eventTitle);
      color = 0xfee75c;
    } else {
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(notice.title)
      .setDescription(notice.description)
      .setFooter({ text: notice.footer })
      .setTimestamp();

    return sendDirectMessage(client, r.player.discordId, { embeds: [embed] });
  });

  await Promise.allSettled(notifications);
}

export function buildStrategyBroadcastEmbed(
  event: Event,
  starterCount: number,
  subCount: number,
): EmbedBuilder {
  const eventTitle = `${eventLabel(event.type)} — ${teamLabel(event.team)}`;

  return new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle(`🗺️ Battlefield Strategy Map: ${eventTitle}`)
    .setDescription(
      [
        `The official **Tactical Strategy & Building Distribution Map** has been published for **${eventTitle}**!`,
        "",
        `📊 **Force Deployment:**`,
        `• 🏆 **Main Squad Starters:** ${starterCount}/20 allocated to structures`,
        `• 🔄 **Substitutes on Standby:** ${subCount}/10 reserve support`,
        "",
        `🔍 *Check the attached tactical battlefield schematic image below to see your assigned building objective and squad positions!*`,
      ].join("\n"),
    )
    .setImage("attachment://desert_storm_strategy.png")
    .setFooter({ text: "Desert Storm Tactical Command" })
    .setTimestamp();
}

