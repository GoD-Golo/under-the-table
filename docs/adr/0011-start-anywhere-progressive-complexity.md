# ADR 0011 — Start anywhere, reveal complexity progressively

Status: accepted.

## Decision

A campaign does not require a top-down world hierarchy before it can be useful. A user may start with any useful artifact: a city, a combat test, a tavern, a dungeon room, a world map, a lore entry or a character-facing scene.

The product should expose only the controls needed for the current task and allow the user to grow outward by linking or enriching existing entities.

## Consequence

There is no mandatory setup wizard that asks for world, continent, region, city and campaign metadata before play can begin.

A quick combat may initially be only a scene + image/grid + tokens. Later the same scene can be attached to a place, lore, campaign history, world graph relations and travel context without migration into a different subsystem.

This principle applies to both UX and data modeling: entities may exist partially and gain capabilities over time.
