# Architecture

Status: **foundation + Vertical Slice 004 Character Foundation**

## Boundary model

```text
React UI / Director + unified Play surfaces + Scene Atlas
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
- `packages/domain` — pure dice/HP/scene/character validation and domain types
- `packages/protocol` — Colyseus state/messages plus Atlas transport DTOs
- `infra` — Docker images and Nginx gateway
- `docs/adr` — architectural decisions and constraints

## Current live state

The room contains session roll/event state, `activeSceneId`, a synchronized map of durable character runtimes, active-scene tokens, and the active scene fog placeholder projection (`fogEnabled` + revealed fixed cells). Character HP is a character resource, not a top-level room/session field. `present_scene` is an authoritative command: the server validates that the target scene exists, persists a `scene_presented` event + updated snapshot, then changes live state. A restarted room restores the active scene from the snapshot.

Director browsing is intentionally **not** authoritative. A client can pan, zoom, select hotspots and browse another scene without moving the table. Clients that follow the table react to `activeSceneId`; if that scene was created after their Atlas snapshot, they refresh durable Atlas data before navigating.

Play is a projection over session state. Virtual Table resolves `activeSceneId` to the durable scene record and renders scene + active token projection underneath a local freeform HUD. Companion renders the same session widgets without a map. Campaign Companion sends intents to Colyseus; Offline Companion instead mutates browser-local HP/dice/log state and never auto-merges it back into campaign state.

## Current durable world model

VS002–VS004 currently use seven small `SCHEMAFULL` world/character tables:

- `world_entity` — canonical lore/place identity with a player-safe summary for this slice;
- `scene` — visual surface, optional world entity reference, grid config and background asset key;
- `scene_hotspot` — normalized point on a scene with optional scene/entity links;
- `scene_token` — player/NPC/object placement, normalized coordinates and optional provisional controller;
- `scene_fog` — active-scene placeholder fog enabled state and fixed revealed-cell keys;
- `character` — durable character identity, ruleset id/version and ruleset-owned data;
- `character_resource` — mutable keyed runtime resources such as HP.

The model deliberately permits partial entities. A scene may exist without lore; a hotspot may be lore-only; a combat scene can later be connected into the world. Creating a hotspot + child scene + optional lore entity is one database transaction.

## State categories

**Authoritative live state:** roll/event state, presence, `activeSceneId`, projected durable character runtimes/resources, the active scene token projection, and active-scene placeholder fog projection.

**Durable world/session state:** scenes, hotspots, lore entities, scene tokens, scene fog placeholder state, character definitions/resources, session events and recovery snapshots. Session snapshots no longer duplicate one character name/HP.

**Durable asset state:** uploaded PNG/JPEG/WebP bytes in the private `scene-assets` Docker volume. SurrealDB stores only generated asset keys and image dimensions.

**Presentation/local-only state:** pan/zoom, Play/Companion mode, selected character id per browser, current private browse scene, selected hotspot, freeform widget placements/z-order, optional snap-grid layout, and explicit Offline Companion character/dice/log state. These are not authoritative campaign truth. Play and Director use the same role-neutral freeform primitive with different widget content.

## Not implemented yet

Token portraits/sizing/rotation, walls, doors, secure/dynamic fog and vision, scene permissions, DM-secret lore delivery, initiative/targeting, map drawing, travel automation, the hex-map creator, full lore editing, the D&D 2024 Character Builder, character ownership/token binding and Content/Action/Effect engines remain future work.
