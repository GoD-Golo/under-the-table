# ADR 0021 — Quick NPC vitals belong to encounter session state

Status: Accepted

## Context

VS005 could quick-add an NPC label and initiative modifier without creating a durable world entity. VS006 needs those lightweight opponents to be valid attack targets with Armor Class and Hit Points.

Turning every quick combat probe into a permanent character/NPC record would violate progressive complexity. Storing durable player-character HP in initiative would create the opposite problem by duplicating character truth.

## Decision

A quick-added NPC initiative entry may carry bounded `armorClass`, `currentHp` and `maxHp` fields. Those values are encounter/session runtime and persist through the existing recovery snapshot while that initiative roster exists.

A durable character initiative entry does not copy its AC/HP. AC is derived from its ruleset definition and HP stays in `character_resource`.

When an attack damages a durable character, the character-resource change and session event/snapshot are committed atomically. When an attack damages a quick NPC, the changed encounter entry is committed in the session snapshot.

## Consequences

Quick combat remains cheap and disposable, while real characters retain one durable source of truth. A future Monster/NPC content model can replace quick entries without requiring the current session snapshot to become the canonical monster database.