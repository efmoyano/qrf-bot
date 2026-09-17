# Desert Storm Battlefield Mechanics & Ground Rules

This document establishes the official game mechanics, structure point yields, combat buffs, and tactical scoring rules for the **Desert Storm Battlefield** event in *Last War: Survival*.

---

## 1. Battlefield Stages & Progression

| Stage | Trigger / Time | Active Structures & Features | Rules & Objective |
| :--- | :--- | :--- | :--- |
| **Preparation Stage** | 0:00 - Match Start | Safe Zone Only (Friendly = Blue, Enemy = Red) | Players can enter the safe zone and plan opening movements. Players **cannot be attacked** in safe zones. |
| **Stage 1: Opening Assault** | Battle Begins (Minute 0) | **Oil Refinery 1 & 2**, **Info Center**, **Science Hub**, **Field Hospitals (1-4)** | Initial structure race. First alliance to secure and garrison buildings establishes early point generation and tactical buffs. |
| **Stage 2: Core Domination** | Opens Mid-Battle | **Nuclear Silo**, **Arsenal**, **Mercenary Factory**, **Random Oil Wells** | High-value core structures become capturable. Decides the match outcome through heavy point generation and team combat buffs. |
| **Overcharge (Point Stealing)** | Ongoing | All captured structures | Captured buildings generate battlefield points that eventually exceed their storage capacity. **Capturing an enemy building loots all accumulated stored points!** |

> [!IMPORTANT]
> **Victory Condition**: The alliance with the highest total **Battlefield Points** at the end of the match wins.
> Killing enemy units awards **Individual Points only** and **0 Alliance Battlefield Points**. Matches are won exclusively through structure control and point production!

---

## 2. Structure Specifications & Point Yields

### Comprehensive Structure Matrix

| Structure | Stage | Alliance Yield | Individual Yield | Special Buff / Mechanical Effect | Tactical Priority |
| :--- | :---: | :---: | :---: | :--- | :---: |
| **Nuclear Silo** | 2 | **+80 / sec** | +30 / sec | High-yield victory engine. Single highest point generator on map. | **S+ (Critical)** |
| **Oil Refinery 1** | 1 | **+50 / sec** | +30 / sec | Primary early-game point generator (West flank). | **S (Primary)** |
| **Oil Refinery 2** | 1 | **+50 / sec** | +30 / sec | Primary early-game point generator (East flank). | **S (Primary)** |
| **Info Center** | 1 | +10 / sec | +30 / sec | **+10% Alliance Point Multiplier** across ALL held buildings. | **A+ (High Synergy)** |
| **Arsenal** | 2 | +10 / sec | +30 / sec | **+15% Hero Attack, Defense, and HP** to all alliance members. | **A+ (Combat King)** |
| **Mercenary Factory** | 2 | +10 / sec | +30 / sec | **-15% Hero Attack, Defense, and HP** debuff to all enemy heroes. | **A+ (Combat King)** |
| **Field Hospitals (1-4)**| 1 | **+30 / sec** each | +30 / sec | **Passive Healing**: Recovers 15 units of any level every 10s per hospital. | **A (Sustain & Points)** |
| **Science Hub** | 1 | +10 / sec | +30 / sec | **-50% Free City Relocation Cooldown** (reduces CD from 2m to 1m). | **B+ (Mobility)** |

---

## 3. Deep Tactical Synergies

### 3.1 The 30% Combat Stat Swing (Arsenal + Mercenary Factory)
- **Arsenal**: Buffs friendly heroes by **+15% ATK, DEF, and HP**.
- **Mercenary Factory**: Debuffs enemy heroes by **-15% ATK, DEF, and HP**.
- **Combined Impact**: Controlling both structures creates an effective **~30% stat differential** in combat, allowing alliance squads to decisively crush equal or slightly higher power enemy squads in the Nuclear Silo contest.

### 3.2 The Info Center Multiplier Effect
The Info Center provides a **+10% point boost** to all other captured buildings:
- Holding Nuclear Silo (80) + Both Refineries (100) = 180 pts/s.
- With Info Center active: **198 pts/s** (+18 pts/s bonus, equal to nearly two auxiliary structures for free!).
- Holding Info Center is mandatory when leading to compound the point gap.

### 3.3 Science Hub Mobility Engine
- **Base City Relocation (Teleport)**: 1 free teleport every 2 minutes.
- **With Science Hub**: 1 free teleport every **1 minute**.
- Enables rapid cross-map reinforcement between the West flank (Refinery 1) and East flank (Refinery 2).

### 3.4 Hospital Sustain Network
- Holding all 4 Field Hospitals generates **+120 Alliance pts/sec** (more than the Nuclear Silo!) and recovers **60 units every 10 seconds** (360 units/minute).
- In protracted attrition battles, controlling 2+ hospitals prevents troop burn-out.

---

## 4. Squad Type Counter Triangle & Damage Modifiers

Combat damage reduction follows a circular **-20% damage received** mechanic:

* 🛡️ **Tanks** receive **-20% damage** from 🚀 Missile vehicles.
* 🚀 **Missile Vehicles** receive **-20% damage** from ✈️ Aircraft.
* ✈️ **Aircraft** receive **-20% damage** from 🛡️ Tanks.

```
           🛡️ TANK
     (Resists Missile -20%)
        /             \
   Resisted by      Resists
    Aircraft         Tank
      -20%           -20%
      v                \
   ✈️ AIR <-------- 🚀 MISSILE
         Resisted by
           Missile
            -20%
```

### 4.1 The Mixed Garrison Imperative
* **Monoculture Danger**: Garrisoning 2 players of the same squad type (e.g. 2 Air or 2 Tanks) in the same building allows an enemy to scout and send a single hard-counter march to wipe the building.
* **Mixed Composition**: Always mix defender squad types in multi-player buildings (e.g. 1 Tank + 1 Missile, or 1 Tank + 1 Air in Refineries; 2 Tanks + 1 Missile + 1 Air in the Nuclear Silo). This eliminates single-type vulnerabilities!
*(Detailed playbook in `.agents/rules/troop-counter-dynamics.md`)*

---

## 5. Auxiliary Scoring & Field Rules

1. **Garrisoning**:
   - Stationed inside any active building generates **+30 Individual Points per second**.
2. **Oil Wells (Stage 2)**:
   - Periodically spawn across the map.
   - Harvesting awards **+5 Individual Points per second** plus battlefield points.
   - Ideal for standby rovers and substitutes who have entered the match.
3. **Supply Boxes**:
   - Picking up crates scattered on the map awards immediate points.
4. **City Burning & Safe Zone**:
   - Players forced to teleport return to their Safe Zone without loss of eligibility.
   - Cities inside Safe Zones are immune to scouting and attack.
