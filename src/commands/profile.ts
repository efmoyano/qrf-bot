import { SlashCommandBuilder } from "discord.js";
import { SquadType } from "@prisma/client";
import { db } from "../lib/db.js";
import { parsePower, formatPower } from "../lib/format.js";

export const profileCommand = new SlashCommandBuilder()
  .setName("profile")
  .setDescription("Manage your Last War player profile")
  .addSubcommand(s => s.setName("register").setDescription("Register or create your profile")
    .addStringOption(o => o.setName("name").setDescription("In-game name").setRequired(true))
    .addStringOption(o => o.setName("squad").setDescription("Main squad type").setRequired(true)
      .addChoices({name:"Tank",value:"TANK"},{name:"Air",value:"AIR"},{name:"Missile",value:"MISSILE"}))
    .addStringOption(o => o.setName("power").setDescription("Squad power, e.g. 82.4M").setRequired(true)))
  .addSubcommand(s => s.setName("update").setDescription("Update your profile")
    .addStringOption(o => o.setName("name").setDescription("In-game name").setRequired(false))
    .addStringOption(o => o.setName("squad").setDescription("Main squad type").setRequired(false)
      .addChoices({name:"Tank",value:"TANK"},{name:"Air",value:"AIR"},{name:"Missile",value:"MISSILE"}))
    .addStringOption(o => o.setName("power").setDescription("Squad power, e.g. 82.4M").setRequired(false)))
  .addSubcommand(s => s.setName("me").setDescription("Show your profile"));

export async function handleProfile(i: any) {
  const sub = i.options.getSubcommand();
  const guildId = i.guildId!;
  const discordId = i.user.id;

  if (sub === "me") {
    const p = await db.player.findUnique({ where: { guildId_discordId: { guildId, discordId } } });
    if (!p) return i.reply({content:"You are not registered yet. Use `/profile register`.", ephemeral:true});
    return i.reply({content:`**${p.gameName}**\\nSquad: ${p.squadType}\\nPower: **${formatPower(p.power)}**`, ephemeral:true});
  }

  const name = i.options.getString("name");
  const squad = i.options.getString("squad") as SquadType | null;
  const powerRaw = i.options.getString("power");
  const current = await db.player.findUnique({ where: { guildId_discordId: { guildId, discordId } } });

  try {
    const power = powerRaw ? parsePower(powerRaw) : undefined;
    if (sub === "register" && (!name || !squad || power === undefined)) throw new Error("Name, squad and power are required.");
    const p = current
      ? await db.player.update({where:{id:current.id}, data:{gameName:name ?? current.gameName, squadType:squad ?? current.squadType, power:power ?? current.power}})
      : await db.player.create({data:{guildId,discordId,gameName:name!,squadType:squad!,power:power!}});
    return i.reply({content:`Profile saved: **${p.gameName}** | ${p.squadType} | **${formatPower(p.power)}**`, ephemeral:true});
  } catch (e: any) {
    return i.reply({content:`Could not save profile: ${e.message}`, ephemeral:true});
  }
}
