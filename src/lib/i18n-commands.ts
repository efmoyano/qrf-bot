import { EmbedBuilder } from "discord.js";
import { Player, PlayerTag, SquadType } from "@prisma/client";
import { db } from "./db.js";
import { formatPower } from "./format.js";
import {
  detectLanguage,
  getLanguageMeta,
  getLocalizedSquadName,
  isValidLanguage,
  SupportedLanguage,
} from "./i18n.js";

export async function getUserLanguage(
  guildId?: string | null,
  discordId?: string | null,
  locale?: string | null,
): Promise<SupportedLanguage> {
  if (guildId && discordId) {
    const player = await db.player.findUnique({
      where: { guildId_discordId: { guildId, discordId } },
      select: { language: true },
    });
    if (player?.language && isValidLanguage(player.language)) {
      return player.language as SupportedLanguage;
    }
  }
  return detectLanguage(locale);
}

// ---------------------------------------------------------------------------
// LOCALIZED TAG LABELS
// ---------------------------------------------------------------------------

export const TAG_TRANSLATIONS: Record<SupportedLanguage, Record<PlayerTag, string>> = {
  en: { STAR: "Star Priority ⭐", BLUE: "Blue Priority 🔵", WHITE: "Standard ⚪", RED: "Red Penalty 🔴" },
  es: { STAR: "Prioridad Estrella ⭐", BLUE: "Prioridad Azul 🔵", WHITE: "Estándar ⚪", RED: "Penalidad Roja 🔴" },
  pt: { STAR: "Prioridade Estrela ⭐", BLUE: "Prioridade Azul 🔵", WHITE: "Padrão ⚪", RED: "Penalidade Vermelha 🔴" },
  fr: { STAR: "Priorité Étoile ⭐", BLUE: "Priorité Bleue 🔵", WHITE: "Standard ⚪", RED: "Pénalité Rouge 🔴" },
  de: { STAR: "Stern-Priorität ⭐", BLUE: "Blaue Priorität 🔵", WHITE: "Standard ⚪", RED: "Rote Strafe 🔴" },
  ru: { STAR: "Звездный Приоритет ⭐", BLUE: "Синий Приоритет 🔵", WHITE: "Стандарт ⚪", RED: "Красный Штраф 🔴" },
  ko: { STAR: "스타 우선 ⭐", BLUE: "블루 우선 🔵", WHITE: "일반 ⚪", RED: "레드 페널티 🔴" },
  ja: { STAR: "スター優先 ⭐", BLUE: "青色優先 🔵", WHITE: "標準 ⚪", RED: "赤色ペナルティ 🔴" },
};

export function getLocalizedTagLabel(tag: PlayerTag, lang: SupportedLanguage): string {
  const dict = TAG_TRANSLATIONS[lang] || TAG_TRANSLATIONS.en;
  return dict[tag] || tag;
}

// ---------------------------------------------------------------------------
// PROFILE ME LOCALIZATION
// ---------------------------------------------------------------------------

export interface ProfileCardParams {
  player: Player;
  discordUserMention: string;
  avatarUrl?: string | null;
}

const PROFILE_HEADERS: Record<
  SupportedLanguage,
  {
    squadSuffix: string;
    powerSuffix: string;
    header: string;
    discordLabel: string;
    mainSquadLabel: string;
    powerLabel: string;
    langLabel: string;
    tagLabel: string;
    statsLabel: (attended: number, noShows: number) => string;
    footer: string;
  }
> = {
  en: {
    squadSuffix: "Squad",
    powerSuffix: "Power",
    header: "⚔️ **PLAYER PROFILE**",
    discordLabel: "👤 Discord",
    mainSquadLabel: "Main Squad",
    powerLabel: "Power",
    langLabel: "Language",
    tagLabel: "Priority Tag",
    statsLabel: (att, ns) => `📊 Battles Attended: **${att}** • No-Shows: **${ns}**`,
    footer: "Last War • Player Profile",
  },
  es: {
    squadSuffix: "Escuadrón",
    powerSuffix: "Poder",
    header: "⚔️ **PERFIL DE JUGADOR**",
    discordLabel: "👤 Discord",
    mainSquadLabel: "Escuadrón Principal",
    powerLabel: "Poder",
    langLabel: "Idioma",
    tagLabel: "Etiqueta de Prioridad",
    statsLabel: (att, ns) => `📊 Batallas Asistidas: **${att}** • Ausencias: **${ns}**`,
    footer: "Last War • Perfil de Jugador",
  },
  pt: {
    squadSuffix: "Esquadrão",
    powerSuffix: "Poder",
    header: "⚔️ **PERFIL DE JOGADOR**",
    discordLabel: "👤 Discord",
    mainSquadLabel: "Esquadrão Principal",
    powerLabel: "Poder",
    langLabel: "Idioma",
    tagLabel: "Tag de Prioridade",
    statsLabel: (att, ns) => `📊 Partidas Jogadas: **${att}** • Faltas: **${ns}**`,
    footer: "Last War • Perfil de Jogador",
  },
  fr: {
    squadSuffix: "Escouade",
    powerSuffix: "Puissance",
    header: "⚔️ **PROFIL DE JOUEUR**",
    discordLabel: "👤 Discord",
    mainSquadLabel: "Escouade Principale",
    powerLabel: "Puissance",
    langLabel: "Langue",
    tagLabel: "Tag de Priorité",
    statsLabel: (att, ns) => `📊 Batailles Participées : **${att}** • Absences : **${ns}**`,
    footer: "Last War • Profil de Joueur",
  },
  de: {
    squadSuffix: "Trupp",
    powerSuffix: "Kraft",
    header: "⚔️ **SPIELERPROFIL**",
    discordLabel: "👤 Discord",
    mainSquadLabel: "Haupttrupp",
    powerLabel: "Kampfkraft",
    langLabel: "Sprache",
    tagLabel: "Prioritäts-Tag",
    statsLabel: (att, ns) => `📊 Schlachten teilgenommen: **${att}** • Fehlzeiten: **${ns}**`,
    footer: "Last War • Spielerprofil",
  },
  ru: {
    squadSuffix: "Отряд",
    powerSuffix: "Сила",
    header: "⚔️ **ПРОФИЛЬ ИГРОКА**",
    discordLabel: "👤 Discord",
    mainSquadLabel: "Основной Отряд",
    powerLabel: "Боевая Мощь",
    langLabel: "Язык",
    tagLabel: "Тег Приоритета",
    statsLabel: (att, ns) => `📊 Сыграно битв: **${att}** • Пропусков: **${ns}**`,
    footer: "Last War • Профиль Игрока",
  },
  ko: {
    squadSuffix: "스쿼드",
    powerSuffix: "전투력",
    header: "⚔️ **플레이어 프로필**",
    discordLabel: "👤 디스코드",
    mainSquadLabel: "주력 스쿼드",
    powerLabel: "전투력",
    langLabel: "언어 설정",
    tagLabel: "우선 선발 태그",
    statsLabel: (att, ns) => `📊 출전 횟수: **${att}회** • 불참(No-Show): **${ns}회**`,
    footer: "Last War • 플레이어 프로필",
  },
  ja: {
    squadSuffix: "部隊",
    powerSuffix: "戦力",
    header: "⚔️ **プレイヤープロフィール**",
    discordLabel: "👤 Discord",
    mainSquadLabel: "メイン部隊",
    powerLabel: "戦力",
    langLabel: "言語設定",
    tagLabel: "優先タグ",
    statsLabel: (att, ns) => `📊 出場戦闘数: **${att}回** • 欠席: **${ns}回**`,
    footer: "Last War • プレイヤープロフィール",
  },
};

function getSquadColor(squadType: SquadType): number {
  switch (squadType) {
    case "TANK":
      return 0x4caf50;
    case "AIR":
      return 0x42a5f5;
    case "MISSILE":
      return 0xf44336;
    default:
      return 0x5865f2;
  }
}

export function buildLocalizedProfileCard(
  params: ProfileCardParams,
  lang: SupportedLanguage,
): EmbedBuilder {
  const { player, discordUserMention, avatarUrl } = params;
  const h = PROFILE_HEADERS[lang] || PROFILE_HEADERS.en;
  const squadName = getLocalizedSquadName(player.squadType, lang);
  const langMeta = getLanguageMeta(player.language);
  const tagLabel = getLocalizedTagLabel(player.tag, lang);

  const embed = new EmbedBuilder()
    .setColor(getSquadColor(player.squadType))
    .setTitle(`${squadName} — ${player.gameName}`)
    .setDescription(
      [
        `### ${squadName} ${h.squadSuffix}`,
        "",
        `💥 **${formatPower(player.power)} ${h.powerSuffix}**`,
        "",
        h.header,
        "",
        `${h.discordLabel}: ${discordUserMention}`,
        `⚔️ ${h.mainSquadLabel}: **${squadName}**`,
        `💪 ${h.powerLabel}: **${formatPower(player.power)}**`,
        `🌐 ${h.langLabel}: **${langMeta.flag} ${langMeta.nativeName}**`,
        `🏷️ ${h.tagLabel}: **${tagLabel}**`,
        h.statsLabel(player.attendanceCount, player.noShowCount),
      ].join("\n"),
    )
    .setFooter({ text: h.footer })
    .setTimestamp();

  if (avatarUrl) {
    embed.setThumbnail(avatarUrl);
  }

  return embed;
}

// ---------------------------------------------------------------------------
// LOCALIZED HELP EMBED
// ---------------------------------------------------------------------------

interface HelpField {
  name: string;
  value: string;
}

interface HelpLocaleStrings {
  title: string;
  subtitle: string;
  description: string;
  tip: string;
  playerTitle: string;
  playerCommands: string[];
  eventTitle: string;
  eventCommands: string[];
  adminEventTitle: string;
  adminEventCommands: string[];
  adminLineupTitle: string;
  adminLineupCommands: string[];
  adminAttendanceTitle: string;
  adminAttendanceCommands: string[];
  adminMemberTitle: string;
  adminMemberCommands: string[];
  adminRoleTitle: string;
  adminRoleCommands: string[];
  footerAdmin: string;
  footerMember: string;
}

const HELP_STRINGS: Record<SupportedLanguage, HelpLocaleStrings> = {
  en: {
    title: "📖 Last War Bot — Commands Guide",
    subtitle: "*Made with ❤️ by QRF alliance*",
    description: "Here are all available commands you have permission to use.",
    tip: "> 💡 **Tip:** When entering power, you can write `80m`, `90mill`, `95.5`, or `82.4M`.",
    playerTitle: "👤 Player Profile & Settings (`/profile`, `/language`)",
    playerCommands: [
      "`/profile register` — Create your profile with in-game name, main squad, power, and language",
      "`/profile update` — Update your in-game name, main squad, power, or language",
      "`/profile me` — View your profile card, priority tag, language, and battle stats",
      "`/language` — Change your notification language (🇬🇧, 🇪🇸, 🇧🇷, 🇫🇷, 🇩🇪, 🇷🇺, 🇰🇷, 🇯🇵)",
    ],
    eventTitle: "⚔️ Battlefield Events (`/event`)",
    eventCommands: [
      "`/event register` — Sign up for Desert Storm or Canyon Storm (Team A / Team B)",
      "`/event unregister` — Remove your registration from an upcoming event",
      "`/event list` — View all registered players ranked by squad power",
    ],
    adminEventTitle: "📢 Event Setup & Broadcast (`/admin event`)",
    adminEventCommands: [
      "`/admin event config` — Set automated announcement cron, channel, and registration close duration",
      "`/admin event announce` — Immediately post announcement embed (supports custom close-hours)",
      "`/admin event upcoming` — List upcoming scheduled battlefield events",
      "`/admin event create` — Manually create an event with custom start/close times",
    ],
    adminLineupTitle: "🛡️ Lineup Selection (`/admin lineup`)",
    adminLineupCommands: [
      "`/admin lineup wizard` — Interactive UI with checkboxes to select Main starters & Subs in 1 click",
      "`/admin lineup auto` — Auto-select 20 Main & 10 Subs by priority tags & power",
      "`/admin lineup view` — Inspect the current Main, Substitute, and Standby rosters",
      "`/admin lineup set` — Manually assign/move a player (Main, Substitute, Standby)",
      "`/admin lineup publish` — Broadcast official lineup embed to the event channel",
    ],
    adminAttendanceTitle: "📊 Attendance & Priority (`/admin attendance`)",
    adminAttendanceCommands: [
      "`/admin attendance wizard` — Interactive UI with checkboxes to easily flag No-Shows & finalize match",
      "`/admin attendance mark` — Record a player as Attended or No-Show (penalizes with Red tag)",
      "`/admin attendance finalize` — Finalize match: awards Blue priority tags to benched players",
    ],
    adminMemberTitle: "👥 Member Roster & Tags (`/admin member`)",
    adminMemberCommands: [
      "`/admin member list` — List all active alliance members ranked by power",
      "`/admin member view` — View a member's profile, priority tag, and attendance stats",
      "`/admin member tag` — Assign priority tier tag (⭐ Star, 🔵 Blue, ⚪ White, 🔴 Red)",
      "`/admin member update` — Update a member's in-game name, squad, or power",
      "`/admin member delete` — Deactivate a member from the active roster",
      "`/admin member restore` — Restore a deactivated member",
      "`/admin member count` — Show alliance roster statistics and squad breakdown",
    ],
    adminRoleTitle: "🔐 Admin Roles & Permissions (`/admin role`)",
    adminRoleCommands: [
      "`/admin role add` — Grant Alliance Admin or Event Admin role to a user",
      "`/admin role remove` — Remove an administration role from a user",
      "`/admin role list` — View all users holding administrative roles",
    ],
    footerAdmin: "Viewing all commands (Admin Access) • Made with ❤️ by QRF alliance",
    footerMember: "Viewing member commands • Made with ❤️ by QRF alliance",
  },
  es: {
    title: "📖 Bot Last War — Guía de Comandos",
    subtitle: "*Creado con ❤️ por la alianza QRF*",
    description: "Aquí están todos los comandos disponibles que tienes permiso de usar.",
    tip: "> 💡 **Consejo:** Al ingresar tu poder, puedes escribir `80m`, `90mill`, `95.5` o `82.4M`.",
    playerTitle: "👤 Perfil de Jugador y Ajustes (`/profile`, `/language`)",
    playerCommands: [
      "`/profile register` — Crea tu perfil con nombre de juego, escuadrón principal, poder e idioma",
      "`/profile update` — Actualiza tu nombre, escuadrón principal, poder o idioma",
      "`/profile me` — Consulta tu tarjeta de perfil, etiqueta de prioridad, idioma y estadísticas",
      "`/language` — Cambia tu idioma de notificaciones (🇬🇧, 🇪🇸, 🇧🇷, 🇫🇷, 🇩🇪, 🇷🇺, 🇰🇷, 🇯🇵)",
    ],
    eventTitle: "⚔️ Eventos del Campo de Batalla (`/event`)",
    eventCommands: [
      "`/event register` — Inscríbete en Tormenta del Desierto o Cañón (Equipo A / Equipo B)",
      "`/event unregister` — Cancela tu inscripción de un próximo evento",
      "`/event list` — Mira todos los jugadores inscritos ordenados por poder de escuadrón",
    ],
    adminEventTitle: "📢 Configuración y Anuncios (`/admin event`)",
    adminEventCommands: [
      "`/admin event config` — Configura anuncios automáticos, canal y cierre de inscripción",
      "`/admin event announce` — Publica inmediatamente el anuncio oficial del evento",
      "`/admin event upcoming` — Lista los eventos programados próximamente",
      "`/admin event create` — Crea manualmente un evento con fechas personalizadas",
    ],
    adminLineupTitle: "🛡️ Selección de Alineación (`/admin lineup`)",
    adminLineupCommands: [
      "`/admin lineup wizard` — Asistente interactivo con casillas para elegir titulares y suplentes en 1 clic",
      "`/admin lineup auto` — Auto-selecciona 20 Titulares y 10 Suplentes por prioridad y poder",
      "`/admin lineup view` — Inspecciona la alineación (Titulares, Suplentes y Reserva)",
      "`/admin lineup set` — Asigna o mueve manualmente a un jugador de rol",
      "`/admin lineup publish` — Publica la alineación oficial en el canal del equipo",
    ],
    adminAttendanceTitle: "📊 Asistencia y Prioridad (`/admin attendance`)",
    adminAttendanceCommands: [
      "`/admin attendance wizard` — Asistente interactivo para marcar ausencias y finalizar el partido",
      "`/admin attendance mark` — Registra a un jugador como Asistió o Ausente (aplica etiqueta roja)",
      "`/admin attendance finalize` — Finaliza el partido: otorga etiqueta Azul de prioridad a suplentes",
    ],
    adminMemberTitle: "👥 Lista de Miembros y Etiquetas (`/admin member`)",
    adminMemberCommands: [
      "`/admin member list` — Lista de miembros activos ordenados por poder",
      "`/admin member view` — Ver tarjeta, etiqueta de prioridad y estadísticas de un miembro",
      "`/admin member tag` — Asignar etiqueta de prioridad (⭐ Estrella, 🔵 Azul, ⚪ Blanca, 🔴 Roja)",
      "`/admin member update` — Modificar nombre, escuadrón o poder de un miembro",
      "`/admin member delete` — Desactivar a un miembro del registro activo",
      "`/admin member restore` — Restaurar a un miembro desactivado",
      "`/admin member count` — Estadísticas del registro de miembros y desglose de tropas",
    ],
    adminRoleTitle: "🔐 Roles y Permisos de Administración (`/admin role`)",
    adminRoleCommands: [
      "`/admin role add` — Asignar rol de Administrador de Alianza o de Eventos",
      "`/admin role remove` — Quitar rol administrativo a un usuario",
      "`/admin role list` — Ver todos los usuarios con roles administrativos",
    ],
    footerAdmin: "Mostrando todos los comandos (Acceso de Administrador) • Creado con ❤️ por la alianza QRF",
    footerMember: "Mostrando comandos de miembro • Creado con ❤️ por la alianza QRF",
  },
  pt: {
    title: "📖 Bot Last War — Guia de Comandos",
    subtitle: "*Criado com ❤️ pela aliança QRF*",
    description: "Aqui estão todos os comandos disponíveis que você tem permissão para usar.",
    tip: "> 💡 **Dica:** Ao inserir o poder, você pode digitar `80m`, `90mill`, `95.5` ou `82.4M`.",
    playerTitle: "👤 Perfil de Jogador e Ajustes (`/profile`, `/language`)",
    playerCommands: [
      "`/profile register` — Crie seu perfil com nome no jogo, esquadrão principal, poder e idioma",
      "`/profile update` — Atualize seu nome, esquadrão principal, poder ou idioma",
      "`/profile me` — Veja seu cartão de perfil, tag de prioridade, idioma e estatísticas",
      "`/language` — Altere seu idioma de notificações (🇬🇧, 🇪🇸, 🇧🇷, 🇫🇷, 🇩🇪, 🇷🇺, 🇰🇷, 🇯🇵)",
    ],
    eventTitle: "⚔️ Eventos do Campo de Batalha (`/event`)",
    eventCommands: [
      "`/event register` — Inscreva-se na Tempestade do Deserto ou Canyon (Time A / Time B)",
      "`/event unregister` — Cancele sua inscrição de um evento próximo",
      "`/event list` — Veja todos os jogadores inscritos ordenados por poder",
    ],
    adminEventTitle: "📢 Configuração e Anúncios (`/admin event`)",
    adminEventCommands: [
      "`/admin event config` — Configure anúncios automáticos, canal e tempo de encerramento",
      "`/admin event announce` — Publique imediatamente o anúncio do evento",
      "`/admin event upcoming` — Liste os próximos eventos agendados",
      "`/admin event create` — Crie manualmente um evento com horários personalizados",
    ],
    adminLineupTitle: "🛡️ Seleção de Escalação (`/admin lineup`)",
    adminLineupCommands: [
      "`/admin lineup wizard` — Assistente interativo para selecionar titulares e reservas em 1 clique",
      "`/admin lineup auto` — Seleciona automaticamente 20 Titulares e 10 Reservas por prioridade e poder",
      "`/admin lineup view` — Inspecione a escalação (Titulares, Reservas e Espera)",
      "`/admin lineup set` — Atribua ou altere manualmente a função de um jogador",
      "`/admin lineup publish` — Publique a escalação oficial no canal da equipe",
    ],
    adminAttendanceTitle: "📊 Presença e Prioridade (`/admin attendance`)",
    adminAttendanceCommands: [
      "`/admin attendance wizard` — Assistente interativo para registrar faltas e finalizar a partida",
      "`/admin attendance mark` — Registre um jogador como Presente ou Falta (aplica tag vermelha)",
      "`/admin attendance finalize` — Finalize a partida: concede tag Azul de prioridade aos reservas",
    ],
    adminMemberTitle: "👥 Lista de Membros e Tags (`/admin member`)",
    adminMemberCommands: [
      "`/admin member list` — Lista de membros ativos organizados por poder",
      "`/admin member view` — Veja perfil, tag de prioridade e presença de um membro",
      "`/admin member tag` — Atribua tag de prioridade (⭐ Estrela, 🔵 Azul, ⚪ Branca, 🔴 Vermelha)",
      "`/admin member update` — Atualize nome, esquadrão ou poder de um membro",
      "`/admin member delete` — Desative um membro da lista ativa",
      "`/admin member restore` — Restaure um membro desativado",
      "`/admin member count` — Estatísticas dos membros e distribuição de esquadrões",
    ],
    adminRoleTitle: "🔐 Funções e Permissões Administrativas (`/admin role`)",
    adminRoleCommands: [
      "`/admin role add` — Conceda cargo de Administrador da Aliança ou de Eventos",
      "`/admin role remove` — Remova o cargo administrativo de um usuário",
      "`/admin role list` — Veja todos os usuários com cargos administrativos",
    ],
    footerAdmin: "Exibindo todos os comandos (Acesso de Administrador) • Criado com ❤️ pela aliança QRF",
    footerMember: "Exibindo comandos de membro • Criado com ❤️ pela aliança QRF",
  },
  fr: {
    title: "📖 Bot Last War — Guide des Commandes",
    subtitle: "*Créé avec ❤️ par l'alliance QRF*",
    description: "Voici toutes les commandes disponibles que vous êtes autorisé à utiliser.",
    tip: "> 💡 **Astuce :** Pour saisir la puissance, écrivez `80m`, `90mill`, `95.5` ou `82.4M`.",
    playerTitle: "👤 Profil de Joueur & Paramètres (`/profile`, `/language`)",
    playerCommands: [
      "`/profile register` — Créez votre profil avec pseudo, escouade, puissance et langue",
      "`/profile update` — Modifiez votre pseudo, escouade, puissance ou langue",
      "`/profile me` — Affichez votre carte de profil, tag de priorité, langue et stats",
      "`/language` — Modifiez votre langue de notifications (🇬🇧, 🇪🇸, 🇧🇷, 🇫🇷, 🇩🇪, 🇷🇺, 🇰🇷, 🇯🇵)",
    ],
    eventTitle: "⚔️ Événements de Combat (`/event`)",
    eventCommands: [
      "`/event register` — Inscrivez-vous pour Tempête du Désert ou Canyon (Équipe A / Équipe B)",
      "`/event unregister` — Retirez votre inscription d'un événement à venir",
      "`/event list` — Affichez les joueurs inscrits classés par puissance",
    ],
    adminEventTitle: "📢 Configuration & Annonces (`/admin event`)",
    adminEventCommands: [
      "`/admin event config` — Définir le salon, le cron d'annonce et le délai d'inscription",
      "`/admin event announce` — Publier immédiatement l'annonce officielle",
      "`/admin event upcoming` — Liste des événements programmés",
      "`/admin event create` — Créer manuellement un événement avec dates personnalisées",
    ],
    adminLineupTitle: "🛡️ Sélection de l'Équipe (`/admin lineup`)",
    adminLineupCommands: [
      "`/admin lineup wizard` — Assistant interactif pour sélectionner titulaires et remplaçants en 1 clic",
      "`/admin lineup auto` — Sélection auto de 20 Titulaires & 10 Remplaçants par priorité et force",
      "`/admin lineup view` — Inspecter la formation (Titulaires, Remplaçants et Réserve)",
      "`/admin lineup set` — Assigner ou déplacer manuellement un joueur",
      "`/admin lineup publish` — Diffuser la composition officielle dans le salon de l'équipe",
    ],
    adminAttendanceTitle: "📊 Présence & Priorité (`/admin attendance`)",
    adminAttendanceCommands: [
      "`/admin attendance wizard` — Assistant interactif pour marquer les absences et clore le match",
      "`/admin attendance mark` — Marquer Présent ou Absent (pénalise avec le tag Rouge)",
      "`/admin attendance finalize` — Clore le match : attribue le tag Bleu de priorité aux réservistes",
    ],
    adminMemberTitle: "👥 Registre des Membres & Tags (`/admin member`)",
    adminMemberCommands: [
      "`/admin member list` — Liste des membres actifs classés par puissance",
      "`/admin member view` — Voir la fiche, le tag de priorité et la présence d'un membre",
      "`/admin member tag` — Assigner un tag de priorité (⭐ Étoile, 🔵 Bleu, ⚪ Blanc, 🔴 Rouge)",
      "`/admin member update` — Mettre à jour le nom, l'escouade ou la puissance d'un membre",
      "`/admin member delete` — Désactiver un membre du registre actif",
      "`/admin member restore` — Réactiver un membre désactivé",
      "`/admin member count` — Statistiques du registre et répartition par type d'escouade",
    ],
    adminRoleTitle: "🔐 Rôles & Permissions d'Administration (`/admin role`)",
    adminRoleCommands: [
      "`/admin role add` — Accorder le rôle Administrateur d'Alliance ou d'Événement",
      "`/admin role remove` — Révoquer un rôle administratif pour un utilisateur",
      "`/admin role list` — Voir la liste des utilisateurs administrateurs",
    ],
    footerAdmin: "Toutes les commandes (Accès Admin) • Fait avec ❤️ par l'alliance QRF",
    footerMember: "Commandes membres • Fait avec ❤️ par l'alliance QRF",
  },
  de: {
    title: "📖 Last War Bot — Befehlsübersicht",
    subtitle: "*Erstellt mit ❤️ von der Allianz QRF*",
    description: "Hier sind alle verfügbaren Befehle, die du verwenden kannst.",
    tip: "> 💡 **Tipp:** Bei der Kampfkraft kannst du `80m`, `90mill`, `95.5` oder `82.4M` eingeben.",
    playerTitle: "👤 Spielerprofil & Einstellungen (`/profile`, `/language`)",
    playerCommands: [
      "`/profile register` — Erstelle dein Profil mit Spielnamen, Haupttrupp, Kraft und Sprache",
      "`/profile update` — Aktualisiere Namen, Haupttrupp, Kraft oder Sprache",
      "`/profile me` — Zeige dein Profil, Prioritäts-Tag, Sprache und Spielstatistiken an",
      "`/language` — Ändere deine Benachrichtigungssprache (🇬🇧, 🇪🇸, 🇧🇷, 🇫🇷, 🇩🇪, 🇷🇺, 🇰🇷, 🇯🇵)",
    ],
    eventTitle: "⚔️ Schlachtfeld-Events (`/event`)",
    eventCommands: [
      "`/event register` — Für Desert Storm oder Canyon Storm anmelden (Team A / Team B)",
      "`/event unregister` — Anmeldung für ein anstehendes Event zurückziehen",
      "`/event list` — Alle angemeldeten Spieler nach Kampfkraft sortiert anzeigen",
    ],
    adminEventTitle: "📢 Event-Setup & Ankündigungen (`/admin event`)",
    adminEventCommands: [
      "`/admin event config` — Automatische Ankündigung, Kanal und Anmeldefrist konfigurieren",
      "`/admin event announce` — Sofortige offizielle Event-Ankündigung posten",
      "`/admin event upcoming` — Anstehende geplante Events auflisten",
      "`/admin event create` — Manuell ein Event mit individuellen Zeiten erstellen",
    ],
    adminLineupTitle: "🛡️ Kader-Auswahl (`/admin lineup`)",
    adminLineupCommands: [
      "`/admin lineup wizard` — Interaktiver Assistent mit Checkboxen für Starter & Ersatzspieler",
      "`/admin lineup auto` — Wählt 20 Hauptspieler & 10 Ersatzspieler nach Priorität und Kraft",
      "`/admin lineup view` — Aktuelle Aufstellung (Starter, Ersatz, Warteliste) einsehen",
      "`/admin lineup set` — Spieler manuell zuweisen oder verschieben",
      "`/admin lineup publish` — Offiziellen Kader im Team-Kanal veröffentlichen",
    ],
    adminAttendanceTitle: "📊 Anwesenheit & Priorität (`/admin attendance`)",
    adminAttendanceCommands: [
      "`/admin attendance wizard` — Assistent zum Erfassen von Fehlzeiten und Abschließen des Matches",
      "`/admin attendance mark` — Spieler als Anwesend oder Abwesend markieren (Rotes Tag)",
      "`/admin attendance finalize` — Match abschließen: vergibt Blaues Prioritäts-Tag an Wartende",
    ],
    adminMemberTitle: "👥 Mitgliederliste & Tags (`/admin member`)",
    adminMemberCommands: [
      "`/admin member list` — Aktive Mitglieder nach Kampfkraft geordnet auflisten",
      "`/admin member view` — Profilkarte, Prioritäts-Tag und Anwesenheit einsehen",
      "`/admin member tag` — Prioritätsstufe festlegen (⭐ Stern, 🔵 Blau, ⚪ Weiß, 🔴 Rot)",
      "`/admin member update` — Name, Trupp oder Kampfkraft eines Mitglieds anpassen",
      "`/admin member delete` — Mitglied aus der aktiven Liste deaktivieren",
      "`/admin member restore` — Deaktiviertes Mitglied wiederherstellen",
      "`/admin member count` — Mitgliederstatistik und Truppenverteilung anzeigen",
    ],
    adminRoleTitle: "🔐 Admin-Rollen & Berechtigungen (`/admin role`)",
    adminRoleCommands: [
      "`/admin role add` — Allianz-Admin oder Event-Admin Rolle vergeben",
      "`/admin role remove` — Admin-Rolle für einen Benutzer entfernen",
      "`/admin role list` — Alle Administratoren auflisten",
    ],
    footerAdmin: "Alle Befehle (Admin-Zugriff) • Mit ❤️ von der Allianz QRF",
    footerMember: "Mitglieder-Befehle • Mit ❤️ von der Allianz QRF",
  },
  ru: {
    title: "📖 Бот Last War — Руководство по Командам",
    subtitle: "*Создано с ❤️ альянсом QRF*",
    description: "Вот все доступные команды, которые вы можете использовать.",
    tip: "> 💡 **Совет:** При вводе мощи можно писать `80m`, `90mill`, `95.5` или `82.4M`.",
    playerTitle: "👤 Профиль Игрока и Настройки (`/profile`, `/language`)",
    playerCommands: [
      "`/profile register` — Создать профиль с игровым ником, отрядом, мощью и языком",
      "`/profile update` — Обновить ник, основной отряд, мощь или язык",
      "`/profile me` — Посмотреть карточку профиля, приоритетный тег, язык и статистику",
      "`/language` — Сменить язык уведомлений (🇬🇧, 🇪🇸, 🇧🇷, 🇫🇷, 🇩🇪, 🇷🇺, 🇰🇷, 🇯🇵)",
    ],
    eventTitle: "⚔️ События Битвы (`/event`)",
    eventCommands: [
      "`/event register` — Записаться на Бурю в Пустыне или Каньон (Команда A / B)",
      "`/event unregister` — Отменить свою регистрацию на предстоящую битву",
      "`/event list` — Посмотреть всех зарегистрированных игроков по боевой мощи",
    ],
    adminEventTitle: "📢 Настройка Событий и Объявления (`/admin event`)",
    adminEventCommands: [
      "`/admin event config` — Настроить автоматические анонсы, канал и время закрытия",
      "`/admin event announce` — Немедленно опубликовать официальный анонс события",
      "`/admin event upcoming` — Список ближайших запланированных событий",
      "`/admin event create` — Создать событие вручную с индивидуальным временем",
    ],
    adminLineupTitle: "🛡️ Формирование Состава (`/admin lineup`)",
    adminLineupCommands: [
      "`/admin lineup wizard` — Интерактивный мастер выбора основы и запаса в 1 клик",
      "`/admin lineup auto` — Автоподбор 20 основы и 10 запаса по приоритету и мощи",
      "`/admin lineup view` — Просмотр текущего состава (Основа, Запас, Ожидание)",
      "`/admin lineup set` — Назначить или изменить роль игрока вручную",
      "`/admin lineup publish` — Опубликовать официальный состав в командном канале",
    ],
    adminAttendanceTitle: "📊 Посещаемость и Приоритет (`/admin attendance`)",
    adminAttendanceCommands: [
      "`/admin attendance wizard` — Мастер отметки неявившихся и завершения матча",
      "`/admin attendance mark` — Отметить посещение или неявку (налагает Красный тег)",
      "`/admin attendance finalize` — Завершить матч: выдает Синий приоритет тем, кто был в запасе",
    ],
    adminMemberTitle: "👥 Список Участников и Теги (`/admin member`)",
    adminMemberCommands: [
      "`/admin member list` — Список участников альянса, отсортированный по мощи",
      "`/admin member view` — Карточка участника, тег приоритета и статистика матчей",
      "`/admin member tag` — Назначить тег приоритета (⭐ Звезда, 🔵 Синий, ⚪ Белый, 🔴 Красный)",
      "`/admin member update` — Изменить имя, отряд или мощь участника",
      "`/admin member delete` — Деактивировать участника из активного состава",
      "`/admin member restore` — Восстановить деактивированного участника",
      "`/admin member count` — Статистика альянса и распределение войск по типам",
    ],
    adminRoleTitle: "🔐 Роли и Права Администраторов (`/admin role`)",
    adminRoleCommands: [
      "`/admin role add` — Выдать роль Администратора Альянса или Событий",
      "`/admin role remove` — Снять административную роль с пользователя",
      "`/admin role list` — Список всех администраторов",
    ],
    footerAdmin: "Все команды (Права Администратора) • Сделано с ❤️ альянсом QRF",
    footerMember: "Команды участников • Сделано с ❤️ альянсом QRF",
  },
  ko: {
    title: "📖 라스트 워 봇 — 명령어 가이드",
    subtitle: "*QRF 연맹에서 ❤️로 제작*",
    description: "사용 권한이 있는 모든 사용 가능한 명령어 목록입니다.",
    tip: "> 💡 **팁:** 전투력 입력 시 `80m`, `90mill`, `95.5`, `82.4M` 형식으로 입력할 수 있습니다.",
    playerTitle: "👤 플레이어 프로필 & 설정 (`/profile`, `/language`)",
    playerCommands: [
      "`/profile register` — 닉네임, 주력 분대, 전투력, 언어로 프로필 생성",
      "`/profile update` — 닉네임, 주력 분대, 전투력 또는 언어 수정",
      "`/profile me` — 프로필 카드, 우선 선발 태그, 언어 및 전적 확인",
      "`/language` — 알림 수신 언어 변경 (🇬🇧, 🇪🇸, 🇧🇷, 🇫🇷, 🇩🇪, 🇷🇺, 🇰🇷, 🇯🇵)",
    ],
    eventTitle: "⚔️ 전장 이벤트 신청 (`/event`)",
    eventCommands: [
      "`/event register` — 사막의 폭풍 또는 협곡 폭풍 참가 신청 (팀 A / 팀 B)",
      "`/event unregister` — 예정된 전장 경기 참가 신청 취소",
      "`/event list` — 전투력 순위별 참가 신청자 명단 확인",
    ],
    adminEventTitle: "📢 이벤트 설정 & 공지 (`/admin event`)",
    adminEventCommands: [
      "`/admin event config` — 자동 공지 일정, 공지 채널, 신청 마감 시간 설정",
      "`/admin event announce` — 공식 이벤트 참가 모집 공지 즉시 게시",
      "`/admin event upcoming` — 예정된 전장 이벤트 일정 목록 확인",
      "`/admin event create` — 사용자 정의 시간으로 새 이벤트 수동 생성",
    ],
    adminLineupTitle: "🛡️ 출전 로스터 선발 (`/admin lineup`)",
    adminLineupCommands: [
      "`/admin lineup wizard` — 체크박스 클릭으로 주력 선발 및 후보를 한눈에 선발",
      "`/admin lineup auto` — 우선 태그 및 전투력 기반 선발 20명 & 후보 10명 자동 배정",
      "`/admin lineup view` — 현재 로스터 현황 확인 (선발, 후보, 대기)",
      "`/admin lineup set` — 특정 플레이어의 출전 역할 수동 배정 및 이동",
      "`/admin lineup publish` — 팀 채널에 공식 선발 명단 공지 발표",
    ],
    adminAttendanceTitle: "📊 출석 관리 & 우선 태그 (`/admin attendance`)",
    adminAttendanceCommands: [
      "`/admin attendance wizard` — 불참자 체크 및 경기 종료 마감을 한 번에 처리",
      "`/admin attendance mark` — 출석 또는 불참(No-Show) 기록 (불참 시 레드 태그 페널티)",
      "`/admin attendance finalize` — 경기 최종 마감: 대기 멤버에게 차기 경기 블루 태그 지급",
    ],
    adminMemberTitle: "👥 연맹원 명단 & 태그 관리 (`/admin member`)",
    adminMemberCommands: [
      "`/admin member list` — 전투력 순위별 전체 활동 연맹원 명단",
      "`/admin member view` — 특정 연맹원의 프로필, 태그 및 출석 통계 확인",
      "`/admin member tag` — 우선 선발 태그 부여 (⭐ 스타, 🔵 블루, ⚪ 일반, 🔴 레드)",
      "`/admin member update` — 연맹원의 인게임 닉네임, 분대, 전투력 수정",
      "`/admin member delete` — 명단에서 비활성화 처리",
      "`/admin member restore` — 비활성화된 연맹원 복원",
      "`/admin member count` — 연맹원 현황 통계 및 분대별 인원 집계",
    ],
    adminRoleTitle: "🔐 관리자 역할 & 권한 (`/admin role`)",
    adminRoleCommands: [
      "`/admin role add` — 연맹 관리자 또는 이벤트 관리자 역할 부여",
      "`/admin role remove` — 관리자 역할 회수",
      "`/admin role list` — 관리자 권한을 가진 사용자 목록 확인",
    ],
    footerAdmin: "전체 명령어 표시 중 (관리자 권한) • QRF 연맹 제작",
    footerMember: "연맹원 명령어 표시 중 • QRF 연맹 제작",
  },
  ja: {
    title: "📖 ラストウォーBot — コマンドガイド",
    subtitle: "*QRF連盟より ❤️ を込めて制作*",
    description: "利用可能なすべてのコマンド一覧です。",
    tip: "> 💡 **ヒント:** 戦力は `80m`、`90mill`、`95.5`、`82.4M` のように入力できます。",
    playerTitle: "👤 プレイヤープロフィール & 設定 (`/profile`, `/language`)",
    playerCommands: [
      "`/profile register` — プレイヤー名、部隊タイプ、戦力、言語でプロフィール登録",
      "`/profile update` — プレイヤー名、部隊タイプ、戦力、言語を変更",
      "`/profile me` — プロフィールカード、優先タグ、言語、戦績を確認",
      "`/language` — 通知言語を変更 (🇬🇧, 🇪🇸, 🇧🇷, 🇫🇷, 🇩🇪, 🇷🇺, 🇰🇷, 🇯🇵)",
    ],
    eventTitle: "⚔️ 戦場イベント参加 (`/event`)",
    eventCommands: [
      "`/event register` — 砂漠の嵐またはキャニオンの参加登録 (チームA / チームB)",
      "`/event unregister` — 次回イベントの参加登録を取り消す",
      "`/event list` — 登録済みメンバーを戦力順で確認",
    ],
    adminEventTitle: "📢 イベント設定 & 告知 (`/admin event`)",
    adminEventCommands: [
      "`/admin event config` — 自動告知スケジュール、告知チャンネル、締切時間を設定",
      "`/admin event announce` — 公式イベント告知を即座に送信",
      "`/admin event upcoming` — 今後予定されている戦場イベント一覧を表示",
      "`/admin event create` — カスタム日時で新しいイベントを手動作成",
    ],
    adminLineupTitle: "🛡️ 出場メンバー選出 (`/admin lineup`)",
    adminLineupCommands: [
      "`/admin lineup wizard` — チェックボックスでメインスターターとリザーブを簡単選出",
      "`/admin lineup auto` — 優先タグと戦力に基づきスターター20名・リザーブ10名を自動選出",
      "`/admin lineup view` — 現在のロスター編成（メイン、リザーブ、待機）を確認",
      "`/admin lineup set` — メンバーの役割を手動で指定・変更",
      "`/admin lineup publish` — チームチャンネルに公式ラインナップを発表",
    ],
    adminAttendanceTitle: "📊 出欠管理 & 優先タグ (`/admin attendance`)",
    adminAttendanceCommands: [
      "`/admin attendance wizard` — 欠席者のチェックと試合終了処理を1画面で完了",
      "`/admin attendance mark` — 出場または欠席(No-Show)を記録（無断欠席は赤タグペナルティ）",
      "`/admin attendance finalize` — 試合を完了：待機メンバーに次回優先の青色タグを付与",
    ],
    adminMemberTitle: "👥 メンバー一覧 & タグ管理 (`/admin member`)",
    adminMemberCommands: [
      "`/admin member list` — 戦力順のアクティブメンバー一覧",
      "`/admin member view` — メンバーのプロフィール、優先タグ、出欠履歴を確認",
      "`/admin member tag` — 優先タグを設定 (⭐ スター, 🔵 青, ⚪ 白, 🔴 赤)",
      "`/admin member update` — プレイヤー名、部隊タイプ、戦力を変更",
      "`/admin member delete` — アクティブ名簿からメンバーを無効化",
      "`/admin member restore` — 無効化されたメンバーを復元",
      "`/admin member count` — 連盟統計および部隊タイプ別の人数集計を表示",
    ],
    adminRoleTitle: "🔐 管理者ロール & 権限 (`/admin role`)",
    adminRoleCommands: [
      "`/admin role add` — 連盟管理者またはイベント管理者の権限を付与",
      "`/admin role remove` — ユーザーから管理者権限を解除",
      "`/admin role list` — 管理者権限を持つ全ユーザーを表示",
    ],
    footerAdmin: "全コマンド表示中 (管理者権限) • QRF連盟制作",
    footerMember: "メンバー用コマンド表示中 • QRF連盟制作",
  },
};

function getHelpFields(s: HelpLocaleStrings, isUserAdmin: boolean): HelpField[] {
  const fields: HelpField[] = [
    { name: s.playerTitle, value: s.playerCommands.join("\n") },
    { name: s.eventTitle, value: s.eventCommands.join("\n") },
  ];

  if (isUserAdmin) {
    fields.push(
      { name: s.adminEventTitle, value: s.adminEventCommands.join("\n") },
      { name: s.adminLineupTitle, value: s.adminLineupCommands.join("\n") },
      { name: s.adminAttendanceTitle, value: s.adminAttendanceCommands.join("\n") },
      { name: s.adminMemberTitle, value: s.adminMemberCommands.join("\n") },
      { name: s.adminRoleTitle, value: s.adminRoleCommands.join("\n") },
    );
  }

  return fields;
}

export function buildLocalizedHelpEmbed(
  lang: SupportedLanguage,
  isUserAdmin: boolean,
): EmbedBuilder {
  const s = HELP_STRINGS[lang] || HELP_STRINGS.en;
  const fields = getHelpFields(s, isUserAdmin);

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(s.title)
    .setDescription([s.subtitle, "", s.description, "", s.tip].join("\n"))
    .addFields(fields)
    .setFooter({ text: isUserAdmin ? s.footerAdmin : s.footerMember })
    .setTimestamp();
}
