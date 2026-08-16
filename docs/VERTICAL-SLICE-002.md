# Vertical Slice 002 — Scene Atlas foundation

Status: **complete / proven on homelab — 2026-08-16**.

## Question this slice answers

Can Under The Table add a flexible scene/atlas layer without breaking the authoritative live-runtime boundary or forcing a top-down world workflow?

**Answer:** yes, for the primitive implemented here. A user can start with a blank/image/combat scene, browse independently, connect scenes with hotspots and lore, then explicitly present a scene to the live table.

## Implemented behavior

- persistent `scene`, `scene_hotspot` and `world_entity` records in SurrealDB;
- starter `The First Table` scene created idempotently;
- Blank, Image and Quick Combat scene creation;
- optional square/hex/none grid selected at creation;
- PNG/JPEG/WebP background upload (12 MB request limit) into a private persistent asset volume;
- DOM/SVG playfield with local pan, wheel zoom and Fit;
- normalized hotspot coordinates independent of viewport/camera;
- hotspot can link an existing scene, create a new child scene, attach lore, or remain a pin/lore point;
- linked child scene + optional lore entity + hotspot are created atomically;
- lore summary appears in the inspector without leaving the Atlas flow;
- director can browse privately while another client remains on the live scene;
- `Present to table` sends `present_scene` intent through Colyseus;
- followers refresh Atlas data if the newly presented scene did not exist in their previous durable snapshot;
- scene presentation becomes a durable event and survives game-server restart;
- Atlas and Table HUD are two views in the same application.

## Final development fixture

The clean handoff dataset intentionally contains only:

1. `The First Table` — starter blank scene;
2. `Copper Road Ambush` — combat scene with persistent image + square grid + lore;
3. `Greyhaven Gate` — linked blank scene with lore;
4. one `Greyhaven Gate` hotspot connecting the combat map to the child scene.

The fixture demonstrates progressive complexity rather than a prebuilt campaign.

## Browser evidence

Headless Chromium used two isolated browser contexts through the real Nginx/Colyseus path. It freshly re-uploaded the battlemap, verified the square grid, changed zoom from 67% to 74%, opened the hotspot lore, entered the linked scene and then presented it.

Before presentation the second browser remained on `The First Table`. After presentation both browsers displayed `Greyhaven Gate`. The final browser pass reported **zero console/page errors**. A separate Chromium pass using host networking loaded the exact Tailscale preview `http://100.91.197.37:4310`, joined the live room, created a temporary hex-grid probe, verified the visible hex overlay and `Present to table` control, and also reported zero console/page errors. The temporary probe record was deleted immediately afterward.

Ignored QA screenshots:

- `.runtime/vs002-atlas-parent.png` — image + grid + pin + lore while browsing privately;
- `.runtime/vs002-atlas-director.png` — child scene after presentation;
- `.runtime/vs002-atlas-follower.png` — independent follower after live transition.

## Recovery evidence

A two-client live smoke run reached room `hl1hzbLH9`, sequence `21`, HP `18`, with active scene `ef2aee0e-237b-4c98-9179-ba8e7d4fbfdb` (`Greyhaven Gate`).

After restarting **only** `game-server`, recovery joined new room `Csm3KNN31` at the same sequence `21`, HP `18` and the same `activeSceneId`. Atlas inspection still returned 3 scenes / 1 hotspot / 2 entities, and the persisted scene image returned HTTP 200.

## Quality evidence

Fresh integrated `pnpm check` passed:

- strict TypeScript checks across all packages/apps;
- ESLint with zero findings;
- domain tests: 11/11;
- game-server tests: 3/3;
- production builds for domain, protocol, game-server and web.

## Explicit non-goals

This slice does **not** claim tokens, fog/vision, walls/doors, drawing tools, travel rules, hex-map generation, full battle-map authoring, scene deletion/versioning, multiplayer editing presence, auth/roles or secret-lore authorization. Those remain separate milestones.

## Failures that improved the design

- A follower could receive a new `activeSceneId` before its old Atlas snapshot knew that scene. The client now refreshes durable Atlas data when live state references an unknown scene.
- React's wheel event path produced a passive-listener `preventDefault` console error. Map zoom now uses an explicit non-passive DOM wheel listener.
- QA reruns originally created duplicate demo scenes because an accessible-name locator was too strict; duplicate development data and asset directories were cleaned, and the harness now targets scene-list/pin surfaces semantically.
- Docker QA containers on this host currently cannot route to the host's Tailscale IP. Browser QA therefore uses `web:8080` on the same Compose network, while host-level checks separately prove `100.91.197.37:4310` is the only published preview listener.
