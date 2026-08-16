# Vertical Slice 004 — Character Foundation

Status: **complete / proven on homelab — 2026-08-16**.

## Goal

Replace the single hard-coded demo character in session state with durable, multi-character primitives that can support party play and the future D&D 2024 Character Builder without hard-coding D&D concepts into core.

## Implemented

- generic `CharacterDefinition` with stable id, name, `rulesetId`, schema version and ruleset-owned data;
- generic `CharacterResource` records separated from definition data;
- `character` and `character_resource` SurrealDB `SCHEMAFULL` tables;
- one-time migration of Mira Voss and legacy HP from the pre-VS004 session snapshot;
- live Colyseus `characters` map instead of global `characterName/hp/maxHp` fields;
- HP intents target an explicit `characterId` and persist resource + session event atomically;
- per-browser character selection persisted locally, so participants can view different sheets in the same room;
- Companion offline mode clones the selected character into browser-local state instead of assuming one global character;
- minimal Character Library in Play: list, select, create identity + ruleset + starting HP;
- Virtual Table exposes the same Library from its discreet utility tray.

## Runtime evidence

A two-client SDK smoke created a second D&D 2024 character at `17 HP`, then client B changed only that character to `13 HP`. Both clients converged on `13`, while Mira stayed `32`. Restarting only the game-server created a new Colyseus room and restored both characters with the same resource values.

The temporary smoke character was then removed from development data.

Browser QA created `QA Sable` at `21 HP`. Browser A auto-selected it while browser B remained on Mira until explicitly selecting Sable. A changed Sable to `20/21`; B's Mira sheet stayed `32/32`. A reload preserved browser A's selection. A 390×844 mobile pass rendered both library entries and the creation form with zero console/page errors.

QA character data was removed after verification; the preview returns to the starter Mira fixture.
## Verification gate

The integrated workspace passes strict TypeScript, ESLint, domain/server tests and production builds. The official live smoke harness was updated to target character resources instead of removed global room HP fields.

## Deferred

This is not the D&D 2024 Character Builder yet. Species, background, class progression, abilities, proficiencies, grants/choices, inventory, actions/effects, resource derivation, token-character binding and import/export remain later slices.

There is still no authenticated character ownership. Any connected client in the private development preview can currently select or mutate any character. That is a known authorization boundary, not a final product behavior.
