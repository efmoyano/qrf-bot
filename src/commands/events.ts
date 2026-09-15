import { EventType, Team } from "@prisma/client";
import { SlashCommandBuilder } from "discord.js";
import { db } from "../lib/db.js";
import { formatPower } from "../lib/format.js";
import { eventLabel, teamLabel } from "../lib/events.js";
import { requireAdmin } from "../lib/permissions.js";

export const eventsCommand = new SlashCommandBuilder()
  .setName("storm")
  .setDescription("Desert/Canyon Storm commands")
  .addSubcommand(s => s.setName("register").setDescription("Register for a Storm event")
    .addStringOption(o=>o.setName("event").setDescription("Event").setRequired(true).addChoices(
      {name:"Desert Storm Battlefield",value:"DESERT_STORM"},
      {name:"Canyon Storm Battlefield",value:"CANYON_STORM"}))
    .addStringOption(o=>o.setName("team").setDescription("Team").setRequired(true).addChoices(
      {name:"Morning",value:"MORNING"},{name:"Night",value:"NIGHT"})))
  .addSubcommand(s => s.setName("list").setDescription("List registered players")
    .addStringOption(o=>o.setName("event").setDescription("Event").setRequired(true).addChoices(
      {name:"Desert Storm Battlefield",value:"DESERT_STORM"},{name:"Canyon Storm Battlefield",value:"CANYON_STORM"}))
    .addStringOption(o=>o.setName("team").setDescription("Team").setRequired(true).addChoices(
      {name:"Morning",value:"MORNING"},{name:"Night",value:"NIGHT"})))
  .addSubcommand(s => s.setName("unregister").setDescription("Remove yourself from an event")
    .addStringOption(o=>o.setName("event").setDescription("Event").setRequired(true).addChoices(
      {name:"Desert Storm Battlefield",value:"DESERT_STORM"},{name:"Canyon Storm Battlefield",value:"CANYON_STORM"}))
    .addStringOption(o=>o.setName("team").setDescription("Team").setRequired(true).addChoices(
      {name:"Morning",value:"MORNING"},{name:"Night",value:"NIGHT"})))
  .addSubcommand(s => s.setName("create").setDescription("Create an event manually")
    .addStringOption(o=>o.setName("event").setDescription("Event").setRequired(true).addChoices(
      {name:"Desert Storm Battlefield",value:"DESERT_STORM"},{name:"Canyon Storm Battlefield",value:"CANYON_STORM"}))
    .addStringOption(o=>o.setName("team").setDescription("Team").setRequired(true).addChoices(
      {name:"Morning",value:"MORNING"},{name:"Night",value:"NIGHT"}))
    .addStringOption(o=>o.setName("start").setDescription("ISO date/time, e.g. 2026-09-20T20:00:00").setRequired(true))
    .addStringOption(o=>o.setName("close").setDescription("ISO date/time when registration closes").setRequired(true)));

export async function handleStorm(i:any) {
  const sub=i.options.getSubcommand(), guildId=i.guildId!;
  const type=i.options.getString("event") as EventType;
  const team=i.options.getString("team") as Team;

  if(sub==="create"){
    if(!(await requireAdmin(i))) return;
    const start=new Date(i.options.getString("start"));
    const close=new Date(i.options.getString("close"));
    if(isNaN(start.getTime())||isNaN(close.getTime())||close>=start) return i.reply({content:"Invalid dates. Close must be before start.",ephemeral:true});
    const e=await db.event.create({data:{guildId,type,team,startsAt:start,registrationClosesAt:close,channelId:i.channelId}});
    return i.reply(`Created **${eventLabel(type)} - ${teamLabel(team)}**\\nStart: <t:${Math.floor(start.getTime()/1000)}:F>\\nRegistration closes: <t:${Math.floor(close.getTime()/1000)}:F>\\nID: \`${e.id}\``);
  }

  const event=await db.event.findFirst({where:{guildId,type,team,startsAt:{gt:new Date()}},orderBy:{startsAt:"asc"}});
  if(!event) return i.reply({content:"No upcoming event found for that event/team.",ephemeral:true});

  if(sub==="register"){
    const p=await db.player.findUnique({where:{guildId_discordId:{guildId,discordId:i.user.id}}});
    if(!p) return i.reply({content:"Create your profile first with `/profile register`.",ephemeral:true});
    if(new Date()>=event.registrationClosesAt) return i.reply({content:"Registration is closed.",ephemeral:true});
    await db.registration.upsert({where:{eventId_playerId:{eventId:event.id,playerId:p.id}},update:{powerSnapshot:p.power,squadSnapshot:p.squadType},create:{eventId:event.id,playerId:p.id,powerSnapshot:p.power,squadSnapshot:p.squadType}});
    return i.reply({content:`Registered for **${eventLabel(type)} - ${teamLabel(team)}**\\nTime: <t:${Math.floor(event.startsAt.getTime()/1000)}:F>\\nPower snapshot: **${formatPower(p.power)}**`,ephemeral:true});
  }

  if(sub==="unregister"){
    const p=await db.player.findUnique({where:{guildId_discordId:{guildId,discordId:i.user.id}}});
    if(!p) return i.reply({content:"Profile not found.",ephemeral:true});
    await db.registration.deleteMany({where:{eventId:event.id,playerId:p.id}});
    return i.reply({content:"You have been removed from the event.",ephemeral:true});
  }

  const rows=await db.registration.findMany({where:{eventId:event.id},include:{player:true},orderBy:{powerSnapshot:"desc"}});
  if(!rows.length) return i.reply(`**${eventLabel(type)} - ${teamLabel(team)}**\\nNo registrations yet.`);
  const body=rows.map((r,n)=>`${n+1}. **${r.player.gameName}** • ${r.squadSnapshot} • ${formatPower(r.powerSnapshot)}`).join("\\n");
  return i.reply(`**${eventLabel(type)} - ${teamLabel(team)}**\\nTime: <t:${Math.floor(event.startsAt.getTime()/1000)}:F>\\n\\n${body}`);
}
