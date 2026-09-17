import { Resvg } from "@resvg/resvg-js";
import fs from "fs";

export function generateDesertStormMapSvg(options = {}) {
  const {
    eventTitle = "Desert Storm — Team A",
    assignments = {
      NUCLEAR_SILO: [
        { name: "CommanderAlpha", power: "95.5M", squad: "TANK" },
        { name: "IronShield", power: "88.0M", squad: "TANK" },
        { name: "TitanVanguard", power: "84.2M", squad: "TANK" },
      ],
      ARSENAL: [
        { name: "RocketStorm", power: "82.1M", squad: "MISSILE" },
        { name: "SkyFire", power: "79.5M", squad: "MISSILE" },
      ],
      MERCENARY_FACTORY: [
        { name: "Brawler", power: "75.0M", squad: "TANK" },
        { name: "Fortress", power: "72.4M", squad: "TANK" },
      ],
      INFO_CENTER: [
        { name: "RadarEagle", power: "78.0M", squad: "AIR" },
      ],
      OIL_REFINERY_1: [
        { name: "AirStrike", power: "76.5M", squad: "AIR" },
        { name: "SwiftWind", power: "71.0M", squad: "AIR" },
      ],
      HOSPITAL_1: [
        { name: "MedicOne", power: "68.5M", squad: "TANK" },
      ],
      HOSPITAL_3: [
        { name: "Guardian", power: "65.0M", squad: "MISSILE" },
      ],
      HOSPITAL_4: [
        { name: "Phoenix", power: "70.2M", squad: "AIR" },
      ],
      HOSPITAL_2: [
        { name: "Valkyrie", power: "69.0M", squad: "AIR" },
      ],
      OIL_REFINERY_2: [
        { name: "Driller", power: "74.0M", squad: "MISSILE" },
        { name: "ThunderBolt", power: "73.2M", squad: "MISSILE" },
      ],
      SCIENCE_HUB: [
        { name: "Quantum", power: "80.5M", squad: "MISSILE" },
        { name: "Nova", power: "77.0M", squad: "AIR" },
      ],
    },
    substitutes = [
      { name: "SubZero", power: "62.0M", squad: "AIR" },
      { name: "BackupTank", power: "60.5M", squad: "TANK" },
      { name: "ReserveSniper", power: "58.0M", squad: "MISSILE" },
    ],
  } = options;

  const SQUAD_BADGE = {
    TANK: { label: "TANK", color: "#3b82f6", bg: "#1e3a8a" },
    AIR: { label: "AIR", color: "#06b6d4", bg: "#164e63" },
    MISSILE: { label: "MSL", color: "#f43f5e", bg: "#881337" },
  };

  const buildings = [
    // Center
    { id: "NUCLEAR_SILO", name: "NUCLEAR SILO", badge: "SILO", x: 440, y: 340, w: 240, h: 220, color: "#f97316" },
    // Top & Bottom
    { id: "ARSENAL", name: "ARSENAL", badge: "ATK", x: 440, y: 70, w: 240, h: 220, color: "#ef4444" },
    { id: "MERCENARY_FACTORY", name: "MERCENARY FACTORY", badge: "MERC", x: 440, y: 610, w: 240, h: 220, color: "#eab308" },
    // Left Column
    { id: "INFO_CENTER", name: "INFO CENTER", badge: "INFO", x: 70, y: 70, w: 240, h: 160, color: "#06b6d4" },
    { id: "OIL_REFINERY_1", name: "OIL REFINERY 1", badge: "OIL-1", x: 70, y: 250, w: 240, h: 160, color: "#3b82f6" },
    { id: "HOSPITAL_1", name: "HOSPITAL 1", badge: "HOSP-1", x: 70, y: 430, w: 240, h: 160, color: "#10b981" },
    { id: "HOSPITAL_3", name: "HOSPITAL 3", badge: "HOSP-3", x: 70, y: 610, w: 240, h: 160, color: "#10b981" },
    // Right Column
    { id: "HOSPITAL_4", name: "HOSPITAL 4", badge: "HOSP-4", x: 810, y: 70, w: 240, h: 160, color: "#10b981" },
    { id: "HOSPITAL_2", name: "HOSPITAL 2", badge: "HOSP-2", x: 810, y: 250, w: 240, h: 160, color: "#10b981" },
    { id: "OIL_REFINERY_2", name: "OIL REFINERY 2", badge: "OIL-2", x: 810, y: 430, w: 240, h: 160, color: "#3b82f6" },
    { id: "SCIENCE_HUB", name: "SCIENCE HUB", badge: "TECH", x: 810, y: 610, w: 240, h: 160, color: "#a855f7" },
  ];

  const buildingBoxes = buildings.map((b) => {
    const assigned = assignments[b.id] || [];
    const playerRows = assigned.slice(0, 6).map((p, idx) => {
      const yOffset = b.y + 60 + idx * 26;
      const bInfo = SQUAD_BADGE[p.squad] || { label: "SQD", color: "#94a3b8", bg: "#334155" };
      return `
        <g transform="translate(${b.x + 12}, ${yOffset})">
          <!-- Squad Badge -->
          <rect x="0" y="-12" width="38" height="16" rx="3" fill="${bInfo.bg}" stroke="${bInfo.color}" stroke-width="1"/>
          <text x="19" y="0" text-anchor="middle" fill="${bInfo.color}" font-size="10" font-weight="700" font-family="system-ui, monospace">${bInfo.label}</text>
          <!-- Player Name -->
          <text x="46" y="0" fill="#f8fafc" font-size="13" font-weight="600" font-family="system-ui, sans-serif">${p.name}</text>
          <!-- Power -->
          <text x="${b.w - 24}" y="0" text-anchor="end" fill="#38bdf8" font-size="12" font-weight="600" font-family="system-ui, monospace">${p.power}</text>
        </g>
      `;
    }).join("\n");

    const emptyNotice = assigned.length === 0 ? `
      <text x="${b.x + b.w / 2}" y="${b.y + b.h / 2 + 10}" text-anchor="middle" fill="#64748b" font-size="13" font-style="italic" font-family="system-ui, sans-serif">No defenders assigned</text>
    ` : "";

    return `
      <!-- Building ${b.name} -->
      <g>
        <!-- Background Card -->
        <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="#111827" stroke="${b.color}" stroke-width="2" stroke-opacity="0.85"/>
        <!-- Header Banner -->
        <rect x="${b.x}" y="${b.y}" width="${b.w}" height="36" rx="8" fill="${b.color}" fill-opacity="0.18"/>
        <line x1="${b.x}" y1="${b.y + 36}" x2="${b.x + b.w}" y2="${b.y + 36}" stroke="${b.color}" stroke-width="1.5" stroke-opacity="0.5"/>
        <text x="${b.x + 12}" y="${b.y + 23}" fill="#f8fafc" font-size="14" font-weight="bold" font-family="system-ui, sans-serif">
          ${b.name}
        </text>
        <text x="${b.x + b.w - 12}" y="${b.y + 23}" text-anchor="end" fill="${b.color}" font-size="12" font-weight="bold" font-family="system-ui, monospace">
          [${assigned.length}]
        </text>
        <!-- Player List -->
        ${playerRows}
        ${emptyNotice}
      </g>
    `;
  }).join("\n");

  const subRows = substitutes.map((p, idx) => {
    const yOffset = 120 + idx * 34;
    const bInfo = SQUAD_BADGE[p.squad] || { label: "SQD", color: "#94a3b8", bg: "#334155" };
    return `
      <g transform="translate(1130, ${yOffset})">
        <rect x="0" y="-18" width="280" height="28" rx="5" fill="#1e293b" fill-opacity="0.7"/>
        <rect x="8" y="-12" width="38" height="16" rx="3" fill="${bInfo.bg}" stroke="${bInfo.color}" stroke-width="1"/>
        <text x="27" y="0" text-anchor="middle" fill="${bInfo.color}" font-size="10" font-weight="700" font-family="system-ui, monospace">${bInfo.label}</text>
        <text x="54" y="0" fill="#f8fafc" font-size="13" font-weight="600" font-family="system-ui, sans-serif">${p.name}</text>
        <text x="268" y="0" text-anchor="end" fill="#fbbf24" font-size="12" font-weight="600" font-family="system-ui, monospace">${p.power}</text>
      </g>
    `;
  }).join("\n");


  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1460" height="880" viewBox="0 0 1460 880">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#030712"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" stroke-width="0.8" stroke-opacity="0.5"/>
        </pattern>
      </defs>

      <!-- Background -->
      <rect width="1460" height="880" fill="url(#bgGrad)"/>
      <rect width="1460" height="880" fill="url(#grid)"/>

      <!-- Map Boundary (The Big Square) -->
      <rect x="40" y="40" width="1040" height="800" rx="14" fill="#090d16" fill-opacity="0.8" stroke="#334155" stroke-width="2.5"/>
      <text x="60" y="30" fill="#94a3b8" font-size="13" font-weight="700" letter-spacing="2" font-family="system-ui, sans-serif">
        DESERT STORM BATTLEFIELD MAP — ${eventTitle.toUpperCase()}
      </text>

      <!-- Coordinate ticks -->
      <text x="180" y="56" text-anchor="middle" fill="#475569" font-size="11" font-weight="600" font-family="monospace">WEST FLANK</text>
      <text x="560" y="56" text-anchor="middle" fill="#475569" font-size="11" font-weight="600" font-family="monospace">CENTRAL CORRIDOR</text>
      <text x="940" y="56" text-anchor="middle" fill="#475569" font-size="11" font-weight="600" font-family="monospace">EAST FLANK</text>

      <!-- Connection Lines between structures -->
      <g stroke="#334155" stroke-width="1.5" stroke-dasharray="4,4" stroke-opacity="0.6">
        <!-- Vertical Spine -->
        <line x1="560" y1="290" x2="560" y2="340"/>
        <line x1="560" y1="560" x2="560" y2="610"/>
        <!-- Horizontal Connections -->
        <line x1="310" y1="150" x2="440" y2="180"/>
        <line x1="680" y1="180" x2="810" y2="150"/>
        <line x1="310" y1="450" x2="440" y2="450"/>
        <line x1="680" y1="450" x2="810" y2="450"/>
        <line x1="310" y1="720" x2="440" y2="720"/>
        <line x1="680" y1="720" x2="810" y2="720"/>
      </g>

      <!-- 11 Building Boxes -->
      ${buildingBoxes}

      <!-- Substitutes Sidebar Panel -->
      <g>
        <rect x="1110" y="40" width="320" height="800" rx="14" fill="#090d16" fill-opacity="0.85" stroke="#334155" stroke-width="2.5"/>
        <rect x="1110" y="40" width="320" height="46" rx="14" fill="#3b82f6" fill-opacity="0.15"/>
        <line x1="1110" y1="86" x2="1430" y2="86" stroke="#3b82f6" stroke-width="2" stroke-opacity="0.4"/>
        <text x="1130" y="70" fill="#f8fafc" font-size="15" font-weight="bold" font-family="system-ui, sans-serif">
          SUBSTITUTES [RESERVES] (${substitutes.length})
        </text>
        <text x="1130" y="102" fill="#64748b" font-size="11" font-family="system-ui, sans-serif">
          Ready to substitute in case of absence:
        </text>
        ${subRows}
      </g>

      <!-- Footer Branding -->
      <text x="40" y="865" fill="#475569" font-size="11" font-family="system-ui, sans-serif">
        Generated by QRF Alliance Server 460 • Last War: Survival
      </text>
    </svg>
  `;
}

// Generate test PNG
const outputPath = process.argv[2] || "./desert_storm_strategy_map.png";
const svg = generateDesertStormMapSvg();
const resvg = new Resvg(svg, { font: { defaultFontFamily: "sans-serif" } });
const png = resvg.render().asPng();
fs.writeFileSync(outputPath, png);
console.log(`✅ Test strategy map generated successfully: ${outputPath} (${png.length} bytes)`);

