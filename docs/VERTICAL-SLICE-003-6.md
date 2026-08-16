# Vertical Slice 003.6 — Unified Play surface

Status: **complete / proven on homelab — 2026-08-16**.

## Problem
Before this slice, `Live` rendered only the freeform HUD. The active scene, map and synchronized tokens were visible only in Director. That contradicted the session-first VTT direction while the existing HUD remained valuable for physical-table play.

## Implemented behavior
- top-level workspace is now `Director | Play`;
- Play defaults to `Virtual Table` for a connected campaign;
- Virtual Table renders the authoritative `activeSceneId`, scene background/grid and live token projection as the base layer;
- Character, Dice and Table Log reuse one widget implementation and float above the scene through `FreeformSurface`;
- Virtual Table does not expose Director `+ Pin` / `+ Token` authoring controls;
- HUD can be hidden or reset without affecting map/session truth;
- Companion preserves the map-free HUD for physical-table use;
- Companion can use Campaign-authoritative state or explicit Offline local state;
- Offline local supports persistent HP, local dice and a local event log;
- copying current campaign character state into Offline is explicit;
- reconnect never silently replaces Offline with Campaign;
- mobile Virtual Table keeps the map visible and presents one Character/Dice/Log drawer at a time.

## Executable evidence
Baseline on `main` reproduced the original problem with `sceneViewport=0`, `tokenCount=0`, `hudStage=1` in Live.

After implementation, browser QA on the Tailscale preview observed `sceneViewport=1`, active scene `Copper Road Ambush`, synchronized tokens and three HUD widgets mounted on the same Virtual Table surface. No Director placement controls were present.

Two independent browser contexts moved `Mira Voss`: the peer converged from approximately `(638.2, 448.3)` to `(710.1, 484.2)`, successful-move post-release excursion remained `0 px`, and the token was restored to its original visual position. No console errors were recorded.

With the game-server fully stopped, Offline Companion changed HP `10 -> 9`, rolled locally, and retained both HP and roll after a static-page reload. Campaign controls were disabled. A separate reconnect test proved that Offline remained selected after the game-server returned and `Retry campaign` succeeded; Campaign became available but was not chosen automatically.

Desktop 1440×900 and mobile 390×844 screenshots were visually inspected. Mobile uses a compact bottom drawer so the map remains the primary surface.

Full workspace gate passed: strict typecheck, ESLint, 14 domain tests, 4 game-server tests, and production builds.

## Boundaries / non-goals
`Offline local` does **not** mean the application shell is installable or bootable with no web server; PWA/service-worker caching is future work. Offline changes are not synchronized or conflict-merged into a campaign. Auth/roles, player-specific scene filtering, walls, doors, vision/fog, initiative/targeting and full Character/Action/Effect engines remain separate milestones.

An abrupt loss of an already-open Colyseus WebSocket was not observed to flip the UI to `disconnected` within a 15-second QA window; startup with the campaign runtime unavailable and explicit retry/reconnect are proven. Connection liveness/heartbeat UX remains a future reliability concern rather than being hidden by this slice.
