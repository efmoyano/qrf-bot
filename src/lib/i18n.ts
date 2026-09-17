import { SquadType } from "@prisma/client";

export type SupportedLanguage =
  | "en"
  | "es"
  | "pt"
  | "fr"
  | "de"
  | "ru"
  | "ko"
  | "ja";

export interface LanguageMeta {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
];

export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

export function isValidLanguage(code?: string | null): code is SupportedLanguage {
  if (!code) return false;
  return SUPPORTED_LANGUAGES.some((l) => l.code === code);
}

export function detectLanguage(locale?: string | null): SupportedLanguage {
  if (!locale) return DEFAULT_LANGUAGE;
  const lower = locale.toLowerCase();

  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("pt")) return "pt";
  if (lower.startsWith("fr")) return "fr";
  if (lower.startsWith("de")) return "de";
  if (lower.startsWith("ru")) return "ru";
  if (lower.startsWith("ko")) return "ko";
  if (lower.startsWith("ja")) return "ja";

  return DEFAULT_LANGUAGE;
}

export function getLanguageMeta(code?: string | null): LanguageMeta {
  const lang = isValidLanguage(code) ? code : DEFAULT_LANGUAGE;
  return SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];
}

// ---------------------------------------------------------------------------
// LOCALIZED STRINGS & TRANSLATIONS
// ---------------------------------------------------------------------------

export const SQUAD_TRANSLATIONS: Record<SupportedLanguage, Record<SquadType, string>> = {
  en: { TANK: "Tank 🛡️", AIR: "Air ✈️", MISSILE: "Missile 🚀" },
  es: { TANK: "Tanque 🛡️", AIR: "Aéreo ✈️", MISSILE: "Misil 🚀" },
  pt: { TANK: "Tanque 🛡️", AIR: "Aéreo ✈️", MISSILE: "Míssil 🚀" },
  fr: { TANK: "Char 🛡️", AIR: "Aérien ✈️", MISSILE: "Missile 🚀" },
  de: { TANK: "Panzer 🛡️", AIR: "Flugzeug ✈️", MISSILE: "Rakete 🚀" },
  ru: { TANK: "Танки 🛡️", AIR: "Авиация ✈️", MISSILE: "Ракеты 🚀" },
  ko: { TANK: "탱크 🛡️", AIR: "항공 ✈️", MISSILE: "미사일 🚀" },
  ja: { TANK: "戦車 🛡️", AIR: "航空機 ✈️", MISSILE: "ミサイル 🚀" },
};

export const BUILDING_TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    NUCLEAR_SILO: "Nuclear Silo",
    ARSENAL: "Arsenal",
    MERCENARY_FACTORY: "Mercenary Factory",
    INFO_CENTER: "Info Center",
    OIL_REFINERY_1: "Oil Refinery 1",
    OIL_REFINERY_2: "Oil Refinery 2",
    SCIENCE_HUB: "Science Hub",
    HOSPITAL_1: "Hospital 1",
    HOSPITAL_2: "Hospital 2",
    HOSPITAL_3: "Hospital 3",
    HOSPITAL_4: "Hospital 4",
  },
  es: {
    NUCLEAR_SILO: "Silo Nuclear",
    ARSENAL: "Arsenal",
    MERCENARY_FACTORY: "Fábrica de Mercenarios",
    INFO_CENTER: "Centro de Información",
    OIL_REFINERY_1: "Refinería de Petróleo 1",
    OIL_REFINERY_2: "Refinería de Petróleo 2",
    SCIENCE_HUB: "Centro de Ciencia",
    HOSPITAL_1: "Hospital de Campo 1",
    HOSPITAL_2: "Hospital de Campo 2",
    HOSPITAL_3: "Hospital de Campo 3",
    HOSPITAL_4: "Hospital de Campo 4",
  },
  pt: {
    NUCLEAR_SILO: "Silo Nuclear",
    ARSENAL: "Arsenal",
    MERCENARY_FACTORY: "Fábrica de Mercenários",
    INFO_CENTER: "Centro de Informações",
    OIL_REFINERY_1: "Refinaria de Petróleo 1",
    OIL_REFINERY_2: "Refinaria de Petróleo 2",
    SCIENCE_HUB: "Polo Científico",
    HOSPITAL_1: "Hospital de Campanha 1",
    HOSPITAL_2: "Hospital de Campanha 2",
    HOSPITAL_3: "Hospital de Campanha 3",
    HOSPITAL_4: "Hospital de Campanha 4",
  },
  fr: {
    NUCLEAR_SILO: "Silo Nucléaire",
    ARSENAL: "Arsenal",
    MERCENARY_FACTORY: "Usine de Mercenaires",
    INFO_CENTER: "Centre d'Information",
    OIL_REFINERY_1: "Raffinerie de Pétrole 1",
    OIL_REFINERY_2: "Raffinerie de Pétrole 2",
    SCIENCE_HUB: "Pôle Scientifique",
    HOSPITAL_1: "Hôpital de Campagne 1",
    HOSPITAL_2: "Hôpital de Campagne 2",
    HOSPITAL_3: "Hôpital de Campagne 3",
    HOSPITAL_4: "Hôpital de Campagne 4",
  },
  de: {
    NUCLEAR_SILO: "Raketensilo",
    ARSENAL: "Arsenal",
    MERCENARY_FACTORY: "Söldnerfabrik",
    INFO_CENTER: "Informationszentrum",
    OIL_REFINERY_1: "Ölraffinerie 1",
    OIL_REFINERY_2: "Ölraffinerie 2",
    SCIENCE_HUB: "Wissenschaftszentrum",
    HOSPITAL_1: "Feldlazarett 1",
    HOSPITAL_2: "Feldlazarett 2",
    HOSPITAL_3: "Feldlazarett 3",
    HOSPITAL_4: "Feldlazarett 4",
  },
  ru: {
    NUCLEAR_SILO: "Ядерная шахта",
    ARSENAL: "Арсенал",
    MERCENARY_FACTORY: "Фабрика наемников",
    INFO_CENTER: "Информационный центр",
    OIL_REFINERY_1: "Нефтеочистной завод 1",
    OIL_REFINERY_2: "Нефтеочистной завод 2",
    SCIENCE_HUB: "Научный центр",
    HOSPITAL_1: "Полевой госпиталь 1",
    HOSPITAL_2: "Полевой госпиталь 2",
    HOSPITAL_3: "Полевой госпиталь 3",
    HOSPITAL_4: "Полевой госпиталь 4",
  },
  ko: {
    NUCLEAR_SILO: "핵 사일로",
    ARSENAL: "무기고",
    MERCENARY_FACTORY: "용병 공장",
    INFO_CENTER: "정보 센터",
    OIL_REFINERY_1: "정유소 1",
    OIL_REFINERY_2: "정유소 2",
    SCIENCE_HUB: "과학 허브",
    HOSPITAL_1: "야전 병원 1",
    HOSPITAL_2: "야전 병원 2",
    HOSPITAL_3: "야전 병원 3",
    HOSPITAL_4: "야전 병원 4",
  },
  ja: {
    NUCLEAR_SILO: "ミサイルサイロ",
    ARSENAL: "兵器庫",
    MERCENARY_FACTORY: "傭兵工場",
    INFO_CENTER: "情報センター",
    OIL_REFINERY_1: "石油精製所 1",
    OIL_REFINERY_2: "石油精製所 2",
    SCIENCE_HUB: "科学ハブ",
    HOSPITAL_1: "野戦病院 1",
    HOSPITAL_2: "野戦病院 2",
    HOSPITAL_3: "野戦病院 3",
    HOSPITAL_4: "野戦病院 4",
  },
};

export function getLocalizedBuildingName(
  buildingId: string,
  lang: SupportedLanguage,
): string {
  const dict = BUILDING_TRANSLATIONS[lang] || BUILDING_TRANSLATIONS.en;
  return dict[buildingId] || buildingId;
}

export function getLocalizedSquadName(
  squad: SquadType,
  lang: SupportedLanguage,
): string {
  const dict = SQUAD_TRANSLATIONS[lang] || SQUAD_TRANSLATIONS.en;
  return dict[squad] || squad;
}

// ---------------------------------------------------------------------------
// NOTIFICATION DM GENERATORS
// ---------------------------------------------------------------------------

export interface LocalizedLineupNotice {
  title: string;
  description: string;
  footer: string;
}

export function getLineupMainDM(
  lang: SupportedLanguage,
  eventTitle: string,
  timestamp: number,
  squad: string,
): LocalizedLineupNotice {
  const dateStr = `<t:${timestamp}:F> (<t:${timestamp}:R>)`;
  const footer = "Last War Battlefield Coordinator";

  switch (lang) {
    case "es":
      return {
        title: `🏆 Seleccionado para el Escuadrón Principal: ${eventTitle}`,
        description: `¡Felicitaciones! Has sido seleccionado para el **Escuadrón Principal** en **${eventTitle}**.\n\n📅 **Inicio de la batalla:** ${dateStr}\n⚔️ **Escuadrón:** ${squad}\n\n¡Por favor conéctate al juego al menos 5 minutos antes del inicio!`,
        footer,
      };
    case "pt":
      return {
        title: `🏆 Selecionado para o Esquadrão Principal: ${eventTitle}`,
        description: `Parabéns! Você foi selecionado para o **Esquadrão Principal** em **${eventTitle}**.\n\n📅 **Início da batalha:** ${dateStr}\n⚔️ **Esquadrão:** ${squad}\n\nPor favor, esteja online no jogo pelo menos 5 minutos antes do início!`,
        footer,
      };
    case "fr":
      return {
        title: `🏆 Sélectionné dans l'Équipe Principale : ${eventTitle}`,
        description: `Félicitations ! Vous avez été sélectionné dans l'**Équipe Principale** pour **${eventTitle}**.\n\n📅 **Début du match :** ${dateStr}\n⚔️ **Escouade :** ${squad}\n\nVeuillez être en ligne dans le jeu au moins 5 minutes avant le début !`,
        footer,
      };
    case "de":
      return {
        title: `🏆 Für den Hauptkader ausgewählt: ${eventTitle}`,
        description: `Glückwunsch! Du wurdest für den **Hauptkader** in **${eventTitle}** ausgewählt.\n\n📅 **Kampfbeginn:** ${dateStr}\n⚔️ **Trupp:** ${squad}\n\nBitte sei mindestens 5 Minuten vor Spielbeginn online!`,
        footer,
      };
    case "ru":
      return {
        title: `🏆 Вы отобраны в Основной Состав: ${eventTitle}`,
        description: `Поздравляем! Вы были отобраны в **Основной Состав** на **${eventTitle}**.\n\n📅 **Начало битвы:** ${dateStr}\n⚔️ **Отряд:** ${squad}\n\nПожалуйста, будьте в игре минимум за 5 минут до начала матча!`,
        footer,
      };
    case "ko":
      return {
        title: `🏆 주력 스쿼드 선발 완료: ${eventTitle}`,
        description: `축하합니다! **${eventTitle}**의 **주력 스쿼드(선발)**로 선발되었습니다.\n\n📅 **경기 시작:** ${dateStr}\n⚔️ **분대:** ${squad}\n\n경기 시작 최소 5분 전까지 게임에 접속해 주시기 바랍니다!`,
        footer,
      };
    case "ja":
      return {
        title: `🏆 メイン部隊に選出されました: ${eventTitle}`,
        description: `おめでとうございます！**${eventTitle}**の**メイン部隊**に選出されました。\n\n📅 **試合開始:** ${dateStr}\n⚔️ **部隊:** ${squad}\n\n試合開始の5分前までにゲームにログインしてください！`,
        footer,
      };
    default:
      return {
        title: `🏆 Main Squad Selected: ${eventTitle}`,
        description: `Congratulations! You have been selected for the **Main Squad** in **${eventTitle}**.\n\n📅 **Match Starts:** ${dateStr}\n⚔️ **Squad:** ${squad}\n\nPlease ensure you are online in game at least 5 minutes before match start!`,
        footer,
      };
  }
}

export function getLineupSubDM(
  lang: SupportedLanguage,
  eventTitle: string,
  timestamp: number,
  squad: string,
): LocalizedLineupNotice {
  const dateStr = `<t:${timestamp}:F> (<t:${timestamp}:R>)`;
  const footer = "Last War Battlefield Coordinator";

  switch (lang) {
    case "es":
      return {
        title: `🔄 Seleccionado como Sustituto: ${eventTitle}`,
        description: `Has sido seleccionado como **Sustituto** para **${eventTitle}**.\n\n📅 **Inicio de la batalla:** ${dateStr}\n⚔️ **Escuadrón:** ${squad}\n\nPor favor permanece atento al inicio del evento por si un titular no puede jugar.`,
        footer,
      };
    case "pt":
      return {
        title: `🔄 Selecionado como Substituto: ${eventTitle}`,
        description: `Você foi selecionado como **Substituto** para **${eventTitle}**.\n\n📅 **Início da batalha:** ${dateStr}\n⚔️ **Esquadrão:** ${squad}\n\nPor favor, fique de prontidão no início do evento caso um titular não possa jogar.`,
        footer,
      };
    case "fr":
      return {
        title: `🔄 Sélectionné comme Remplaçant : ${eventTitle}`,
        description: `Vous avez été sélectionné comme **Remplaçant** pour **${eventTitle}**.\n\n📅 **Début du match :** ${dateStr}\n⚔️ **Escouade :** ${squad}\n\nVeuillez être prêt au début du match si un titulaire est absent.`,
        footer,
      };
    case "de":
      return {
        title: `🔄 Als Ersatzspieler ausgewählt: ${eventTitle}`,
        description: `Du wurdest als **Ersatzspieler** für **${eventTitle}** nominiert.\n\n📅 **Kampfbeginn:** ${dateStr}\n⚔️ **Trupp:** ${squad}\n\nBitte halte dich zu Kampfbeginn bereit, falls ein Stammspieler ausfällt.`,
        footer,
      };
    case "ru":
      return {
        title: `🔄 Вы назначены Запасным: ${eventTitle}`,
        description: `Вы назначены **Запасным игроком** на **${eventTitle}**.\n\n📅 **Начало битвы:** ${dateStr}\n⚔️ **Отряд:** ${squad}\n\nПожалуйста, будьте наготове к началу матча на случай замены.`,
        footer,
      };
    case "ko":
      return {
        title: `🔄 후보(대체) 선수 선발 완료: ${eventTitle}`,
        description: `**${eventTitle}**의 **후보 선수**로 선발되었습니다.\n\n📅 **경기 시작:** ${dateStr}\n⚔️ **분대:** ${squad}\n\n선발 인원이 불참할 경우 즉시 투입될 수 있도록 대기해 주시기 바랍니다.`,
        footer,
      };
    case "ja":
      return {
        title: `🔄 リザーブ（補欠）に選出されました: ${eventTitle}`,
        description: `**${eventTitle}**の**リザーブ（補欠）**に選出されました。\n\n📅 **試合開始:** ${dateStr}\n⚔️ **部隊:** ${squad}\n\nスタメンが出場できない場合に備えて待機をお願いします。`,
        footer,
      };
    default:
      return {
        title: `🔄 Substitute Selected: ${eventTitle}`,
        description: `You have been selected as a **Substitute** for **${eventTitle}**.\n\n📅 **Match Starts:** ${dateStr}\n⚔️ **Squad:** ${squad}\n\nPlease be on standby during match start in case a starter is unable to play.`,
        footer,
      };
  }
}

export function getLineupStandbyDM(
  lang: SupportedLanguage,
  eventTitle: string,
): LocalizedLineupNotice {
  const footer = "Last War Battlefield Coordinator";

  switch (lang) {
    case "es":
      return {
        title: `⏳ Lista de Reserva: ${eventTitle}`,
        description: `¡Gracias por inscribirte en **${eventTitle}**! Estás en **Reserva** para este partido.\n\nSi no eres sustituido en la batalla, recibirás la 🔵 **Etiqueta de Prioridad Azul**, lo que te garantiza prioridad de selección para la próxima semana.`,
        footer,
      };
    case "pt":
      return {
        title: `⏳ Lista de Espera: ${eventTitle}`,
        description: `Obrigado por se registrar em **${eventTitle}**! Você está na **Reserva** para esta partida.\n\nSe você não for substituído, receberá a 🔵 **Tag de Prioridade Azul**, garantindo prioridade de seleção na próxima semana!`,
        footer,
      };
    case "fr":
      return {
        title: `⏳ Liste d'Attente : ${eventTitle}`,
        description: `Merci de vous être inscrit à **${eventTitle}** ! Vous êtes en **Réserve** pour ce match.\n\nSi vous ne jouez pas, vous recevrez le 🔵 **Tag de Priorité Bleue**, vous garantissant une sélection prioritaire la semaine prochaine !`,
        footer,
      };
    case "de":
      return {
        title: `⏳ Warteliste: ${eventTitle}`,
        description: `Vielen Dank für deine Anmeldung zu **${eventTitle}**! Du bist auf der **Warteliste**.\n\nWenn du nicht eingewechselt wirst, erhältst du das 🔵 **Blaue Prioritäts-Tag**, das dir garantierte Auswahl nächste Woche sichert!`,
        footer,
      };
    case "ru":
      return {
        title: `⏳ Список Ожидания: ${eventTitle}`,
        description: `Спасибо за регистрацию на **${eventTitle}**! Вы находитесь в **Ожидании**.\n\nЕсли вы не будете задействованы, вы получите 🔵 **Синий приоритетный тег**, гарантирующий попадание в состав на следующей неделе!`,
        footer,
      };
    case "ko":
      return {
        title: `⏳ 대기 명단 안내: ${eventTitle}`,
        description: `**${eventTitle}** 등록에 감사드립니다! 현재 이번 경기 **대기 명단**에 등록되었습니다.\n\n경기에 투입되지 않을 경우, 다음 주 경기에서 우선 선발이 보장되는 🔵 **블루 우선 태그**를 부여받게 됩니다!`,
        footer,
      };
    case "ja":
      return {
        title: `⏳ スタンバイ登録: ${eventTitle}`,
        description: `**${eventTitle}**への参加登録ありがとうございます！今回は**スタンバイ（待機）**となりました。\n\n今回出場機会がなかった場合、来週の優先選出が保証される 🔵 **青色優先タグ** が付与されます！`,
        footer,
      };
    default:
      return {
        title: `⏳ Standby Roster: ${eventTitle}`,
        description: `Thank you for registering for **${eventTitle}**! You are currently on **Standby** for this match.\n\nIf you are not substituted into the match, you will receive a 🔵 **Blue Priority Tag** granting you guaranteed selection priority for next week!`,
        footer,
      };
  }
}

export interface StrategyObjectiveParams {
  lang: SupportedLanguage;
  eventTitle: string;
  buildingName: string;
  squad: string;
  timestamp: number;
}

export function getStrategyObjectiveDM(
  params: StrategyObjectiveParams,
): LocalizedLineupNotice {
  const { lang, eventTitle, buildingName, squad, timestamp } = params;
  const dateStr = `<t:${timestamp}:F> (<t:${timestamp}:R>)`;
  const footer = "Desert Storm Tactical Command";

  switch (lang) {
    case "es":
      return {
        title: `🗺️ Objetivo Táctico Asignado: ${eventTitle}`,
        description: `¡Tu misión de combate para **${eventTitle}** está lista!\n\n🎯 **Estructura asignada:** **${buildingName}**\n⚔️ **Escuadrón:** ${squad}\n📅 **Inicio:** ${dateStr}\n\n¡Revisa el mapa táctico en el canal y coordina con tus compañeros de equipo!`,
        footer,
      };
    case "pt":
      return {
        title: `🗺️ Objetivo Tático Atribuído: ${eventTitle}`,
        description: `Sua missão de combate para **${eventTitle}** está pronta!\n\n🎯 **Estrutura atribuída:** **${buildingName}**\n⚔️ **Esquadrão:** ${squad}\n📅 **Início:** ${dateStr}\n\nPor favor, confira o mapa tático no canal e coordene com seus companheiros!`,
        footer,
      };
    case "fr":
      return {
        title: `🗺️ Objectif Tactique Attribué : ${eventTitle}`,
        description: `Votre mission de combat pour **${eventTitle}** est prête !\n\n🎯 **Bâtiment assigné :** **${buildingName}**\n⚔️ **Escouade :** ${squad}\n📅 **Début :** ${dateStr}\n\nVeuillez consulter la carte tactique dans le canal et vous coordonner avec vos coéquipiers !`,
        footer,
      };
    case "de":
      return {
        title: `🗺️ Taktisches Einsatzziel zugewiesen: ${eventTitle}`,
        description: `Dein Kampfeinsatz für **${eventTitle}** steht fest!\n\n🎯 **Zugewiesenes Gebäude:** **${buildingName}**\n⚔️ **Trupp:** ${squad}\n📅 **Beginn:** ${dateStr}\n\nBitte überprüfe die taktische Karte im Team-Kanal und stimme dich mit deinen Kameraden ab!`,
        footer,
      };
    case "ru":
      return {
        title: `🗺️ Боевая Задача Назначена: ${eventTitle}`,
        description: `Ваше тактическое назначение на **${eventTitle}** готово!\n\n🎯 **Назначенное здание:** **${buildingName}**\n⚔️ **Отряд:** ${squad}\n📅 **Начало:** ${dateStr}\n\nОзнакомьтесь с картой в канале альянса и координируйте действия с союзниками!`,
        footer,
      };
    case "ko":
      return {
        title: `🗺️ 전술 목표 건물 배정 완료: ${eventTitle}`,
        description: `**${eventTitle}** 전투 임무가 배정되었습니다!\n\n🎯 **배정된 건물:** **${buildingName}**\n⚔️ **분대:** ${squad}\n📅 **경기 시작:** ${dateStr}\n\n팀 채널에 게시된 전술 지도를 확인하고 팀원들과 함께 방어 작전을 조율해 주세요!`,
        footer,
      };
    case "ja":
      return {
        title: `🗺️ 戦術目標が割り当てられました: ${eventTitle}`,
        description: `**${eventTitle}**の戦闘任務が決定しました！\n\n🎯 **担当建築物:** **${buildingName}**\n⚔️ **部隊:** ${squad}\n📅 **開始日時:** ${dateStr}\n\nチャンネルの戦術マップを確認し、部隊メンバーと連携してください！`,
        footer,
      };
    default:
      return {
        title: `🗺️ Tactical Objective Assigned: ${eventTitle}`,
        description: `Your tactical combat assignment for **${eventTitle}** is ready!\n\n🎯 **Assigned Structure:** **${buildingName}**\n⚔️ **Squad:** ${squad}\n📅 **Match Starts:** ${dateStr}\n\nPlease review the tactical battlefield map in the team channel and coordinate with your squad mates!`,
        footer,
      };
  }
}

export function getStrategyReserveDM(
  lang: SupportedLanguage,
  eventTitle: string,
): LocalizedLineupNotice {
  const footer = "Desert Storm Tactical Command";

  switch (lang) {
    case "es":
      return {
        title: `🔄 Servicio de Reserva: ${eventTitle}`,
        description: `¡El mapa táctico para **${eventTitle}** ha sido publicado!\n\nEstás asignado como **Sustituto / Reserva**. Por favor mantente conectado y listo para reforzar la defensa de cualquier edificio si se requiere.`,
        footer,
      };
    case "pt":
      return {
        title: `🔄 Reserva de Combate: ${eventTitle}`,
        description: `O mapa tático para **${eventTitle}** foi publicado!\n\nVocê está designado como **Substituto / Reserva**. Fique online e pronto para assumir a defesa de qualquer estrutura caso necessário.`,
        footer,
      };
    case "fr":
      return {
        title: `🔄 Mission de Réserve : ${eventTitle}`,
        description: `La carte tactique pour **${eventTitle}** a été publiée !\n\nVous êtes affecté comme **Remplaçant / Réserve**. Soyez en ligne et prêt à intervenir pour la défense si nécessaire.`,
        footer,
      };
    case "de":
      return {
        title: `🔄 Reserve-Dienst: ${eventTitle}`,
        description: `Die taktische Karte für **${eventTitle}** wurde veröffentlicht!\n\nDu bist als **Reserve** eingeteilt. Bitte sei online und bereit, bei Bedarf sofort die Verteidigung zu verstärken.`,
        footer,
      };
    case "ru":
      return {
        title: `🔄 Резервная Служба: ${eventTitle}`,
        description: `Тактическая карта для **${eventTitle}** опубликована!\n\nВы назначены в **Резерв**. Пожалуйста, будьте в игре и готовы при необходимости занять оборону любого здания.`,
        footer,
      };
    case "ko":
      return {
        title: `🔄 예비군 대기 명령: ${eventTitle}`,
        description: `**${eventTitle}**의 전술 전략 지도가 공개되었습니다!\n\n귀하는 **후보/예비군**으로 배치되었습니다. 필요 시 즉시 방어 지원에 투입될 수 있도록 게임 내에서 대기해 주시기 바랍니다.`,
        footer,
      };
    case "ja":
      return {
        title: `🔄 予備部隊任務: ${eventTitle}`,
        description: `**${eventTitle}**の戦術マップが公開されました！\n\nあなたは**補欠／予備部隊**に指定されています。必要に応じて建物の救援に出撃できるよう準備をお願いします。`,
        footer,
      };
    default:
      return {
        title: `🔄 Reserve Duty: ${eventTitle}`,
        description: `The tactical strategy map for **${eventTitle}** has been published!\n\nYou are assigned as **Substitute / Reserve**. Please be online and prepared to step in for any structure defense if required.`,
        footer,
      };
  }
}

function getAttendanceNoShowNotice(
  lang: SupportedLanguage,
  eventTitle: string,
): LocalizedLineupNotice {
  const footer = "Last War Battlefield Attendance";
  switch (lang) {
    case "es":
      return {
        title: `⚠️ Asistencia del Partido: Marcado Ausente (${eventTitle})`,
        description: `Fuiste marcado como **Ausente / No asistió** para **${eventTitle}**.\n\n🔴 Se ha aplicado una penalización con **Etiqueta Roja** a tu perfil. Si tienes una justificación, por favor contacta a los oficiales.`,
        footer,
      };
    case "pt":
      return {
        title: `⚠️ Frequência na Batalha: Marcado como Ausente (${eventTitle})`,
        description: `Você foi marcado como **Ausente** em **${eventTitle}**.\n\n🔴 Uma penalidade com **Tag Vermelha** foi aplicada ao seu perfil. Se tiver justificativa, procure um oficial.`,
        footer,
      };
    case "fr":
      return {
        title: `⚠️ Présence au match : Noté Absent (${eventTitle})`,
        description: `Vous avez été noté **Absent** pour **${eventTitle}**.\n\n🔴 Une pénalité **Tag Rouge** a été appliquée à votre profil. Si vous avez un motif valable, contactez un officier.`,
        footer,
      };
    case "de":
      return {
        title: `⚠️ Anwesenheit: Als abwesend markiert (${eventTitle})`,
        description: `Du wurdest bei **${eventTitle}** als **Abwesend** eingetragen.\n\n🔴 Dein Profil erhielt eine **Rote Markierung** als Strafe. Bei Entschuldigungen wende dich bitte an die Offiziere.`,
        footer,
      };
    case "ru":
      return {
        title: `⚠️ Посещаемость: Отмечен как Неявившийся (${eventTitle})`,
        description: `Вы были отмечены как **Не явившийся** на **${eventTitle}**.\n\n🔴 К вашему профилю применен штрафной **Красный тег**. Если у вас уважительная причина, свяжитесь с офицерами.`,
        footer,
      };
    case "ko":
      return {
        title: `⚠️ 경기 출석: 불참(No-Show) 처리 안내 (${eventTitle})`,
        description: `**${eventTitle}** 경기에 **무단 불참**으로 처리되었습니다.\n\n🔴 프로필에 페널티인 **레드 태그**가 부여되었습니다. 부득이한 사유가 있으신 경우 임원진에게 문의해 주세요.`,
        footer,
      };
    case "ja":
      return {
        title: `⚠️ 試合出欠: 欠席と判定されました (${eventTitle})`,
        description: `**${eventTitle}**に**欠席（不参加）**と記録されました。\n\n🔴 ペナルティとして**赤色タグ**が付与されました。やむを得ない事情がある場合は幹部へご連絡ください。`,
        footer,
      };
    default:
      return {
        title: `⚠️ Match Attendance: Marked Absent (${eventTitle})`,
        description: `You were marked as **Absent / No-Show** for **${eventTitle}**.\n\n🔴 A **Red Tag** penalty has been applied to your alliance profile. If you have an excuse, please contact your alliance officers.`,
        footer,
      };
  }
}

function getAttendanceBlueTagNotice(
  lang: SupportedLanguage,
  eventTitle: string,
): LocalizedLineupNotice {
  const footer = "Last War Battlefield Attendance";
  switch (lang) {
    case "es":
      return {
        title: `🔵 ¡Etiqueta de Prioridad Azul Otorgada!`,
        description: `Gracias por registrarte para **${eventTitle}**.\n\nDado que estuviste en banca / reserva durante este partido, ¡se te ha otorgado la 🔵 **Etiqueta de Prioridad Azul**! Esto te garantiza prioridad absoluta de selección para el próximo evento.`,
        footer,
      };
    case "pt":
      return {
        title: `🔵 Tag de Prioridade Azul Concedida!`,
        description: `Obrigado por se registrar em **${eventTitle}**.\n\nComo você ficou na reserva/banco nesta partida, recebeu a 🔵 **Tag de Prioridade Azul**! Isso garante prioridade de escalação no próximo evento.`,
        footer,
      };
    case "fr":
      return {
        title: `🔵 Tag de Priorité Bleue Attribué !`,
        description: `Merci de vous être inscrit à **${eventTitle}**.\n\nComme vous étiez sur le banc/réserve pour ce match, vous recevez le 🔵 **Tag de Priorité Bleue** ! Cela vous garantit une sélection prioritaire au prochain match.`,
        footer,
      };
    case "de":
      return {
        title: `🔵 Blaues Prioritäts-Tag erhalten!`,
        description: `Danke für deine Anmeldung zu **${eventTitle}**.\n\nDa du für dieses Spiel auf der Ersatzbank warst, erhältst du das 🔵 **Blaue Prioritäts-Tag**! Damit bist du für das nächste Event garantiert gesetzt.`,
        footer,
      };
    case "ru":
      return {
        title: `🔵 Синий Приоритетный Тег Назначен!`,
        description: `Спасибо за регистрацию на **${eventTitle}**.\n\nПоскольку вы были в запасе на этом матче, вам присвоен 🔵 **Синий приоритетный тег**! Это гарантирует отбор на следующее событие.`,
        footer,
      };
    case "ko":
      return {
        title: `🔵 차기 경기 우선 선발 블루 태그 부여!`,
        description: `**${eventTitle}** 등록에 감사드립니다.\n\n이번 경기에서 후보/대기로 팀을 지원해 주셨으므로 🔵 **블루 우선 태그**가 지급되었습니다! 다음 이벤트 매치에서 확정 우선 선발 혜택을 받으실 수 있습니다.`,
        footer,
      };
    case "ja":
      return {
        title: `🔵 次回優先枠（青色タグ）が付与されました！`,
        description: `**${eventTitle}**への参加登録ありがとうございました。\n\n今回はリザーブ／待機としてチームを支えていただいたため、次回優先選出となる 🔵 **青色優先タグ** が付与されました！`,
        footer,
      };
    default:
      return {
        title: `🔵 Priority Tag Awarded for Next Event!`,
        description: `Thank you for registering for **${eventTitle}**.\n\nSince you were benched / on standby for this match, you have been awarded the 🔵 **Blue Priority Tag**! This gives you guaranteed priority selection for the next battlefield event.`,
        footer,
      };
  }
}

function getAttendanceAttendedNotice(
  lang: SupportedLanguage,
  eventTitle: string,
): LocalizedLineupNotice {
  const footer = "Last War Battlefield Attendance";
  switch (lang) {
    case "es":
      return {
        title: `✅ Asistencia Registrada: ${eventTitle}`,
        description: `¡Gracias por participar en **${eventTitle}**!\n\nTu contador de asistencia ha sido actualizado en los registros de la alianza.`,
        footer,
      };
    case "pt":
      return {
        title: `✅ Presença Confirmada: ${eventTitle}`,
        description: `Obrigado por participar de **${eventTitle}**!\n\nSua contagem de partidas foi atualizada nos registros da aliança.`,
        footer,
      };
    case "fr":
      return {
        title: `✅ Présence Confirmée : ${eventTitle}`,
        description: `Merci d'avoir participé à **${eventTitle}** !\n\nVotre compteur de participation a été mis à jour dans les registres de l'alliance.`,
        footer,
      };
    case "de":
      return {
        title: `✅ Teilnahme bestätigt: ${eventTitle}`,
        description: `Vielen Dank für deinen Einsatz in **${eventTitle}**!\n\nDeine Spielteilnahme wurde in den Allianz-Statistiken aktualisiert.`,
        footer,
      };
    case "ru":
      return {
        title: `✅ Участие Подтверждено: ${eventTitle}`,
        description: `Спасибо за участие в **${eventTitle}**!\n\nКоличество ваших матчей обновлено в реестре альянса.`,
        footer,
      };
    case "ko":
      return {
        title: `✅ 경기 출석 완료: ${eventTitle}`,
        description: `**${eventTitle}** 경기에 참여해 주셔서 감사합니다!\n\n연맹 출석 기록에 경기 참여 횟수가 정상적으로 반영되었습니다.`,
        footer,
      };
    case "ja":
      return {
        title: `✅ 出場が記録されました: ${eventTitle}`,
        description: `**${eventTitle}**への出撃ありがとうございました！\n\n連盟の記録に出場カウントが正常に加算されました。`,
        footer,
      };
    default:
      return {
        title: `✅ Match Attendance Recorded: ${eventTitle}`,
        description: `Thank you for participating in **${eventTitle}**!\n\nYour match attendance count has been updated in the alliance records.`,
        footer,
      };
  }
}

export function getAttendanceNotice(
  lang: SupportedLanguage,
  eventTitle: string,
  type: "ATTENDED" | "NO_SHOW" | "BLUE_TAG",
): LocalizedLineupNotice {
  if (type === "NO_SHOW") return getAttendanceNoShowNotice(lang, eventTitle);
  if (type === "BLUE_TAG") return getAttendanceBlueTagNotice(lang, eventTitle);
  return getAttendanceAttendedNotice(lang, eventTitle);
}

