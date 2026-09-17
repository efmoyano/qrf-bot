# Troop Type Counter Dynamics & Mixed Garrison Theory

This document defines the exact combat damage counter formulas and the **Mixed Garrison Principle** used by the planning engine when assigning defenders to battlefield structures.

---

## 1. Exact Damage Counter Matrix

The troop interaction in *Last War: Survival* revolves around a circular **-20% damage reduction** mechanic:

| Defender Unit Type | Attacking Unit Type | Damage Modifier Received | Combat Evaluation |
| :--- | :--- | :---: | :--- |
| 🛡️ **Tank** | 🚀 Missile Vehicle | **-20% Damage Taken** | Tanks strongly resist Missile assaults. |
| 🚀 **Missile Vehicle** | ✈️ Aircraft | **-20% Damage Taken** | Missile Vehicles strongly resist Aircraft strafing. |
| ✈️ **Aircraft** | 🛡️ Tank | **-20% Damage Taken** | Aircraft strongly resist Tank cannon fire. |

```
           🛡️ TANK
       (Resists Missile -20%)
          /          ^
         /            \
  Resisted by      Resists
    Aircraft        Tank
      -20%          -20%
       v              \
   ✈️ AIR <-------- 🚀 MISSILE
           Resisted by
             Missile
              -20%
```

---

## 2. The Mixed Garrison Principle (Anti-Counter Defense)

### ⚠️ The Monoculture Vulnerability
* **Why stacking identical squad types is sub-optimal:**
  * If a building holds **2 Tanks**, an enemy can scout it and send a solo **Aircraft squad**, gaining an uncontested damage resistance advantage and tearing through the defense.
  * If a building holds **2 Aircraft**, an enemy sends a **Missile squad** and wipes them out with -20% incoming damage mitigation.
  * If a building holds **2 Missiles**, an enemy sends a **Tank squad** to easily neutralize them.

### ✅ The Mixed Defense Imperative
When multiple defenders occupy the same structure, their squad types **must be diversified** to create an anti-counter wall:

| Structure Capacity | Optimal Composition | Tactical Rationale |
| :---: | :--- | :--- |
| **2-Player Buildings**<br>*(Oil Refineries, Merc Factory, Science Hub)* | **1 🛡️ Tank + 1 🚀 Missile**<br>*OR*<br>**1 🛡️ Tank + 1 ✈️ Air**<br>*OR*<br>**1 🚀 Missile + 1 ✈️ Air** | Guarantees that whatever unit type the enemy attacks with, at least one defender holds the counter advantage while the other resists incoming damage. **Never place 2 of the same squad type in a 2-man building.** |
| **3-Player Buildings**<br>*(Arsenal)* | **1 🛡️ Tank + 1 🚀 Missile + 1 ✈️ Air** *(The Holy Trinity)* | Perfect 3-way balance. Imparts a counter threat against every conceivable attacking squad composition. |
| **4-Player Buildings**<br>*(Nuclear Silo)* | **2 🛡️ Tanks + 1 🚀 Missile + 1 ✈️ Air**<br>*OR*<br>**2 🛡️ Tanks + 2 🚀 Missiles** | 2 heavy Tanks provide the core anchor HP, backed by Missile/Air burst counters to repel opposing Tank and Air assaults. |

---

## 3. Allocation Decision Rules for the Planner Engine

When allocating players to structures:

1. **Rule of Diversity**:
   * For any structure with capacity $\ge 2$, **do not assign players with the same `squadSnapshot` if alternative squad types of comparable power are available.**
2. **Anchor + Counter Pairing**:
   * Pair the primary high-power defender (e.g. Tank) with an opposite type (e.g. Missile or Air) so the secondary defender protects the anchor's weakness.
3. **Nuclear Silo Rule**:
   * Minimum 2 distinct squad types required. Optimal is a 2-Tank, 1-Missile, 1-Air split.
4. **Flank Refineries Rule**:
   * Oil Refinery 1: 1 Tank + 1 Missile (or Air).
   * Oil Refinery 2: 1 Tank + 1 Air (or Missile).
