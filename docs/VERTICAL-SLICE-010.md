# Vertical Slice 010 — Live Reliability & Recovery

Status: **implemented and verified on homelab — 2026-08-17**.

## Problem

The product flow was coherent by VS009, but live failure handling was still weaker than the gameplay loop. A room could remain visually usable after the server stopped responding, command rejections could be hidden while synchronized state still existed, and the Colyseus SDK's implicit reconnect policy did not match UTT's explicit Offline Companion semantics.

The historical VS003.6 QA recorded that an already-open socket did not become `disconnected` inside 15 seconds. Re-testing before VS010 observed the underlying room leave only after roughly **13.7 seconds** during a server stop.

## Implemented behavior

- the client sends an application heartbeat every **2 seconds** while the document is visible;
- if no heartbeat acknowledgement arrives for **6 seconds**, UTT invalidates the live projection and reports the session unavailable;
- heartbeat request/reply messages are transport liveness only: they do not enter the command queue, event log, snapshot or database;
- hidden documents suspend heartbeat expiry to avoid false disconnects from mobile/browser timer throttling;
- returning to a visible document resets the deadline and probes immediately;
- browser `offline` and Colyseus `onLeave` paths also clear synchronized campaign state immediately;
- stale room callbacks cannot repopulate state after a failure because handlers are bound to the currently-owned room;
- the Colyseus SDK's automatic reconnection is disabled for this workspace;
- recovery is explicit through `Retry campaign`, preserving the user's deliberate Offline Companion state;
- dead/stale sockets are closed locally without sending a consent packet over an unusable connection.
## Error UX

Connection failures and command rejections are separate client states.

A connection failure removes stale campaign state, changes the status to `Campaign unavailable`, and offers Retry. A server-side `command_error` keeps the valid synchronized state but displays a dismissible alert above Play, including immersive Virtual Table. Director likewise distinguishes reconnectable connection errors from dismissible command errors.

Attempting a live command when no owned room exists produces a local command error instead of silently dropping the intent.

## Executable evidence

A `docker pause` probe kept TCP open while freezing the game server. Heartbeat acknowledgements stopped and the browser left immersive state by the **8-second polling tick**, showing `Live session stopped responding. Retry to rejoin.` rather than continuing with stale map/session state.

A synchronized reconnect probe paused the server about 50 ms after browser readiness. The client reported unavailable after roughly **8.4 seconds**, had zero stale immersive surfaces, then recovered after unpause + explicit Retry in roughly **90 ms** with zero console/page errors.

An abrupt container kill exercised the transport-close fast path: stale immersive state was gone by the first 1-second browser polling tick.

Companion QA at 390x844 proved Campaign -> Offline fallback on liveness failure. After server recovery and Retry, `Offline local` remained selected; Campaign became available but was not selected automatically.
A non-destructive command-rejection probe submitted an NPC with invalid max HP. The server rejected it with `NPC max HP must be 1-9999`; the Play alert was visible and dismissible, fit inside a 390px viewport (`x=14`, `width=362`), did not create an initiative entry, produced zero browser errors and left durable activity sequence **95 -> 95**.

Desktop and 390x844 screenshots of the command alert plus the mobile unavailable/Retry state were visually inspected after the final runtime changes; controls remained readable with no clipping or horizontal overflow.

Repeated heartbeat/reconnect QA also left activity sequence at **95**, confirming liveness traffic does not pollute gameplay history.

A frozen-install full workspace gate passes strict typechecking, ESLint, **43/43 tests** (30 domain, 6 D&D 2024 adapter, 7 game-server) and production builds. The existing Vite warning for a minified JavaScript chunk slightly above 500 kB remains separate performance debt rather than a VS010 reliability regression.

## Boundaries / non-goals

VS010 does not add authentication, background synchronization, PWA/service-worker offline boot, conflict merging, automatic session resumption, or a second persistence channel. It intentionally does not auto-rejoin a campaign after UTT has moved Companion to Offline local.

The heartbeat is a UX liveness signal, not a security mechanism. Authenticated principal resolution and secure per-client projections remain separate work.

The 2s/6s values are preview reliability policy, not protocol invariants. They may be tuned with real-device playtest evidence without changing the persistence or gameplay model.
