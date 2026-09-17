import { EventType, ParticipationRole } from "@prisma/client";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { db } from "../lib/db.js";
import { eventLabel, teamLabel } from "../lib/events.js";
import { formatPower } from "../lib/format.js";
import {
  autoSelectLineup,
  buildLineupEmbed,
  compareRegistrations,
  MAX_MAIN_PLAYERS,
  MAX_SUBSTITUTE_PLAYERS,
  playerTagIcon,
  playerTagLabel,
} from "../lib/lineup.js";
import { notifyLineupPublished } from "../lib/notifications.js";

const PAGE_SIZE = 25;

export interface LineupWizardPayload {
  content?: string;
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[];
}

type WizardComponentRow = ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>;

interface LineupPageItem {
  id: string;
  playerId: string;
  role: ParticipationRole;
  powerSnapshot: bigint;
  player: {
    gameName: string;
    tag: any;
  };
}

function buildSelectMenuRow(
  pageItems: LineupPageItem[],
  eventId: string,
  mode: ParticipationRole,
  safePage: number,
): WizardComponentRow | null {
  if (pageItems.length === 0) return null;

  const isMain = mode === ParticipationRole.MAIN;
  const maxSelectable = isMain ? MAX_MAIN_PLAYERS : MAX_SUBSTITUTE_PLAYERS;
  const maxVals = Math.min(pageItems.length, maxSelectable);

  const select = new StringSelectMenuBuilder()
    .setCustomId(`lineup_wiz:select:${eventId}:${mode}:${safePage}`)
    .setPlaceholder(
      isMain
        ? "Select players for Main Squad (Subs excluded)"
        : "Select players for Substitutes (Main excluded)",
    )
    .setMinValues(0)
    .setMaxValues(Math.max(1, maxVals));

  for (const item of pageItems) {
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(item.player.gameName.slice(0, 100))
      .setValue(item.playerId)
      .setDescription(
        `${playerTagLabel(item.player.tag)} • ${formatPower(item.powerSnapshot)}`.slice(0, 100),
      )
      .setEmoji(playerTagIcon(item.player.tag))
      .setDefault(item.role === mode);

    select.addOptions(option);
  }

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select) as WizardComponentRow;
}

function buildActionButtonsRow(
  eventId: string,
  mode: ParticipationRole,
  safePage: number,
  isDesertStorm = false,
): WizardComponentRow {
  const isMain = mode === ParticipationRole.MAIN;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`lineup_wiz:mode:${eventId}:MAIN:${safePage}`)
      .setLabel("Edit Main")
      .setEmoji("🏆")
      .setStyle(isMain ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`lineup_wiz:mode:${eventId}:SUBSTITUTE:${safePage}`)
      .setLabel("Edit Subs")
      .setEmoji("🔄")
      .setStyle(!isMain ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`lineup_wiz:autofill:${eventId}:${mode}:${safePage}`)
      .setLabel("Auto-Fill")
      .setEmoji("⚡")
      .setStyle(ButtonStyle.Primary),
  );

  if (isDesertStorm) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`strat_wiz:open:${eventId}`)
        .setLabel("Strategy")
        .setEmoji("🗺️")
        .setStyle(ButtonStyle.Secondary),
    );
  }

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`lineup_wiz:publish:${eventId}`)
      .setLabel("Publish")
      .setEmoji("📢")
      .setStyle(ButtonStyle.Danger),
  );

  return row as WizardComponentRow;
}

function buildNavRow(
  eventId: string,
  mode: ParticipationRole,
  safePage: number,
  totalPages: number,
): WizardComponentRow | null {
  if (totalPages <= 1) return null;

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`lineup_wiz:page:${eventId}:${mode}:${safePage - 1}`)
      .setLabel("◀️ Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage === 0),
    new ButtonBuilder()
      .setCustomId(`lineup_wiz:page:${eventId}:${mode}:${safePage + 1}`)
      .setLabel("Next ▶️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage >= totalPages - 1),
  ) as WizardComponentRow;
}

interface WizardEmbedStats {
  mainsCount: number;
  subsCount: number;
  standbyCount: number;
  totalRegistered: number;
  selectableCount: number;
}

function buildLineupWizardEmbed(
  event: { type: any; team: any },
  mode: ParticipationRole,
  stats: WizardEmbedStats,
): EmbedBuilder {
  const isMain = mode === ParticipationRole.MAIN;
  const otherRoleLabel = isMain ? "Substitutes" : "Main Squad";
  const targetRoleLabel = isMain ? "Main Squad" : "Substitutes";

  const modeTitle = isMain
    ? `🏆 Editing Main Squad (Current: ${stats.mainsCount}/${MAX_MAIN_PLAYERS})`
    : `🔄 Editing Substitutes (Current: ${stats.subsCount}/${MAX_SUBSTITUTE_PLAYERS})`;

  const descriptionLines = [
    `### ${modeTitle}`,
    `Use the menu below to select players for **${targetRoleLabel}**.`,
    `🔒 *Players in **${otherRoleLabel}** are excluded from this list to prevent duplicate selection.*`,
    "",
    `📊 **Roster Breakdown:**`,
    `• 🏆 **Main Squad:** ${stats.mainsCount}/${MAX_MAIN_PLAYERS}`,
    `• 🔄 **Substitutes:** ${stats.subsCount}/${MAX_SUBSTITUTE_PLAYERS}`,
    `• 🔵 **Standby (Available to assign):** ${stats.standbyCount}`,
    `• 👥 **Total Registered:** ${stats.totalRegistered}`,
  ];

  if (stats.selectableCount === 0) {
    descriptionLines.push(
      "",
      `⚠️ *All registered players are currently assigned to ${otherRoleLabel}. Uncheck players there first to free them up.*`,
    );
  }

  return new EmbedBuilder()
    .setColor(isMain ? 0x57f287 : 0x5865f2)
    .setTitle(`🧙‍♂️ Lineup Wizard: ${eventLabel(event.type)} — ${teamLabel(event.team)}`)
    .setDescription(descriptionLines.join("\n"))
    .setFooter({
      text: "Tip: Click Auto-Fill to populate by priority tags & power with 1 click!",
    })
    .setTimestamp();
}

export async function buildLineupWizardPayload(
  eventId: string,
  mode: ParticipationRole,
  page = 0,
): Promise<LineupWizardPayload> {
  const event = await db.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return { content: "❌ Event not found.", components: [], embeds: [] };
  }

  const registrations = await db.registration.findMany({
    where: { eventId },
    include: { player: true },
  });

  const sorted = [...registrations].sort(compareRegistrations);
  const mains = sorted.filter((r) => r.role === ParticipationRole.MAIN);
  const subs = sorted.filter((r) => r.role === ParticipationRole.SUBSTITUTE);
  const standby = sorted.filter((r) => r.role === ParticipationRole.UNSELECTED);

  const otherMode =
    mode === ParticipationRole.MAIN
      ? ParticipationRole.SUBSTITUTE
      : ParticipationRole.MAIN;

  // Filter out players already assigned to the other role so they cannot be selected here
  const selectable = sorted.filter((r) => r.role !== otherMode);

  const totalPages = Math.max(1, Math.ceil(selectable.length / PAGE_SIZE));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const pageItems = selectable.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const embed = buildLineupWizardEmbed(event, mode, {
    mainsCount: mains.length,
    subsCount: subs.length,
    standbyCount: standby.length,
    totalRegistered: sorted.length,
    selectableCount: selectable.length,
  });

  const components: WizardComponentRow[] = [];
  const selectRow = buildSelectMenuRow(pageItems, eventId, mode, safePage);
  if (selectRow) components.push(selectRow);

  components.push(
    buildActionButtonsRow(
      eventId,
      mode,
      safePage,
      event.type === EventType.DESERT_STORM,
    ),
  );

  const navRow = buildNavRow(eventId, mode, safePage, totalPages);
  if (navRow) components.push(navRow);

  return { embeds: [embed], components };
}

export async function handleLineupWizardSelect(
  interaction: StringSelectMenuInteraction,
): Promise<void> {
  const [, , eventId, modeStr, pageStr] = interaction.customId.split(":");
  const mode = modeStr as ParticipationRole;
  const page = parseInt(pageStr, 10) || 0;
  const selectedPlayerIds = interaction.values;

  const registrations = await db.registration.findMany({
    where: { eventId },
    include: { player: true },
  });

  const sorted = [...registrations].sort(compareRegistrations);
  const isMain = mode === ParticipationRole.MAIN;
  const otherMode = isMain ? ParticipationRole.SUBSTITUTE : ParticipationRole.MAIN;
  const selectable = sorted.filter((r) => r.role !== otherMode);

  const pageItems = selectable.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const updates: Array<Promise<unknown>> = [];

  for (const item of pageItems) {
    const isSelected = selectedPlayerIds.includes(item.playerId);
    if (isSelected && item.role !== mode) {
      updates.push(
        db.registration.update({
          where: { id: item.id },
          data: { role: mode },
        }),
      );
    } else if (!isSelected && item.role === mode) {
      updates.push(
        db.registration.update({
          where: { id: item.id },
          data: { role: ParticipationRole.UNSELECTED },
        }),
      );
    }
  }

  await Promise.all(updates);

  const payload = await buildLineupWizardPayload(eventId, mode, page);
  await interaction.update(payload);
}

async function resolvePublishChannel(
  interaction: ButtonInteraction,
  event: { guildId: string; type: EventType; channelId: string | null },
) {
  const cfg = await db.eventConfig.findUnique({
    where: { guildId_eventType: { guildId: event.guildId, eventType: event.type } },
  });
  const channelId = event.channelId ?? cfg?.channelId ?? interaction.channelId;
  const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isSendable()) {
    return { channel: null, channelId };
  }
  return { channel, channelId };
}

function buildLineupPublishComponents(
  eventId: string,
  isDesertStorm: boolean,
): WizardComponentRow[] {
  if (!isDesertStorm) return [];
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`strat_wiz:open:${eventId}`)
        .setLabel("Plan Tactical Strategy")
        .setEmoji("🗺️")
        .setStyle(ButtonStyle.Success),
    ) as WizardComponentRow,
  ];
}

async function handlePublishAction(
  interaction: ButtonInteraction,
  eventId: string,
): Promise<void> {
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) {
    await interaction.reply({
      content: "❌ Event not found.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const { channel, channelId } = await resolvePublishChannel(interaction, event);
  if (!channel) {
    await interaction.reply({
      content: `❌ Channel <#${channelId}> not sendable.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const registrations = await db.registration.findMany({
    where: { eventId },
    include: { player: true },
  });

  const embed = buildLineupEmbed(event, registrations);
  try {
    await channel.send({ embeds: [embed] });
    notifyLineupPublished(interaction.client, event, registrations).catch(console.error);
    const isDS = event.type === EventType.DESERT_STORM;
    const replyComponents = buildLineupPublishComponents(eventId, isDS);

    await interaction.reply({
      content: `✅ Lineup successfully published to <#${channelId}>! Notifications sent to players.${isDS ? "\n💡 **Next Step:** You can now plan and allocate players to battlefield structures." : ""}`,
      components: replyComponents,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error: any) {
    console.error("[LineupWizard] Failed to publish lineup:", error);
    await interaction.reply({
      content: `❌ Failed to publish lineup to <#${channelId}>: ${error?.message || "Missing Permissions"}. Please verify the bot has **Send Messages** and **Embed Links** permissions in that channel.`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

export async function handleLineupWizardButton(
  interaction: ButtonInteraction,
): Promise<void> {
  const [, action, eventId, arg1, arg2] = interaction.customId.split(":");

  if (action === "publish") {
    return handlePublishAction(interaction, eventId);
  }

  if (action === "autofill") {
    await autoSelectLineup(eventId);
  }

  const mode = (arg1 as ParticipationRole) ?? ParticipationRole.MAIN;
  const page = parseInt(arg2, 10) || 0;
  const payload = await buildLineupWizardPayload(eventId, mode, page);
  await interaction.update(payload);
}
