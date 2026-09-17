import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { ParticipationRole } from "@prisma/client";
import { db } from "../lib/db.js";
import { eventLabel, teamLabel } from "../lib/events.js";
import { formatPower } from "../lib/format.js";
import {
  autoDistributeStrategy,
  DESERT_STORM_BUILDINGS,
  getEventStrategyData,
  renderDesertStormStrategyMap,
} from "../lib/strategy-map.js";
import {
  buildStrategyBroadcastEmbed,
  notifyStrategyPublished,
} from "../lib/notifications.js";

type WizardComponentRow = ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>;

export interface StrategyWizardPayload {
  embeds: EmbedBuilder[];
  components: WizardComponentRow[];
}

const DEFAULT_BUILDING = "NUCLEAR_SILO";

function buildBuildingSelectMenu(
  eventId: string,
  activeBuildingId: string,
  assignments: Record<string, unknown[]>,
): WizardComponentRow {
  const buildingSelect = new StringSelectMenuBuilder()
    .setCustomId(`strat_wiz:bld_select:${eventId}:${activeBuildingId}`)
    .setPlaceholder("Switch Structure");

  for (const b of DESERT_STORM_BUILDINGS) {
    const count = assignments[b.id]?.length || 0;
    buildingSelect.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(b.shortName)
        .setValue(b.id)
        .setDescription(`${count} players assigned`)
        .setDefault(b.id === activeBuildingId),
    );
  }

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    buildingSelect,
  ) as WizardComponentRow;
}

function buildPlayerSelectMenu(
  eventId: string,
  activeBuildingId: string,
  starters: Array<any>,
): WizardComponentRow {
  const activeBuilding =
    DESERT_STORM_BUILDINGS.find((b) => b.id === activeBuildingId) ||
    DESERT_STORM_BUILDINGS[0];

  const playerSelect = new StringSelectMenuBuilder()
    .setCustomId(`strat_wiz:ply_select:${eventId}:${activeBuildingId}`)
    .setPlaceholder(`Assign players to ${activeBuilding.shortName}`)
    .setMinValues(0)
    .setMaxValues(Math.min(starters.length, 10));

  for (const r of starters) {
    const isHere = r.assignedBuilding === activeBuildingId;
    const otherBld = r.assignedBuilding
      ? DESERT_STORM_BUILDINGS.find((b) => b.id === r.assignedBuilding)?.shortName
      : "Unassigned";

    playerSelect.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(r.player.gameName.slice(0, 100))
        .setValue(r.id)
        .setDescription(
          `[${r.squadSnapshot}] • ${formatPower(r.powerSnapshot)} • (${otherBld})`.slice(0, 100),
        )
        .setDefault(isHere),
    );
  }

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    playerSelect,
  ) as WizardComponentRow;
}

function buildActionButtonsRow(
  eventId: string,
  activeBuildingId: string,
): WizardComponentRow {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`strat_wiz:autofill:${eventId}:${activeBuildingId}`)
      .setLabel("Auto-Distribute")
      .setEmoji("⚡")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`strat_wiz:preview:${eventId}:${activeBuildingId}`)
      .setLabel("Preview Map")
      .setEmoji("🖼️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`strat_wiz:publish:${eventId}:${activeBuildingId}`)
      .setLabel("Publish Strategy")
      .setEmoji("📢")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`strat_wiz:reset:${eventId}:${activeBuildingId}`)
      .setLabel("Clear All")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Danger),
  ) as WizardComponentRow;
}

export async function buildStrategyWizardPayload(
  eventId: string,
  activeBuildingId = DEFAULT_BUILDING,
): Promise<StrategyWizardPayload> {
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new Error("Event not found");
  }

  const { assignments, unassignedStarters } = await getEventStrategyData(eventId);

  const starters = await db.registration.findMany({
    where: { eventId, role: ParticipationRole.MAIN },
    include: { player: true },
    orderBy: { powerSnapshot: "desc" },
  });

  const activeBuilding =
    DESERT_STORM_BUILDINGS.find((b) => b.id === activeBuildingId) ||
    DESERT_STORM_BUILDINGS[0];

  const assignedCount = assignments[activeBuilding.id]?.length || 0;

  const summaryLines = DESERT_STORM_BUILDINGS.map((b) => {
    const count = assignments[b.id]?.length || 0;
    const isSelected = b.id === activeBuilding.id ? "👉 " : "• ";
    return `${isSelected}**${b.shortName}:** ${count} assigned`;
  });

  const embed = new EmbedBuilder()
    .setColor(0xf97316)
    .setTitle(`🗺️ Strategy Planner: ${eventLabel(event.type)} — ${teamLabel(event.team)}`)
    .setDescription(
      [
        `### Active Structure: **${activeBuilding.name}** (${assignedCount} assigned)`,
        `Select players from the menu below to allocate to **${activeBuilding.shortName}**.`,
        "",
        `📊 **Deployment Status (${starters.length - unassignedStarters.length}/${starters.length} Starters Assigned):**`,
        summaryLines.join("\n"),
        "",
        unassignedStarters.length > 0
          ? `⚠️ *${unassignedStarters.length} starters still unassigned. Click Auto-Distribute or assign them manually.*`
          : `✅ *All ${starters.length} starters have been assigned to structures!*`,
      ].join("\n"),
    )
    .setFooter({
      text: "Tip: Click Preview Map to see the rendered battlefield schematic image!",
    })
    .setTimestamp();

  const components: WizardComponentRow[] = [
    buildBuildingSelectMenu(eventId, activeBuilding.id, assignments),
  ];

  if (starters.length > 0) {
    components.push(buildPlayerSelectMenu(eventId, activeBuilding.id, starters));
  }

  components.push(buildActionButtonsRow(eventId, activeBuilding.id));

  return { embeds: [embed], components };
}

export async function handleStrategyWizardSelect(
  interaction: StringSelectMenuInteraction,
): Promise<void> {
  const [, action, eventId, activeBuildingId] = interaction.customId.split(":");

  if (action === "bld_select") {
    const targetBuilding = interaction.values[0] || DEFAULT_BUILDING;
    const payload = await buildStrategyWizardPayload(eventId, targetBuilding);
    await interaction.update(payload);
    return;
  }

  if (action === "ply_select") {
    const selectedRegIds = interaction.values;

    await db.registration.updateMany({
      where: {
        eventId,
        assignedBuilding: activeBuildingId,
        id: { notIn: selectedRegIds },
      },
      data: { assignedBuilding: null },
    });

    if (selectedRegIds.length > 0) {
      await db.registration.updateMany({
        where: { id: { in: selectedRegIds } },
        data: { assignedBuilding: activeBuildingId },
      });
    }

    const payload = await buildStrategyWizardPayload(eventId, activeBuildingId);
    await interaction.update(payload);
  }
}

export async function broadcastStrategyMap(
  client: any,
  event: any,
  channel: any,
): Promise<void> {
  const { assignments, substitutes } = await getEventStrategyData(event.id);
  const png = renderDesertStormStrategyMap({
    eventTitle: `${eventLabel(event.type)} — ${teamLabel(event.team)}`,
    assignments,
    substitutes,
  });

  const attachment = new AttachmentBuilder(png, { name: "desert_storm_strategy.png" });

  const starters = await db.registration.findMany({
    where: { eventId: event.id, role: ParticipationRole.MAIN },
    include: { player: true },
  });

  const embed = buildStrategyBroadcastEmbed(
    event,
    starters.length,
    substitutes.length,
  );

  await channel.send({ embeds: [embed], files: [attachment] });

  const allRegs = await db.registration.findMany({
    where: { eventId: event.id },
    include: { player: true },
  });

  const buildingMap: Record<string, string> = Object.fromEntries(
    DESERT_STORM_BUILDINGS.map((b) => [b.id, b.name]),
  );

  notifyStrategyPublished(client, event, allRegs, buildingMap).catch(console.error);
}

async function handlePreviewAction(
  interaction: ButtonInteraction,
  eventId: string,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) {
    await interaction.editReply({ content: "❌ Event not found." });
    return;
  }

  const { assignments, substitutes } = await getEventStrategyData(eventId);
  const png = renderDesertStormStrategyMap({
    eventTitle: `${eventLabel(event.type)} — ${teamLabel(event.team)}`,
    assignments,
    substitutes,
  });

  const attachment = new AttachmentBuilder(png, { name: "desert_storm_strategy.png" });
  await interaction.editReply({
    content: "🗺️ **Desert Storm Tactical Strategy Map Preview:**",
    files: [attachment],
  });
}

async function handlePublishButtonAction(
  interaction: ButtonInteraction,
  eventId: string,
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) {
    await interaction.editReply({ content: "❌ Event not found." });
    return;
  }

  const cfg = await db.eventConfig.findUnique({
    where: { guildId_eventType: { guildId: event.guildId, eventType: event.type } },
  });

  const channelId = event.channelId ?? cfg?.channelId ?? interaction.channelId;
  const channel = await interaction.client.channels.fetch(channelId).catch(() => null);

  if (!channel || !channel.isSendable()) {
    await interaction.editReply({
      content: `❌ Could not send to channel <#${channelId}>. Check bot permissions.`,
    });
    return;
  }

  try {
    await broadcastStrategyMap(interaction.client, event, channel);
    await interaction.editReply({
      content: `✅ Tactical Strategy Map successfully published to <#${channelId}>! Notifications dispatched to players.`,
    });
  } catch (err: any) {
    console.error("[StrategyWizard] Failed to publish strategy:", err);
    await interaction.editReply({
      content: `❌ Failed to publish strategy to <#${channelId}>: ${err?.message || "Missing Permissions"}.`,
    });
  }
}

export async function handleStrategyWizardButton(
  interaction: ButtonInteraction,
): Promise<void> {
  const [, action, eventId, activeBuildingId] = interaction.customId.split(":");

  if (action === "open") {
    const payload = await buildStrategyWizardPayload(eventId, DEFAULT_BUILDING);
    await interaction.reply({
      ...payload,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (action === "autofill") {
    await autoDistributeStrategy(eventId);
    const payload = await buildStrategyWizardPayload(eventId, activeBuildingId);
    await interaction.update(payload);
    return;
  }

  if (action === "reset") {
    await db.registration.updateMany({
      where: { eventId },
      data: { assignedBuilding: null },
    });
    const payload = await buildStrategyWizardPayload(eventId, activeBuildingId);
    await interaction.update(payload);
    return;
  }

  if (action === "preview") {
    return handlePreviewAction(interaction, eventId);
  }

  if (action === "publish") {
    return handlePublishButtonAction(interaction, eventId);
  }
}
