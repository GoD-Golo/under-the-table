# ADR 0010 — One world, one flow

Status: accepted direction.

## Context
Under The Table should not evolve into separate Atlas, Lore, World Graph and Live products that duplicate the same places, NPCs, factions, scenes and discovery state.

## Decision
Use one shared world/domain model and expose different views over it.

A place, NPC, faction, quest or other world entity is canonical once. Scenes, maps, lore panels, graph views and live-session surfaces reference that same entity by id.

The product flow should remain continuous: explore an atlas, open lore, follow relationships, enter or present a scene, run it live, then persist resulting world changes back onto the same entities.
