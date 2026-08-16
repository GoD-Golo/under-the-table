# Vertical Slice 003 — Authoritative scene tokens

Status: **complete / proven on homelab — 2026-08-16**.

## Question this slice answers
Can the Scene Atlas become a real shared tabletop surface by adding durable draggable tokens without moving game authority into React or prematurely choosing authentication?

**Answer:** yes for the foundation scope. Player, NPC and object tokens persist on scenes, the active scene projects them into Colyseus, movement is server-authoritative, and the state recovers after restart.

## Implemented behavior
- persistent `scene_token` SCHEMAFULL records in SurrealDB;
- `player`, `npc` and `object` token kinds;
- normalized scene coordinates independent of camera/viewport;
- direct placement from the Atlas surface;
- token rendering scaled in world/grid coordinates;
- drag interaction with temporary client preview only while the pointer is held;
- movement committed only after Colyseus accepts the release position;
- active-scene token replication to every room client;
- private Atlas browsing uses durable tokens from the Atlas snapshot;
- scene presentation swaps the live token projection to the newly active scene;
- token creation/movement produces durable session events;
- token mutation + session event + recovery snapshot commit atomically;
- optional provisional controller for claimed player tokens.
## Ownership evidence
A two-client SDK smoke created a claimed `VS003 Ownership Probe` owned by `Token-Owner`. `Token-Guest` attempted to move it and received `token is controlled by Token-Owner`.

The rejected command did not increment the session event sequence and did not alter the token coordinates. The owner then moved it to normalized `(0.64, 0.57)`; both clients and the durable Atlas record converged on that position.

This is deliberately **not** described as security. Client names are still local, unauthenticated development identities.

## Recovery evidence
The ownership run reached room `_zUVP7FXx`, sequence `24`, with the probe on `Copper Road Ambush`. After restarting only `game-server`, a new room `FA7a6UEKI` restored the same active scene, token id and coordinates from SurrealDB.

## Browser evidence
Headless Chromium used two isolated desktop contexts. A claimed `Browser Hero` token created through the actual UI moved `+120px/+65px`; the follower rendered the same displacement and saw the token as locked. Zero console/page errors were reported.

After QA data cleanup, a final pass used only the clean unclaimed fixture. `Final-A` moved `Mira Voss` by `+80px/-45px`; `Final-B` received it and then moved the same token `-35px/+30px`; `Final-A` converged on the second position. A 390×844 viewport connected and rendered the final scene/tokens with zero console/page errors.

Ignored screenshots live under `.runtime/browser-artifacts/`.
## Final development fixture
QA-only claimed tokens and noisy live history were removed after evidence capture. The preview intentionally ends with `Copper Road Ambush` active and three unclaimed movable tokens:

- `Mira Voss` — player;
- `Road Bandit` — NPC;
- `Supply Crate` — object.

This keeps the preview directly testable from any current tailnet client while authentication is deferred.

## Quality evidence
Fresh integrated `pnpm check` passed after implementation:

- strict TypeScript checks across all packages/apps;
- ESLint with zero findings;
- domain tests: 14/14;
- game-server tests: 4/4;
- production builds for domain, protocol, game-server and web.

## Explicit non-goals
VS003 does not claim token images/portraits, token size categories, rotation, HP/status rings, conditions, initiative, targeting, ruler/range, walls, doors, vision/fog, secret token visibility, authenticated ownership or DM/player authorization. Those remain separate milestones.
