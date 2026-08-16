# ADR 0020 — Basic attack resolution is an MVP bridge

Status: Accepted

## Context

UTT ultimately needs a generic Action/Effect engine for attacks, spells, items, features and homebrew. Building that complete engine before validating a usable combat loop would delay an otherwise testable near-MVP.

At the same time, resolving attacks only in the browser would violate the existing server-authority boundary and teach the UI the wrong architecture.

## Decision

VS006 implements one narrow authoritative `perform_basic_attack` command.

The client identifies the attacking character, one attack stored in that character's ruleset data, and an initiative target. It does not send authoritative hit bonuses, AC, damage modifiers or damage totals.

The game server asks `@utt/rules-dnd2024` for the stored attack data and derived modifiers, rolls attack/damage using server RNG, checks the target and persists the resulting event/state before updating synchronized state.

This handler is explicitly a bridge. It must remain small enough to be replaced by the generic Action/Effect engine instead of evolving into a parallel spell/feature engine.