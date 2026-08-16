# ADR 0016 — Simple fog placeholder before full vision

Status: Accepted

## Context
UTT now has an immersive Virtual Table, but full walls/doors/vision would delay the Character Foundation milestone. We still want a usable DM reveal affordance for current playtests.

## Decision
Implement a deliberately coarse, fixed-cell fog layer as scene state:

- 12×8 normalized cells independent of map grid type;
- `scene_fog` persists `enabled` plus revealed cell keys;
- Colyseus projects fog for the active scene and accepts active-scene-only fog intents;
- Director controls reveal state; Play consumes the projection;
- covered Play cells suppress token rendering/interaction.

Fog state is gameplay/UI state, not an authorization mechanism.

## Consequences
- current playtests get a simple DM reveal loop immediately;
- fog survives scene switches and room restart;
- the model can be replaced later without coupling walls/LOS to Character work;
- fixed cells are intentionally coarse and are not derived from square/hex grid geometry;
- scene image bytes are still delivered to the client, so this cannot protect secrets;
- authenticated roles and server-side filtered visibility remain prerequisites for secure fog of war.
