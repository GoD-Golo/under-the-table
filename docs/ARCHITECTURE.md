# Architecture

Status: **foundation + Vertical Slice 003.5 table UX stabilization**

## Boundary model

```text
React UI / freeform DOM workspaces + Scene Atlas
        |                \
        | live intents    \ durable world edits / assets
        v                  v
Colyseus live runtime    game-server HTTP API
        |                  |
        | events/snapshot  | scene/entity/hotspot records
        +--------+---------+
                 v
              SurrealDB

scene image bytes -> private Docker asset volume
```

Colyseus remains authoritative for current table state. SurrealDB owns durable world/session records. Scene image bytes are stored outside the database and referenced by generated asset keys.

## Repository shape

- `apps/web` — React/Vite Atlas + game HUD
- `apps/game-server` — Colyseus runtime plus private development HTTP API
- `packages/domain` — pure dice/HP/scene validation and domain types
- `packages/protocol` — Colyseus state/messages plus Atlas transport DTOs
- `infra` — Docker images and Nginx gateway
- `docs/adr` — architectural decisions and constraints

## Current live state

The room contains the VS001 character/roll/HP state, `activeSceneId`, and a synchronized map of tokens for the active scene only. `present_scene` is an authoritative command: the server validates that the target scene exists, persists a `scene_presented` event + updated snapshot, then changes live state. A restarted room restores the active scene from the snapshot.

Director browsing is intentionally **not** authoritative. A client can pan, zoom, select hotspots and browse another scene without moving the table. Clients that follow the table react to `activeSceneId`; if that scene was created after their Atlas snapshot, they refresh durable Atlas data before navigating.

## Current durable world model

VS002/VS003 currently use four small `SCHEMAFULL` world tables:

- `world_entity` — canonical lore/place identity with a player-safe summary for this slice;
- `scene` — visual surface, optional world entity reference, grid config and background asset key;
- `scene_hotspot` — normalized point on a scene with optional scene/entity links;
- `scene_token` — player/NPC/object placement, normalized coordinates and optional provisional controller.

The model deliberately permits partial entities. A scene may exist without lore; a hotspot may be lore-only; a combat scene can later be connected into the world. Creating a hotspot + child scene + optional lore entity is one database transaction.

## State categories

**Authoritative live state:** HP/roll/event state, presence, `activeSceneId`, and the active scene token projection.

**Durable world/session state:** scenes, hotspots, lore entities, scene tokens, session events and recovery snapshots.

**Durable asset state:** uploaded PNG/JPEG/WebP bytes in the private `scene-assets` Docker volume. SurrealDB stores only generated asset keys and image dimensions.

**Presentation state:** pan/zoom, current private browse scene, selected hotspot, freeform widget placements/z-order and optional snap-grid layout. These are not game truth. Live and Director use the same role-neutral freeform primitive with different widget content.

## Not implemented yet

Token portraits/sizing/rotation, walls, doors, fog/vision, scene permissions, DM-secret lore delivery, initiative/targeting, map drawing, travel automation, the hex-map creator, full lore editing and Content/Character/Action/Effect engines remain future work.
