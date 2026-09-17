---
name: desert-storm-planner
description: >-
  Tactical planning engine and decision tree for the Desert Storm battlefield event.
  Use when formulating match strategies, optimizing player building allocations,
  designing opening rushes, or adapting tactics against enemy alliances.
---

# Desert Storm Tactical Planning Engine

This skill guides the evaluation of alliance rosters and the generation of optimal building allocations for the **Desert Storm Battlefield** event based on official structure point yields, combat buffs, and tactical stages.

---

## 1. Tactical Allocation Decision Framework

When allocating 20 starters and reserves to the 11 battlefield structures, follow this prioritized 5-tier allocation hierarchy:

### Tier 1: The Victory Anchor (Stage 2 — Nuclear Silo)
* **Structure:** Nuclear Silo (+80 pts/s)
* **Capacity:** 4 Players (Minimum 3, Maximum 5)
* **Profile Required:** Highest power players in the alliance.
* **Squad Preference:** 🛡️ **TANK** (High survivability against missile assaults).
* **Mission:** Must hold continuously once Stage 2 begins. The defensive anchor that secures victory.

### Tier 2: The Combat Swing Engine (Stage 2 — Arsenal & Mercenary Factory)
* **Arsenal (+15% Friendly Hero ATK/DEF/HP):**
  * **Capacity:** 2–3 Players.
  * **Squad Preference:** 🚀 **MISSILE** (Highest burst damage to contest Stage 2 objectives).
* **Mercenary Factory (-15% Enemy Hero ATK/DEF/HP):**
  * **Capacity:** 2 Players.
  * **Squad Preference:** 🛡️ **TANK** or 🚀 **MISSILE** (Mid-to-high power).
* **Synergy Rule:** Controlling both structures creates a **30% net attribute advantage** for all alliance members during the Nuclear Silo contest.

### Tier 3: The Economic Point Core (Stage 1 — Oil Refinery 1 & 2)
* **Structures:** Oil Refinery 1 (West) & Oil Refinery 2 (East) (+50 pts/s each)
* **Capacity:** 2 Players each (Total: 4 Players)
* **Opening Rule:** Must be captured at **Minute 0:00**.
* **Squad Preference:**
  * Refinery 1: 1 Tank + 1 Air or Missile (Upper-mid power).
  * Refinery 2: 1 Tank + 1 Air or Missile (Upper-mid power).
* **Mission:** Hold continuously to establish an early-game point lead before Stage 2 opens.

### Tier 4: The Force Multipliers (Stage 1 — Info Center & Science Hub)
* **Info Center (+10% Alliance Point Output Multiplier):**
  * **Capacity:** 1–2 Players.
  * **Squad Preference:** ✈️ **AIR** (High march speed for rapid initial capture).
  * **Mission:** Immediate capture at 0:00. Amplifies the yield of Refineries and the Silo.
* **Science Hub (-50% Teleport Cooldown):**
  * **Capacity:** 1–2 Players.
  * **Squad Preference:** ✈️ **AIR** or 🛡️ **TANK**.
  * **Mission:** Enables alliance-wide 1-minute teleporting for rapid defensive rotation between West and East flanks.

### Tier 5: Sustain & Attrition (Stage 1 — Field Hospitals 1, 2, 3, 4)
* **Structures:** Hospital 1 (Left 2), Hospital 2 (Right 1), Hospital 3 (Left Bottom), Hospital 4 (Right Top) (+30 pts/s each, 15 units healed/10s)
* **Capacity:** 1 Player each (Total: 4 Players)
* **Squad Preference:** Active mid-tier players, flexible squads.
* **Mission:** Provides constant baseline points (+120 pts/s if all 4 held) and unit recovery to prevent hospital burn-out.

---

## 2. Matchup Adaptation Playbooks

Select the strategy matching the relative power between your alliance and the opponent:

### Playbook A: Domination Strategy (Equal or Weaker Opponent)
* **Objective:** Complete map control and early point shutout.
* **Execution:**
  1. **Stage 1 Blitz**: Send Air squads immediately to **Info Center** and **Science Hub**. Send primary anchors to **Refinery 1 & 2**.
  2. **Stage 2 Lock**: At Stage 2 start, immediately occupy **Nuclear Silo**, **Arsenal**, and **Mercenary Factory**.
  3. **Result**: 30% combat swing suppresses enemy counter-attacks while Info Center multiplies your lead.

### Playbook B: Asymmetric Guerrilla Strategy (Stronger / Whale Opponent)
* **Objective:** Win on points by conceding the Nuclear Silo meat grinder and capturing peripheral buildings.
* **Execution:**
  1. **Concede Silo Direct Clash**: Do not sacrifice entire armies in a futile clash against opposing mega-whales at the Silo.
  2. **Hold the Flanks (4 Hospitals + 2 Refineries = +220 pts/s)**:
     - Hospitals (120 pts/s) + Refineries (100 pts/s) + Info Center (10% boost = +22 pts/s) = **242 pts/s**!
     - This out-scores the enemy even if they hold the Nuclear Silo (80 pts/s) + Arsenal (10 pts/s) = 90 pts/s!
  3. **Science Hub Teleport Raids**: Use 1-minute teleport CD to back-cap enemy structures when their whales march away.
  4. **Overcharge Stealing**: Wait for enemy buildings to exceed point capacity, then coordinate timed multi-rallies to flip them and loot stored points.

---

## 3. Step-by-Step Allocation Procedure (Mixed Garrison Engine)

When tasked with generating a strategy roster for an event:

1. **Step 1 — Inspect Starters**: Retrieve the 20 registered Main Squad players sorted by power and squad type (`TANK`, `AIR`, `MISSILE`).
2. **Step 2 — Nuclear Silo (4 Slots - Mixed Composition)**:
   - Must contain a mix of squad types to prevent easy single-march countering:
   - Target: **2 🛡️ Tanks** (highest power anchors) + **1 🚀 Missile** (Air counter) + **1 ✈️ Air** (Tank counter).
3. **Step 3 — Arsenal (3 Slots - Combat Core)**:
   - Target: **1 🛡️ Tank + 1 🚀 Missile + 1 ✈️ Air** (or 2 Missile + 1 Tank).
4. **Step 4 — Oil Refineries 1 & 2 (2 Slots Each - Strictly Mixed)**:
   - ⚠️ **Anti-Monoculture Rule**: Never put 2 Tanks or 2 Air in the same refinery.
   - Refinery 1 (West): **1 🛡️ Tank + 1 🚀 Missile** (or Air).
   - Refinery 2 (East): **1 🛡️ Tank + 1 ✈️ Air** (or Missile).
5. **Step 5 — Rapid Response Multipliers**:
   - `INFO_CENTER`: 1 fast ✈️ Air squad for 0:00 instant capture.
   - `SCIENCE_HUB`: 1–2 players (mix of Air/Tank) to secure the 1-minute teleport reduction.
6. **Step 6 — Fill Mercenary Factory & Hospitals**:
   - `MERCENARY_FACTORY`: 2 players with mixed squad types to secure the -15% enemy debuff.
   - `HOSPITAL_1` to `HOSPITAL_4`: 1 player each to sustain passive healing and point stream.
7. **Step 7 — Validate Substitutes**:
   - Designate substitute priority based on squad type matching (e.g. Tank substitute ready to replace Tank anchor, Air substitute ready for Info Center).
