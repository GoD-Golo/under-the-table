# Vertical Slice 005 — Playable Character + Combat Loop

Status: **implemented and verified in the private homelab preview**

## Goal

Move from Character Foundation to a loop that is actually playable without prematurely building the entire future Content/Action/Effect system.

A participant can now build/select a D&D 2024 character, use a live sheet, roll checks, change HP, join initiative with ad-hoc NPCs, advance turns, and recover the combat session after a game-server restart while the existing Scene Atlas/table continues to work.

## Implemented

### D&D 2024 adapter + builder

- dedicated `@utt/rules-dnd2024` package keeps ruleset mechanics outside generic core;
- supported identity fields: name, class, species, background and level;
- six final ability scores with derived modifiers;
- derived proficiency bonus and initiative modifier;
- editable AC, speed and max HP with non-binding baseline/fixed-progression suggestions;
- notes field;
- create and edit paths share the same Character Library builder;
- legacy Mira remains valid as an unfinished D&D 2024 character and exposes `Finish build` rather than receiving invented choices.

The MVP does **not** silently apply background ability grants, feats, species traits, class features, equipment or spells. Those need explicit content/choice modeling rather than hidden assumptions.

### Playable sheet

The Character widget now shows level/class, AC, initiative, PB, speed, species/background, six ability modifiers and HP controls. Clicking an ability sends the existing authoritative d20 roll with that modifier.

Character selection remains local per browser/device; selecting a sheet does not move another participant onto it.

### Initiative / turn loop

- player-character initiative modifier is derived server-side for D&D 2024;
- ad-hoc NPC/monster entries can be rolled with a bounded modifier without creating a durable character;
- entries sort by total, with one authoritative active turn and round counter;
- `Next turn` wraps the order and increments the round;
- `Clear combat` resets encounter state;
- roll/advance/clear persist session events and the next recovery snapshot before synchronized state changes;
- initiative recovery survives a real game-server restart.

### UX

- Character Library opens a responsive playable builder instead of a tiny create form;
- Companion adds a dedicated Combat/Initiative widget;
- Virtual Table gets the same initiative widget in the floating HUD;
- mobile Virtual Table adds a `Combat` drawer alongside Character/Dice/Log;
- HUD layout storage keys were versioned so the larger character sheet and new initiative widget get usable defaults instead of inheriting undersized pre-MVP placements;
- web Docker build now includes the ruleset adapter dependency explicitly.

## Verification evidence

Integrated quality gate before runtime QA: strict TypeScript, ESLint, tests and production builds all green. Final workspace test total is **28/28**: 19 generic domain tests, 4 D&D 2024 adapter tests and 5 game-server/session tests.

Runtime smoke against the existing SurrealDB proved:

- a temporary D&D character could be created and updated from level 1 to level 2 with max HP changed to 20;
- a deliberately bogus client initiative modifier of `99` was ignored for that D&D character; the server used its Dexterity modifier instead;
- character + ad-hoc Goblin initiative synchronized and `Next turn` advanced the active entry;
- after restarting only `game-server`, a new Colyseus room recovered the same initiative roster, scores, round, active index, character ruleset data and HP max;
- combat was then cleared authoritatively.

Browser QA used two independent desktop contexts plus a 390×844 mobile context. It proved Character Builder edit/persistence, ability-check roll, per-browser sheet selection, initiative synchronization, turn advance, reload persistence, mobile Builder and mobile Combat, with zero console/page errors. Visual inspection caught and fixed the initially undersized Character widget before final QA.

QA characters were removed afterwards. The final preview was explicitly verified with only **Mira Voss 32/32**, empty initiative, empty recent-event preview and `Finish build` ready.

## Intentionally still outside this slice

Full background/feat/species/class choice resolution, skills/saves/proficiencies, inventory/equipment, attacks, spells, rests/resources beyond HP, conditions, targeting, Action/Effect engines, walls/LOS, secure player visibility and authenticated ownership remain future work.
