# Architecture

Status: **near-MVP foundation + VS007 Product Home & Campaign Flow**

## Boundary model

```text
React UI / Landing + Product Home + Campaign/Table context + Director/Play
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

The landing and product-browsing surfaces (Home, Campaigns, Characters, Campaign Home, Table Home) use an HTTP product read model and do **not** mount `useLiveRoom()`. Entering contextual Play or Director mounts the runtime workspace and only then opens Colyseus. See ADR 0022 and VS007.

## Repository shape

- `apps/web` — React/Vite landing + product shell + Atlas + game HUD
- `apps/game-server` — Colyseus runtime plus private development HTTP API
- `packages/domain` — ruleset-neutral campaign/table/character/session/scene validation and domain types
- `packages/rules-dnd2024` — D&D 2024 adapter, validation and derived character math
- `packages/protocol` — Colyseus state/messages plus Atlas and Product HTTP DTOs
- `infra` — Docker images and Nginx gateway
- `docs/adr` — architectural decisions and constraints

## Current live state

The room contains session roll/event state, recoverable initiative/turn state including lightweight NPC AC/HP, `activeSceneId`, a synchronized map of durable character runtimes, active-scene tokens, and the active scene fog placeholder projection (`fogEnabled` + revealed fixed cells). Character HP is a character resource, not a top-level room/session or initiative field. Basic attacks are server-authoritative: clients identify attacker/action/target while the server derives D&D modifiers, AC/HP and damage from canonical state. `present_scene` is an authoritative command: the server validates that the target scene exists, persists a `scene_presented` event + updated snapshot, then changes live state. A restarted room restores the active scene from the snapshot.

Director browsing is intentionally **not** authoritative. A client can pan, zoom, select hotspots and browse another scene without moving the table. Clients that follow the table react to `activeSceneId`; if that scene was created after their Atlas snapshot, they refresh durable Atlas data before navigating.

Play is a projection over session state. Virtual Table resolves `activeSceneId` to the durable scene record and renders scene + active token projection underneath a local freeform HUD. Companion renders the same session widgets without a map. Campaign Companion sends intents to Colyseus; Offline Companion instead mutates browser-local HP/dice/log state and never auto-merges it back into campaign state.

VS007 adds a durable product context in front of that live runtime. `Campaign` owns the shared campaign context; `CampaignTable` identifies a persistent play group and may reference a current Session. The starter `Main Table` points at the existing `vertical-slice-001` Session, preserving all existing event/snapshot history. The HTTP `/api/product` read model combines those durable relations with current scene/session summaries for Home without creating live presence.

The current Colyseus definition is still one `vertical_slice` live room/session. Persistent data and navigation can represent multiple Tables, but simultaneous independent per-Table rooms are not implemented yet and must not be inferred from VS007.

## Current durable world model

The durable model now includes the original world/character tables plus VS007 product-context relations. The world/character tables are:

- `world_entity` — canonical lore/place identity with a player-safe summary for this slice;
- `scene` — visual surface, optional world entity reference, grid config and background asset key;
- `scene_hotspot` — normalized point on a scene with optional scene/entity links;
- `scene_token` — player/NPC/object placement, normalized coordinates and optional provisional controller;
- `scene_fog` — active-scene placeholder fog enabled state and fixed revealed-cell keys;
- `character` — durable character identity, ruleset id/version and ruleset-owned data;
- `character_resource` — mutable keyed runtime resources such as HP.

VS007 adds:

- `campaign` — shared campaign identity/context;
- `campaign_table` — persistent play group/context with optional current Session id;
- `campaign_membership` — preview membership labels, capabilities and serialized typed scopes;
- `table_membership` — Table-specific membership labels/capabilities;
- `campaign_character_membership` — links durable characters into a Campaign;
- `table_character_membership` — references the same Campaign character from one or more Tables without copying it.

The existing `character` records remain the canonical durable character data for the current implementation. VS007 wraps them as campaign-character memberships; global `CharacterIdentity` is not implemented until the lifecycle slice.

The model deliberately permits partial entities. A scene may exist without lore; a hotspot may be lore-only; a combat scene can later be connected into the world. Creating a hotspot + child scene + optional lore entity is one database transaction.

## State categories

**Authoritative live state:** roll/event state, initiative round/order/active turn plus quick-NPC encounter vitals, presence, `activeSceneId`, projected durable character runtimes/resources, the active scene token projection, and active-scene placeholder fog projection.

**Durable world/session/product state:** campaigns, Tables, membership relations, scenes, hotspots, lore entities, scene tokens, scene fog placeholder state, character definitions/resources, session events and recovery snapshots. Initiative and quick-NPC AC/HP are encounter/session data persisted inside the recovery snapshot rather than a world table. Durable character HP remains in `character_resource`. Session snapshots no longer duplicate one character name/HP.

**Durable asset state:** uploaded PNG/JPEG/WebP bytes in the private `scene-assets` Docker volume. SurrealDB stores only generated asset keys and image dimensions.

**Presentation/local-only state:** pan/zoom, Play/Companion mode, selected character id per browser, current private browse scene, selected hotspot, freeform widget placements/z-order, optional snap-grid layout, and explicit Offline Companion character/dice/log state. These are not authoritative campaign truth. Play and Director use the same role-neutral freeform primitive with different widget content.

## Not implemented yet

Concurrent per-Table live rooms, CharacterIdentity/forking and approval/private-state lifecycle, editable Co-DM capability scopes, auth/security enforcement, scheduling/polls/notifications, campaign/table creation UI, token portraits/sizing/rotation, walls, secure dynamic vision, DM-secret delivery, travel/map authoring, deeper D&D content resolution, NPC attack automation, character ownership/token binding and the general Content/Action/Effect engines remain future work.
