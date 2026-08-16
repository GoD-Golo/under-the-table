# ADR 0019 — Initiative is recoverable session runtime, not character/world data

Status: Accepted

## Context

A near-MVP play loop needs a combat turn order for player characters and ad-hoc NPCs. Initiative belongs to the current encounter: it should synchronize live and survive a server restart, but it should not become permanent character or world state.

## Decision

Initiative is stored in the authoritative session recovery snapshot and projected through Colyseus as:

- round number;
- active entry index;
- ordered entries with id, label, score and optional character id.

Roll, advance and clear are Colyseus intents. D&D 2024 character initiative ignores a client-provided modifier and derives Dexterity modifier on the server through `@utt/rules-dnd2024`. Ad-hoc NPC entries accept a bounded explicit modifier. The server rolls the d20, persists the initiative event and next recovery snapshot, and only then mutates synchronized state.

No separate durable initiative table is introduced for this MVP. Historical session events remain the audit trail; the snapshot is the recovery representation.

## Consequences

- all connected clients converge on one combat order and active turn;
- restart recovery restores round/order/active turn without turning an encounter into world data;
- player character initiative has an authoritative ruleset-derived modifier;
- NPCs can be added quickly without creating a full durable character;
- auth is still deferred, so any connected private-preview client can currently roll, advance or clear initiative.
