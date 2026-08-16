# Under The Table — next foundation

Under The Table is a session-first, game-like tabletop runtime. D&D 2024 is the first ruleset, not a hard-coded assumption in the core.

The product goal is one continuous tool for world building, lore, scene navigation, characters and live play. Complexity should be progressive: a user may start from a combat test, image, city, lore entry or other useful artifact and grow outward only when needed.

## Current milestone

**Vertical Slice 001** proved the authoritative live foundation: synchronized Colyseus room state, server-side dice/HP transitions, durable events/snapshots, restart recovery and a private Tailscale preview.

**Vertical Slice 002** proves the Scene Atlas primitive:

- persistent blank/image/combat scenes;
- optional square/hex grids;
- persistent image backgrounds outside the database;
- local pan/zoom and private director browsing;
- normalized scene hotspots;
- scene-to-scene links and player-safe lore summaries;
- create-linked-scene + lore directly from a pin;
- authoritative `Present to table`;
- follower refresh when a newly-created scene becomes live;
- active-scene recovery after game-server restart.

**Vertical Slice 003** turns that Atlas into a shared tabletop surface:

- durable player/NPC/object scene tokens;
- direct token placement from the map;
- server-authoritative drag/movement;
- active-scene token synchronization through Colyseus;
- token persistence/recovery through SurrealDB;
- provisional claimed-player ownership semantics without pretending client names are authentication.

**Vertical Slice 003.5** stabilizes the table UX before vision/combat work:

- freeform Live widgets with overlap, free resize and z-order;
- optional Snap Grid mode instead of mandatory compaction;
- the same freeform primitive for floating Director tools;
- optimistic token movement held until authoritative confirmation, removing accepted-move rubber-band;
- contextual map popovers for scene/lore hotspots.

**Vertical Slice 003.6** unifies the actual play experience:

- Virtual Table uses the active scene/map + synchronized tokens as the base live surface;
- the same Character/Dice/Log widgets float above the map;
- Companion preserves a map-free surface for physical play;
- Companion can use connected campaign state or explicit browser-local offline state;
- mobile Virtual Table uses a compact HUD drawer so the map remains visible.

Walls/doors, fog/vision, initiative/targeting, travel rules, hex-map generation, auth/roles, secret-lore authorization and the Content/Character/Action/Effect engines remain intentionally separate milestones.

## Development architecture

`browser -> Nginx gateway -> Colyseus / game HTTP API -> SurrealDB + private asset volume`

Only the gateway is published to the homelab Tailscale address. SurrealDB, Colyseus and the asset volume stay private to Compose. The homelab enables this development architecture but is not a product dependency.

## Canonical project docs

- `AGENTS.md` — rules for future engineering agents
- `docs/VISION.md` — product direction and non-negotiable principles
- `docs/ARCHITECTURE.md` — current implemented technical boundaries
- `docs/SCENE-ATLAS-DIRECTION.md` — Atlas/map/lore direction beyond the proven primitive
- `docs/HOMELAB-DEVELOPMENT.md` — why the homelab changed feasible choices
- `docs/VERTICAL-SLICE-001.md` — live-runtime foundation evidence
- `docs/VERTICAL-SLICE-002.md` — Scene Atlas foundation evidence
- `docs/VERTICAL-SLICE-003.md` — authoritative token foundation evidence
- `docs/VERTICAL-SLICE-003-5.md` — freeform workspace and interaction stabilization evidence
- `docs/VERTICAL-SLICE-003-6.md` — unified Virtual Table / Companion evidence
- `docs/LEGACY-REVIEW.md` — what v0.0.4 may and may not influence
- `docs/adr/` — architecture decision records
- `docs/RUNBOOK.md` — operator/developer commands

## Legacy

`under-the-table-v0.0.4` is reference material only. No source, schema or dependency from it is inherited automatically.
