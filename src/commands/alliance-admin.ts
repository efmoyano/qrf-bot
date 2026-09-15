import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";
import { SquadType } from "@prisma/client";
import { db } from "../lib/db.js";
import { requireAdmin } from "../lib/permissions.js";

const ROLE_NAMES = {
    ALLIANCE_ADMIN: "Alliance Admin",
    STORM_ADMIN: "Storm Admin",
} as const;

const SQUAD_ICONS = {
    TANK: "🛡️",
    AIR: "✈️",
    MISSILE: "🚀",
} as const;

const SQUAD_LABELS = {
    TANK: "Tank",
    AIR: "Air",
    MISSILE: "Missile",
} as const;

export const allianceAdminCommand = new SlashCommandBuilder()
    .setName("alliance-admin")
    .setDescription("Alliance administration")

    // ---------------------------------------------------------
    // PLAYER MANAGEMENT
    // ---------------------------------------------------------

    .addSubcommand((s) =>
        s
            .setName("list")
            .setDescription("List all active alliance members"),
    )

    .addSubcommand((s) =>
        s
            .setName("view")
            .setDescription("View a player's profile")
            .addUserOption((o) =>
                o
                    .setName("player")
                    .setDescription("Discord user")
                    .setRequired(true),
            ),
    )

    .addSubcommand((s) =>
        s
            .setName("update")
            .setDescription("Update a player's profile")
            .addUserOption((o) =>
                o
                    .setName("player")
                    .setDescription("Discord user")
                    .setRequired(true),
            )
            .addStringOption((o) =>
                o
                    .setName("name")
                    .setDescription("New in-game name")
                    .setRequired(false),
            )
            .addStringOption((o) =>
                o
                    .setName("squad")
                    .setDescription("Main squad")
                    .setRequired(false)
                    .addChoices(
                        { name: "🛡️ Tank", value: "TANK" },
                        { name: "✈️ Air", value: "AIR" },
                        { name: "🚀 Missile", value: "MISSILE" },
                    ),
            )
            .addStringOption((o) =>
                o
                    .setName("power")
                    .setDescription("Power in millions, e.g. 80m or 90")
                    .setRequired(false),
            ),
    )

    .addSubcommand((s) =>
        s
            .setName("delete")
            .setDescription("Deactivate a player")
            .addUserOption((o) =>
                o
                    .setName("player")
                    .setDescription("Discord user")
                    .setRequired(true),
            ),
    )

    .addSubcommand((s) =>
        s
            .setName("restore")
            .setDescription("Restore a deactivated player")
            .addUserOption((o) =>
                o
                    .setName("player")
                    .setDescription("Discord user")
                    .setRequired(true),
            ),
    )

    .addSubcommand((s) =>
        s
            .setName("count")
            .setDescription("Show alliance member count"),
    )

    // ---------------------------------------------------------
    // ROLE MANAGEMENT
    // ---------------------------------------------------------

    .addSubcommandGroup((group) =>
        group
            .setName("role")
            .setDescription("Manage alliance administration roles")

            .addSubcommand((s) =>
                s
                    .setName("add")
                    .setDescription("Grant an administration role to a user")
                    .addUserOption((o) =>
                        o
                            .setName("user")
                            .setDescription("Discord user")
                            .setRequired(true),
                    )
                    .addStringOption((o) =>
                        o
                            .setName("role")
                            .setDescription("Administration role")
                            .setRequired(true)
                            .addChoices(
                                {
                                    name: "👑 Alliance Admin",
                                    value: "ALLIANCE_ADMIN",
                                },
                                {
                                    name: "⚔️ Storm Admin",
                                    value: "STORM_ADMIN",
                                },
                            ),
                    ),
            )

            .addSubcommand((s) =>
                s
                    .setName("remove")
                    .setDescription("Remove an administration role from a user")
                    .addUserOption((o) =>
                        o
                            .setName("user")
                            .setDescription("Discord user")
                            .setRequired(true),
                    )
                    .addStringOption((o) =>
                        o
                            .setName("role")
                            .setDescription("Administration role")
                            .setRequired(true)
                            .addChoices(
                                {
                                    name: "👑 Alliance Admin",
                                    value: "ALLIANCE_ADMIN",
                                },
                                {
                                    name: "⚔️ Storm Admin",
                                    value: "STORM_ADMIN",
                                },
                            ),
                    ),
            )

            .addSubcommand((s) =>
                s
                    .setName("list")
                    .setDescription("List users with administration roles"),
            ),
    );

function getSquadIcon(squad: SquadType): string {
    return SQUAD_ICONS[squad] ?? "⚔️";
}

function getSquadLabel(squad: SquadType): string {
    return SQUAD_LABELS[squad] ?? squad;
}

function formatPower(power: bigint): string {
    const millions = Number(power) / 1_000_000;

    return `${millions.toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    })}M`;
}

function parsePower(input: string): bigint {
    const match = input.replace(",", ".").match(/\d+(?:\.\d+)?/);

    if (!match) {
        throw new Error("Invalid power");
    }

    const millions = Number(match[0]);

    if (!Number.isFinite(millions) || millions < 0) {
        throw new Error("Invalid power");
    }

    return BigInt(Math.round(millions * 1_000_000));
}

function getRoleName(roleType: string): string | null {
    if (roleType === "ALLIANCE_ADMIN") {
        return ROLE_NAMES.ALLIANCE_ADMIN;
    }

    if (roleType === "STORM_ADMIN") {
        return ROLE_NAMES.STORM_ADMIN;
    }

    return null;
}

async function getOrCreateRole(
    interaction: ChatInputCommandInteraction,
    roleName: string,
) {
    const guild = interaction.guild!;

    let role = guild.roles.cache.find(
        (existingRole) => existingRole.name === roleName,
    );

    if (role) {
        return role;
    }

    role = await guild.roles.create({
        name: roleName,
        reason: "Last War bot administration role",
    });

    return role;
}

async function handleRoleAdd(
    interaction: ChatInputCommandInteraction,
) {
    if (!interaction.guild) return;

    const user = interaction.options.getUser("user", true);
    const roleType = interaction.options.getString("role", true);

    const roleName = getRoleName(roleType);

    if (!roleName) {
        await interaction.reply({
            content: "❌ Invalid administration role.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (
        !interaction.guild.members.me?.permissions.has(
            PermissionFlagsBits.ManageRoles,
        )
    ) {
        await interaction.reply({
            content:
                "❌ I need the **Manage Roles** permission to manage administration roles.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const member = await interaction.guild.members.fetch(user.id);

    const role = await getOrCreateRole(interaction, roleName);

    const botMember = interaction.guild.members.me;

    if (!botMember) {
        await interaction.reply({
            content: "❌ I couldn't determine my own server member.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (role.position >= botMember.roles.highest.position) {
        await interaction.reply({
            content: [
                `❌ I cannot manage **${role.name}**.`,
                "",
                "The role must be **below the bot's highest role** in the Discord role hierarchy.",
            ].join("\n"),
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (member.roles.cache.has(role.id)) {
        await interaction.reply({
            content: `⚠️ ${user} already has the **${role.name}** role.`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await member.roles.add(
        role,
        `Granted by ${interaction.user.tag}`,
    );

    await interaction.reply({
        content: `✅ ${user} has been granted the **${role.name}** role.`,
        flags: MessageFlags.Ephemeral,
    });
}

async function handleRoleRemove(
    interaction: ChatInputCommandInteraction,
) {
    if (!interaction.guild) return;

    const user = interaction.options.getUser("user", true);
    const roleType = interaction.options.getString("role", true);

    const roleName = getRoleName(roleType);

    if (!roleName) {
        await interaction.reply({
            content: "❌ Invalid administration role.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (
        !interaction.guild.members.me?.permissions.has(
            PermissionFlagsBits.ManageRoles,
        )
    ) {
        await interaction.reply({
            content:
                "❌ I need the **Manage Roles** permission to manage administration roles.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const member = await interaction.guild.members.fetch(user.id);

    const role = interaction.guild.roles.cache.find(
        (existingRole) => existingRole.name === roleName,
    );

    if (!role) {
        await interaction.reply({
            content: `⚠️ The **${roleName}** role does not exist.`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!member.roles.cache.has(role.id)) {
        await interaction.reply({
            content: `⚠️ ${user} does not have the **${role.name}** role.`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await member.roles.remove(
        role,
        `Removed by ${interaction.user.tag}`,
    );

    await interaction.reply({
        content: `✅ The **${role.name}** role was removed from ${user}.`,
        flags: MessageFlags.Ephemeral,
    });
}

async function handleRoleList(
    interaction: ChatInputCommandInteraction,
) {
    if (!interaction.guild) return;

    const lines: string[] = [];

    for (const roleName of Object.values(ROLE_NAMES)) {
        const role = interaction.guild.roles.cache.find(
            (existingRole) => existingRole.name === roleName,
        );

        lines.push(`## ${roleName}`);

        if (!role) {
            lines.push("_Role does not exist._");
            lines.push("");
            continue;
        }

        const members = role.members;

        if (members.size === 0) {
            lines.push("_No members._");
        } else {
            lines.push(
                [...members.values()]
                    .map((member) => `• ${member}`)
                    .join("\n"),
            );
        }

        lines.push("");
    }

    const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🔐 Alliance Administration Roles")
        .setDescription(lines.join("\n"))
        .setTimestamp();

    await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
    });
}

async function findPlayer(
    interaction: ChatInputCommandInteraction,
    discordId: string,
) {
    return db.player.findUnique({
        where: {
            guildId_discordId: {
                guildId: interaction.guildId!,
                discordId,
            },
        },
    });
}

export async function handleAllianceAdmin(
    interaction: ChatInputCommandInteraction,
) {
    if (!(await requireAdmin(interaction))) return;

    const guildId = interaction.guildId!;
    const subcommand = interaction.options.getSubcommand();

    // =========================================================
    // ROLE MANAGEMENT
    // =========================================================

    if (interaction.options.getSubcommandGroup() === "role") {
        if (subcommand === "add") {
            await handleRoleAdd(interaction);
            return;
        }

        if (subcommand === "remove") {
            await handleRoleRemove(interaction);
            return;
        }

        if (subcommand === "list") {
            await handleRoleList(interaction);
            return;
        }

        return;
    }

    // =========================================================
    // LIST PLAYERS
    // =========================================================

    if (subcommand === "list") {
        const players = await db.player.findMany({
            where: {
                guildId,
                active: true,
            },
            orderBy: {
                power: "desc",
            },
        });

        if (!players.length) {
            await interaction.reply({
                content: "No active alliance members found.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const lines = players.map((player, index) => {
            const icon = getSquadIcon(player.squadType);

            return [
                `**${index + 1}. ${player.gameName}**`,
                `${icon} ${getSquadLabel(player.squadType)} • 💥 ${formatPower(player.power)}`,
                `<@${player.discordId}>`,
            ].join(" | ");
        });

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("⚔️ Alliance Members")
            .setDescription(lines.join("\n"))
            .setFooter({
                text: `${players.length} active member${players.length === 1 ? "" : "s"}`,
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
        });

        return;
    }

    // =========================================================
    // COUNT
    // =========================================================

    if (subcommand === "count") {
        const [total, tank, air, missile] = await Promise.all([
            db.player.count({
                where: { guildId, active: true },
            }),
            db.player.count({
                where: {
                    guildId,
                    active: true,
                    squadType: SquadType.TANK,
                },
            }),
            db.player.count({
                where: {
                    guildId,
                    active: true,
                    squadType: SquadType.AIR,
                },
            }),
            db.player.count({
                where: {
                    guildId,
                    active: true,
                    squadType: SquadType.MISSILE,
                },
            }),
        ]);

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("📊 Alliance Statistics")
            .setDescription(
                [
                    `👥 **Total:** ${total}`,
                    "",
                    `🛡️ **Tank:** ${tank}`,
                    `✈️ **Air:** ${air}`,
                    `🚀 **Missile:** ${missile}`,
                ].join("\n"),
            )
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
        });

        return;
    }

    // =========================================================
    // VIEW
    // =========================================================

    if (subcommand === "view") {
        const user = interaction.options.getUser("player", true);

        const player = await findPlayer(interaction, user.id);

        if (!player) {
            await interaction.reply({
                content: `❌ No profile found for ${user}.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const icon = getSquadIcon(player.squadType);

        const embed = new EmbedBuilder()
            .setColor(player.active ? 0x57f287 : 0x747f8d)
            .setTitle(`${icon} ${player.gameName}`)
            .setDescription(
                [
                    `👤 Discord: ${user}`,
                    `${icon} Squad: **${getSquadLabel(player.squadType)}**`,
                    `💥 Power: **${formatPower(player.power)}**`,
                    "",
                    `📌 Status: **${player.active ? "Active" : "Inactive"}**`,
                ].join("\n"),
            )
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .setFooter({
                text: "Alliance Administration",
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
        });

        return;
    }

    // =========================================================
    // UPDATE
    // =========================================================

    if (subcommand === "update") {
        const user = interaction.options.getUser("player", true);

        const player = await findPlayer(interaction, user.id);

        if (!player) {
            await interaction.reply({
                content: `❌ No profile found for ${user}.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const name = interaction.options.getString("name");
        const squad = interaction.options.getString("squad") as SquadType | null;
        const powerInput = interaction.options.getString("power");

        if (!name && !squad && !powerInput) {
            await interaction.reply({
                content:
                    "❌ Provide at least one field to update: `name`, `squad`, or `power`.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        let power: bigint | undefined;

        if (powerInput) {
            try {
                power = parsePower(powerInput);
            } catch {
                await interaction.reply({
                    content:
                        "❌ Invalid power. Use something like `80m`, `90mill`, `90millones`, or simply `90`.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
        }

        const updated = await db.player.update({
            where: {
                id: player.id,
            },
            data: {
                ...(name ? { gameName: name.trim() } : {}),
                ...(squad ? { squadType: squad } : {}),
                ...(power !== undefined ? { power } : {}),
            },
        });

        const icon = getSquadIcon(updated.squadType);

        const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("✅ Player Updated")
            .setDescription(
                [
                    `**${updated.gameName}**`,
                    "",
                    `${icon} Squad: **${getSquadLabel(updated.squadType)}**`,
                    `💥 Power: **${formatPower(updated.power)}**`,
                    "",
                    `👤 Discord: ${user}`,
                ].join("\n"),
            )
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
        });

        return;
    }

    // =========================================================
    // DELETE
    // =========================================================

    if (subcommand === "delete") {
        const user = interaction.options.getUser("player", true);

        const player = await findPlayer(interaction, user.id);

        if (!player) {
            await interaction.reply({
                content: `❌ No profile found for ${user}.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (!player.active) {
            await interaction.reply({
                content: `⚠️ **${player.gameName}** is already inactive.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await db.player.update({
            where: {
                id: player.id,
            },
            data: {
                active: false,
            },
        });

        await interaction.reply({
            content:
                `🗑️ **${player.gameName}** has been deactivated.\n\n` +
                `Their Storm history and registrations were preserved.\n` +
                `Use \`/alliance-admin restore\` to reactivate them.`,
            flags: MessageFlags.Ephemeral,
        });

        return;
    }

    // =========================================================
    // RESTORE
    // =========================================================

    if (subcommand === "restore") {
        const user = interaction.options.getUser("player", true);

        const player = await findPlayer(interaction, user.id);

        if (!player) {
            await interaction.reply({
                content: `❌ No profile found for ${user}.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (player.active) {
            await interaction.reply({
                content: `⚠️ **${player.gameName}** is already active.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await db.player.update({
            where: {
                id: player.id,
            },
            data: {
                active: true,
            },
        });

        await interaction.reply({
            content: `♻️ **${player.gameName}** has been restored.`,
            flags: MessageFlags.Ephemeral,
        });

        return;
    }
}