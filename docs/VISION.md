# Product vision

## What Under The Table wants to be

Under The Table is a **session-first, game-like tabletop runtime** with D&D 2024 as its first ruleset.

It should connect the loop that is usually split across character builders, wikis, notes and encounter tools:

`world -> campaign prep -> characters -> live session -> session history -> changed world`

The defining experience is the live session. A player or DM should feel that they are operating a game HUD, not filling out a database form.

## Live experience

Play is participation in the session, not one mandatory screen. A virtual-table surface should use the active map/scene and tokens as the playfield with modular HUD windows above it. A physical-table Companion surface should keep the same character/dice/action tools useful without requiring a digital map. Mixed tables may use both projections at once.

The HUD is modular. Containers can be dragged, resized, hidden and configured. Examples include character status, HP/resources, actions, spells, inventory, dice, conditions, initiative, selected target, event log and notes. Layouts are presentation state and must not become authoritative game state.

Local/offline companion play is a valid mode, but local changes must not be silently presented as campaign truth or merged without an explicit synchronization/conflict policy.

## Homebrew is not a special case

Species, classes, subclasses, backgrounds, feats, spells, items and custom content should be composed from shared primitives. A content source may grant data, choices, actions, resources, passive effects and active effects.

Automation is progressive:

1. descriptive/manual resolution always works;
2. rolls/resources can be declared;
3. common effects can be composed from primitives;
4. complex sequences may use an effect graph;
5. a manual/custom escape hatch remains available.

The engine must not require every possible tabletop rule to be encoded before content can exist.

## Core product principle

**Automation assists the table; it does not hold the table hostage.**

The DM must be able to override or resolve unusual situations without breaking the session.

## Ruleset principle

D&D 2024 is the initial product target because the current product vision is D&D-focused. The core should still avoid assumptions such as `if class === wizard` in generic runtime code.

## Scene atlas principle

World exploration and live maps should share a flexible scene model. Scenes are linked visual/spatial surfaces rather than nodes in a mandatory World -> Region -> City hierarchy.

An uploaded image with clickable pins must remain enough to build a useful campaign atlas. More advanced tools — hex-map authoring, configurable travel procedures, battle-map creation, vision and automation — layer on top without replacing that simple path.

The authoring goal is fluid composition: click an area or pin, enter another scene, and continue linking as deeply or laterally as the campaign needs.
