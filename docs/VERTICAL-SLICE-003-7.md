# Vertical Slice 003.7 — Simple fog placeholder

Status: **complete / proven on homelab — 2026-08-16**.

## Goal
Provide a minimal DM-reveal loop before moving into Character Foundation, without implementing walls, line-of-sight, lighting or secure player-specific visibility.

## Implemented
- fixed 12×8 fog cells per scene;
- fog can be edited only for the authoritative active scene;
- Director can toggle Fog and enter/exit Reveal mode;
- Reveal mode temporarily retracts floating DM widgets so the whole map is reachable;
- clicking a cell toggles revealed/covered state;
- fog state is server-authoritative, synchronized through Colyseus and persisted in `scene_fog`;
- scene presentation and game-server restart restore that scene's fog state;
- Play renders covered cells opaque;
- Play does not render or allow interaction with tokens located in covered fog cells.

## Evidence
- two SDK clients converged on Fog ON plus the same revealed cell;
- after game-server restart, a newly-created room restored fog enabled + revealed cells from SurrealDB;
- browser QA used separate Director and Play clients on the Tailscale preview;
- with fog fully covered, Play token projection dropped from 4 visible tokens to 0;
- revealing the cell containing one token made exactly that token visible again without refresh;
- 95 covered + 1 revealed cell were observed in Play after the reveal;
- zero browser console/page errors were recorded.

## Security boundary
This is **not secure fog of war**. The browser still receives the scene asset, and the current private development environment has no authenticated DM/player roles. A technically capable client could bypass the visual mask. Secure visibility requires role-aware server filtering / asset delivery and remains future work.

## Deferred
Walls, doors, LOS, dynamic token vision, light sources, polygon fog, secure per-player visibility and vision-based token filtering are intentionally deferred. The next product milestone is Character Foundation.
