# ADR 0018 — Ruleset mechanics live outside generic character core

Status: Accepted

## Context

VS004 gave characters a generic `rulesetId` plus versioned `rulesetData`, but did not yet implement a concrete ruleset adapter. The first playable character flow needs D&D 2024 validation and derived values now: ability modifiers, proficiency bonus, baseline armor class, HP suggestions and initiative modifier.

Putting those concepts directly in `@utt/domain` would make the generic core depend on D&D vocabulary and would make later rulesets increasingly expensive to add.

## Decision

D&D 2024 mechanics live in the dedicated workspace package `@utt/rules-dnd2024`.

The generic character model remains `CharacterDefinition` + `CharacterResource` with opaque ruleset-owned data. The game server selects a ruleset adapter by `rulesetId`; the web builder and sheet may import the same adapter for presentation and suggestions. Server-side validation remains authoritative before D&D ruleset data is persisted.

The first adapter intentionally implements only the playable-loop subset: identity choices, level, six final ability scores, AC, speed, notes, proficiency/ability math and HP suggestions. Background grants, species traits, class features, feats, inventory, spells and the future Action/Effect engine are not inferred or silently fabricated.

## Consequences

- generic core stays usable by future/custom rulesets;
- D&D-specific behavior has one explicit dependency boundary;
- web suggestions and server validation can share deterministic rules without duplicating formulas;
- the adapter can grow or later split into content packs without changing character identity/resource persistence;
- MVP can ship a useful D&D sheet before the full Content/Action/Effect architecture exists.
