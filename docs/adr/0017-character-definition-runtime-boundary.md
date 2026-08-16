# ADR 0017 — Character definition and runtime state are separate from session state

Status: Accepted

## Context

The first live slice treated one demo character as room fields: `characterName`, `hp` and `maxHp`. That was useful for proving authoritative events, but it cannot support a party, multiple devices selecting different sheets, ruleset adapters or durable character creation.

D&D 2024 is the first ruleset, while the core must remain usable by future/custom rulesets without `if class === ...` behavior.

## Decision

A character is a durable entity with two layers:

- `CharacterDefinition`: identity, `rulesetId`, schema version and ruleset-owned data;
- `CharacterResource`: runtime mutable resources such as HP, keyed generically.
Session snapshots contain session truth (`activeSceneId`, roll/event recovery), not one character's identity or HP. The live room projects a map of durable character runtimes. HP commands target an explicit `characterId`.

Which character a browser is currently viewing is presentation state and is stored locally per client. Changing that selection must not change another participant's selected sheet.

Ruleset-specific content stays behind `rulesetId` + versioned ruleset data. The generic core does not define D&D classes, species, spell slots or feats.

A one-time compatibility path creates the starter character from the pre-VS004 snapshot so the existing development state is not discarded during the boundary change.

## Consequences

- a session can project multiple characters without a global `activeCharacter`;
- Character Builder can grow on top of stable identity/runtime primitives;
- mutable resources can expand beyond HP without changing the session snapshot model;
- auth is still deferred, so any connected preview client can currently select and mutate any character;
- ruleset-owned data needs dedicated validation/versioning when the D&D 2024 adapter is implemented.
