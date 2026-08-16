# Vertical Slice 006 — Checks + Basic Combat Loop

Status: **implemented and verified in the private homelab preview**

## Goal

Close the largest remaining gap between the playable sheet and an MVP combat session without prematurely replacing the planned generic Action/Effect engine.

A D&D 2024 character can now store skill proficiencies and basic weapon attacks, roll saves/skills from the live HUD, enter initiative against a lightweight NPC, select a target and resolve an authoritative attack against Armor Class and Hit Points.

## Implemented

### D&D 2024 playable subset v2

`@utt/rules-dnd2024` now owns:

- all 18 skill-to-ability mappings;
- class saving-throw proficiencies;
- derived save, skill and passive-Perception modifiers;
- a small editable basic-attack model;
- common weapon templates used only to seed the builder;
- attack-bonus derivation from ability + optional weapon proficiency.

Older VS005 ruleset data with no skills or attacks normalizes forward to the v2 shape with empty arrays rather than becoming invalid.
### Builder + checks

The Character Builder adds explicit skill-proficiency toggles plus an editable basic-attack loadout. It deliberately does not infer which choices a class/background must make; exact grant/choice enforcement belongs to the later content model.

The Checks widget exposes:

- manual dice;
- six saving throws with class proficiency applied where appropriate;
- all 18 skills with selected proficiencies highlighted;
- passive Perception on the Character widget.

These rolls reuse the existing authoritative campaign dice path. Offline Companion keeps local dice behavior and does not pretend to provide authoritative combat.

### Basic attack authority

The client sends only `attackerCharacterId`, `attackId` and `targetEntryId`.

The server resolves the stored attack, derives the attack modifier, rolls the d20, checks AC, derives damage, rolls damage dice and persists the resulting event/state before projecting it to clients. Natural 1 misses and natural 20 doubles damage dice for this MVP resolver.

A character attack is accepted only when that character is the active initiative entry. This is an MVP turn boundary, not the final flexible Action Engine.
### Encounter targets

Ad-hoc initiative NPCs now carry bounded AC and HP inside encounter/session state. Their current HP survives synchronized session snapshots while the encounter exists.

Durable characters remain different: their AC comes from ruleset data and HP remains a `character_resource`. An attack against a character atomically persists the HP resource mutation together with the session event/snapshot.

The MVP does not create durable monster/NPC entities from quick-add entries, and it does not automate NPC attacks.

### UX

- Companion adds a dedicated Actions widget beside Character, Checks, Initiative and Log;
- Virtual Table gets the same Actions widget and a five-item mobile drawer;
- initiative quick-add accepts Name, initiative modifier, AC and HP;
- initiative rows and target selection show live AC/HP;
- attack cards show hit bonus, damage expression and range;
- freeform desktop defaults were adjusted after screenshot QA so the five widgets do not begin clipped or overlapping.

## Verification evidence

The integrated pre-runtime gate passed strict TypeScript, ESLint, all production builds and **32/32 tests**: 19 generic-domain, 6 D&D adapter and 7 game-server/session tests.
Authority smoke with two SDK clients proved an NPC at 15 HP could be reduced to 6 HP with synchronized state, while a durable target character moved from 20 HP to 10 HP through the character-resource transaction path. No command errors occurred.

After restarting only `game-server`, a new Colyseus room recovered the same character-target HP plus initiative round/order/active turn from persistence.

Browser QA covered desktop Companion and 390×844 Virtual Table. It proved a proficient Athletics roll, target selection, authoritative Longsword attack, builder skill/attack editing surfaces, mobile Actions and mobile Checks with zero console/page errors. Visual review caught and fixed a clipped Initiative default and an over-wide NPC quick-add row before finalization.

QA characters are temporary test data and are removed before the final handoff.

## Intentionally outside this slice

Weapon Mastery, feats, class/species/background grant enforcement, equipment inventory, spellcasting, conditions, advantage/disadvantage automation, cover/range validation, opportunity/reaction rules, NPC attack automation and the general Content/Action/Effect engines are not implemented here.

This basic-attack path is intentionally replaceable by the future Action/Effect engine; it exists to make the current product playable enough to validate the table loop first.