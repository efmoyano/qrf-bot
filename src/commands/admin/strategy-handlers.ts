import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { EventType, Team } from "@prisma/client";
import { db } from "../../lib/db.js";
import { eventLabel, teamLabel } from "../../lib/events.js";
import {
  broadcastStrategyMap,
  buildStrategyWizardPayload,
} from "../../interactions/strategy-wizard.js";
import {
  getEventStrategyData,
  renderDesertStormStrategyMap,
} from "../../lib/strategy-map.js";

export async function handleStrategyWizard(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const type = interaction.options.getString("event", true) as EventType;
  const team = interaction.options.getString("team", true) as Team;

  const event = await db.event.findFirst({
    where: { guildId, type, team, startsAt: { gt: new Date() } },
    orderBy: { startsAt: "asc" },
  });

  if (!event) {
    await interaction.reply({
      content: `❌ No upcoming event found for **${eventLabel(type)} - ${teamLabel(team)}**.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const payload = await buildStrategyWizardPayload(event.id);
  await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
}

export async function handleStrategyView(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const type = interaction.options.getString("event", true) as EventType;
  const team = interaction.options.getString("team", true) as Team;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const event = await db.event.findFirst({
    where: { guildId, type, team },
    orderBy: { startsAt: "desc" },
  });

  if (!event) {
    await interaction.editReply({
      content: `❌ No event found for **${eventLabel(type)} - ${teamLabel(team)}**.`,
    });
    return;
  }

  const { assignments, substitutes } = await getEventStrategyData(event.id);
  const png = renderDesertStormStrategyMap({
    eventTitle: `${eventLabel(event.type)} — ${teamLabel(event.team)}`,
    assignments,
    substitutes,
  });

  const attachment = new AttachmentBuilder(png, { name: "desert_storm_strategy.png" });
  await interaction.editReply({
    content: `🗺️ **Desert Storm Tactical Strategy Map:**`,
    files: [attachment],
  });
}

async function resolvePublishChannel(
  interaction: ChatInputCommandInteraction,
  event: { id: string; guildId: string; type: EventType; channelId: string | null },
) {
  const channelOption = interaction.options.getChannel("channel");
  const cfg = await db.eventConfig.findUnique({
    where: { guildId_eventType: { guildId: event.guildId, eventType: event.type } },
  });

  const channelId =
    channelOption?.id ?? event.channelId ?? cfg?.channelId ?? interaction.channelId;
  const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
  const isSendable = channel && channel.isSendable();

  return { channel: isSendable ? channel : null, channelId };
}

export async function handleStrategyPublish(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const type = interaction.options.getString("event", true) as EventType;
  const team = interaction.options.getString("team", true) as Team;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const event = await db.event.findFirst({
    where: { guildId, type, team },
    orderBy: { startsAt: "desc" },
  });

  if (!event) {
    await interaction.editReply({
      content: `❌ No event found for **${eventLabel(type)} - ${teamLabel(team)}**.`,
    });
    return;
  }

  const { channel, channelId } = await resolvePublishChannel(interaction, event);
  if (!channel) {
    await interaction.editReply({
      content: `❌ Could not send to channel <#${channelId}>.`,
    });
    return;
  }

  try {
    await broadcastStrategyMap(interaction.client, event, channel);
    await interaction.editReply({
      content: `✅ Tactical Strategy Map successfully published to <#${channelId}>!`,
    });
  } catch (err: any) {
    console.error("[StrategyPublish] Failed to publish strategy:", err);
    await interaction.editReply({
      content: `❌ Failed to publish strategy to <#${channelId}>: ${err?.message || "Missing Permissions"}.`,
    });
  }
}
