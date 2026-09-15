import { SlashCommandBuilder } from "discord.js";
import { EventType, Team } from "@prisma/client";
import { db } from "../lib/db.js";
import { requireAdmin } from "../lib/permissions.js";
import { formatPower } from "../lib/format.js";

export const adminCommand = new SlashCommandBuilder()
  .setName("storm-admin")
  .setDescription("Storm administration")
  .addSubcommand(s=>s.setName("config").setDescription("Configure automatic posting")
    .addStringOption(o=>o.setName("event").setDescription("Event").setRequired(true).addChoices({name:"Desert Storm",value:"DESERT_STORM"},{name:"Canyon Storm",value:"CANYON_STORM"}))
    .addStringOption(o=>o.setName("morning-cron").setDescription("Cron expression for morning post").setRequired(true))
    .addStringOption(o=>o.setName("night-cron").setDescription("Cron expression for night post").setRequired(true))
    .addChannelOption(o=>o.setName("channel").setDescription("Posting channel").setRequired(true)))
  .addSubcommand(s=>s.setName("upcoming").setDescription("Show upcoming events"));

export async function handleAdmin(i:any){
  if(!(await requireAdmin(i))) return;
  const sub=i.options.getSubcommand(), guildId=i.guildId!;
  if(sub==="upcoming"){
    const events=await db.event.findMany({where:{guildId,startsAt:{gt:new Date()}},orderBy:{startsAt:"asc"},take:10});
    if(!events.length) return i.reply("No upcoming events.");
    return i.reply(events.map(e=>`${e.type} • ${e.team} • <t:${Math.floor(e.startsAt.getTime()/1000)}:F> • closes <t:${Math.floor(e.registrationClosesAt.getTime()/1000)}:R>`).join("\\n"));
  }
  const type=i.options.getString("event") as EventType;
  const channel=i.options.getChannel("channel");
  await db.eventConfig.upsert({
    where:{guildId_eventType:{guildId,eventType:type}},
    update:{morningCron:i.options.getString("morning-cron"),nightCron:i.options.getString("night-cron"),channelId:channel.id},
    create:{guildId,eventType:type,morningCron:i.options.getString("morning-cron"),nightCron:i.options.getString("night-cron"),channelId:channel.id}
  });
  return i.reply({content:`Automatic posting configured for **${type}** in <#${channel.id}>.\\nCron is interpreted in the bot timezone.`,ephemeral:true});
}
