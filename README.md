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
- Virtual Table is immersive by default: application chrome disappears, leaving only discreet bubble/tray controls and optional browser fullscreen;
- the same Character/Dice/Log widgets float above the map;
- Companion preserves a map-free surface for physical play;
- Companion can use connected campaign state or explicit browser-local offline state;
- mobile Virtual Table uses a compact HUD drawer so the map remains visible.

**Vertical Slice 003.7** adds a deliberately small fog placeholder:

- Director toggles fog and reveals/coats fixed cells on the active scene;
- fog state is live-synchronized and persists across restart;
- covered Play cells suppress token rendering/interaction;
- this is explicitly visual UX, not secure player-secret delivery.

**Vertical Slice 004** establishes the Character Foundation:

- durable multi-character definitions and runtime resources;
- D&D 2024 represented as a ruleset id, not hard-coded core behavior;
- character HP separated from session snapshots and targeted by `characterId`;
- per-device character selection for party play;
- minimal Character Library for create/select;
- legacy Mira/HP migration from the earlier single-character room state.

**Vertical Slice 005** turns Character Foundation into a near-MVP playable loop:

- D&D 2024 mechanics live behind the dedicated `@utt/rules-dnd2024` adapter instead of generic core;
- responsive create/edit Character Builder with class/species/background/level, six final ability scores, AC/speed/HP and notes;
- playable sheet with derived modifiers, proficiency bonus, initiative and one-click ability checks;
- authoritative initiative for characters plus quick ad-hoc NPCs;
- synchronized order, active turn, round advance and clear-combat flow;
- initiative/turn recovery from the session snapshot after a game-server restart;
- desktop Companion, floating Virtual Table HUD and mobile Combat drawer all use the same session state.

**Vertical Slice 006** closes the basic combat loop:

- save and skill modifiers derived by the D&D 2024 adapter;
- explicit skill proficiencies and editable basic weapon attacks in Character Builder;
- passive Perception plus Saves/Skills roll surfaces;
- lightweight initiative NPCs with encounter AC/HP;
- server-authoritative target selection and basic attack/damage resolution;
- durable character HP and encounter NPC HP keep separate sources of truth;
- Actions/Checks are available in Companion, floating Virtual Table HUD and the mobile drawer.

**Brand / landing pass** adds the first intentional product-facing surface:

- root landing page with the dragon-eye-under-table identity;
- responsive laptop/phone/tablet/table choreography built in CSS/SVG;
- entry into the product without mounting Colyseus on passive showcase visits;
- lightweight spell visual-language preview by base slot and school;
- matching favicon and runtime home mark.

**Vertical Slice 007** turns the feature set into a coherent product flow:

- Home is the real product entry, with Campaigns, Characters and active-table continuation;
- Campaign and Table are persistent contexts separate from Session and Live Room;
- Campaign Home, Table Home and Characters Home route existing Director/Play surfaces through those contexts;
- existing characters are linked as campaign/table memberships without duplicating their durable state;
- product browsing uses a socket-free HTTP read model; Colyseus mounts only for Play/Director;
- browser Back/Forward, mobile scroll reset and Virtual Table -> Table Home semantics are explicit.

**Vertical Slice 008** implements the character campaign lifecycle:

- reusable `CharacterIdentity` records own independent CampaignCharacter versions;
- `Add to Campaign` supports a fixed level-1 build or explicit copy-current-build import with no later cross-campaign synchronization;
- `Add to Table` is membership/reference only and the live room projects only characters referenced by its Table;
- structural changes use pending DM review with stale-write protection, while gameplay HP/combat mutations remain Colyseus-authoritative;
- DM structural override and DM-private character state have explicit product/data boundaries;
- the live Character Library is selection-only so structural lifecycle rules cannot be bypassed through the normal runtime UI.

**Vertical Slice 009** implements permissions and Co-DM scopes:

- roles are readable presets, while stored capabilities/scopes drive policy decisions;
- Campaign/world and Table/session capabilities are independent;
- Owner can configure delegated collaborators, exact world scopes and per-Table access;
- Policy Preview evaluates another membership without impersonation or executing an action;
- Atlas HTTP, character lifecycle and Colyseus live commands are policy-gated centrally;
- `session.join` is checked before room presence;
- authentication is still deferred, so all actual preview traffic resolves to the system-managed local Owner principal.

**Vertical Slice 010** hardens live reliability and recovery:

- visible Play/Director clients use a non-persistent application heartbeat to detect frozen live rooms;
- stale synchronized campaign state is cleared on heartbeat timeout, transport leave or browser offline;
- Colyseus automatic reconnect is disabled so UTT has one explicit Retry policy;
- Offline Companion remains selected after campaign recovery until the user chooses Campaign again;
- connection failures and command rejections have separate, visible UX;
- heartbeat/rejected-command traffic does not create gameplay events or persistence writes.

Full content/choice resolution (background feats, species/class features, inventory/equipment, Weapon Mastery and spells), the general targeting/Action/Effect engines, walls/dynamic vision, travel rules, hex-map generation, authenticated principal resolution and secure visibility/secret-lore authorization remain separate milestones.

## Development architecture

`browser -> Nginx gateway -> Colyseus / game HTTP API -> SurrealDB + private asset volume`

Only the gateway is published to the homelab Tailscale address. SurrealDB, Colyseus and the asset volume stay private to Compose. The homelab enables this development architecture but is not a product dependency.

## Canonical project docs

- `AGENTS.md` — rules for future engineering agents
- `docs/VISION.md` — product direction and non-negotiable principles
- `docs/PRODUCT-FLOW-DIRECTION.md` — Home/Campaign/Table/Character flow, permissions direction and planned slices
- `docs/ARCHITECTURE.md` — current implemented technical boundaries
- `docs/SCENE-ATLAS-DIRECTION.md` — Atlas/map/lore direction beyond the proven primitive
- `docs/HOMELAB-DEVELOPMENT.md` — why the homelab changed feasible choices
- `docs/VERTICAL-SLICE-001.md` — live-runtime foundation evidence
- `docs/VERTICAL-SLICE-002.md` — Scene Atlas foundation evidence
- `docs/VERTICAL-SLICE-003.md` — authoritative token foundation evidence
- `docs/VERTICAL-SLICE-003-5.md` — freeform workspace and interaction stabilization evidence
- `docs/VERTICAL-SLICE-003-6.md` — unified Virtual Table / Companion evidence
- `docs/VERTICAL-SLICE-003-7.md` — simple fog placeholder evidence
- `docs/VERTICAL-SLICE-004.md` — Character Foundation evidence
- `docs/VERTICAL-SLICE-005.md` — playable character + initiative loop evidence
- `docs/VERTICAL-SLICE-006.md` — checks + basic combat loop evidence
- `docs/VERTICAL-SLICE-007.md` — Product Home, Campaign/Table context and navigation evidence
- `docs/VERTICAL-SLICE-008.md` — CharacterIdentity, campaign versions, Table references and governance evidence
- `docs/VERTICAL-SLICE-009.md` — capability policy, Co-DM scopes, collaborators and enforcement evidence
- `docs/VERTICAL-SLICE-010.md` — live-room heartbeat, stale-state invalidation, explicit Retry and error UX evidence
- `docs/BRAND-AND-LANDING.md` — product identity, landing composition and visual-language boundaries
- `docs/LEGACY-REVIEW.md` — what v0.0.4 may and may not influence
- `docs/adr/` — architecture decision records
- `docs/RUNBOOK.md` — operator/developer commands

## Legacy

`under-the-table-v0.0.4` is reference material only. No source, schema or dependency from it is inherited automatically.
