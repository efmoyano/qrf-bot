import {
  AttendanceStatus,
  Event,
  ParticipationRole,
  Player,
  Registration,
} from "@prisma/client";
import { Client, EmbedBuilder } from "discord.js";
import { eventLabel, teamLabel } from "./events.js";

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
    let title = "";
    let description = "";
    let color = 0x5865f2;

    if (r.role === ParticipationRole.MAIN) {
      title = `🏆 Main Squad Selected: ${eventTitle}`;
      description = `Congratulations! You have been selected for the **Main Squad** in **${eventTitle}**.\n\n📅 **Match Starts:** <t:${matchTimestamp}:F> (<t:${matchTimestamp}:R>)\n⚔️ **Squad:** ${r.player.squadType ?? "General"}\n\nPlease ensure you are online in game at least 5 minutes before match start!`;
      color = 0x57f287;
    } else if (r.role === ParticipationRole.SUBSTITUTE) {
      title = `🔄 Substitute Selected: ${eventTitle}`;
      description = `You have been selected as a **Substitute** for **${eventTitle}**.\n\n📅 **Match Starts:** <t:${matchTimestamp}:F> (<t:${matchTimestamp}:R>)\n⚔️ **Squad:** ${r.player.squadType ?? "General"}\n\nPlease be on standby during match start in case a starter is unable to play.`;
      color = 0xfee75c;
    } else {
      title = `⏳ Standby Roster: ${eventTitle}`;
      description = `Thank you for registering for **${eventTitle}**! You are currently on **Standby** for this match.\n\nIf you are not substituted into the match, you will receive a 🔵 **Blue Priority Tag** granting you guaranteed selection priority for next week!`;
      color = 0x5865f2;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setFooter({ text: "Desert Storm Battlefield Coordinator" })
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
    let title = "";
    let description = "";
    let color = 0x5865f2;

    if (r.attendance === AttendanceStatus.NO_SHOW) {
      title = `⚠️ Match Attendance: Marked Absent (${eventTitle})`;
      description = `You were marked as **Absent / No-Show** for **${eventTitle}**.\n\n🔴 A **Red Tag** penalty has been applied to your alliance profile. If you have an excuse, please contact your alliance officers.`;
      color = 0xed4245;
    } else if (
      r.role === ParticipationRole.MAIN ||
      r.role === ParticipationRole.SUBSTITUTE
    ) {
      title = `✅ Match Attendance Recorded: ${eventTitle}`;
      description = `Thank you for participating in **${eventTitle}**!\n\nYour match attendance count has been updated in the alliance records.`;
      color = 0x57f287;
    } else {
      title = `🔵 Priority Tag Awarded for Next Event!`;
      description = `Thank you for registering for **${eventTitle}**.\n\nSince you were benched / on standby for this match, you have been awarded the 🔵 **Blue Priority Tag**! This gives you guaranteed priority selection for the next battlefield event.`;
      color = 0x3498db;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setFooter({ text: "Desert Storm Battlefield Coordinator" })
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
