# ADR 0028 — Application heartbeat owns live-room liveness

Status: Accepted — 2026-08-17

## Context

UTT is session-first. A stale synchronized surface is worse than an explicit unavailable state because players may continue acting on a room that no longer has an authoritative server behind it.

Transport close detection is not a sufficient UX contract. Pre-VS010 QA observed delayed leave detection during server shutdown, and an open TCP/WebSocket can remain established while the application process is frozen or an intermediary stops forwarding useful traffic.

Colyseus 0.17 also enables automatic room reconnection by default. That conflicts with UTT's established Companion rule: when campaign state disappears, local Offline state may become the user's deliberate continuation and must not be silently replaced later.

## Decision

The web client owns application-level live liveness with a small request/reply heartbeat.

While visible, the client probes every 2 seconds and considers the live projection stale after 6 seconds without an acknowledgement. Heartbeat traffic never creates a gameplay event or persistence write.

When hidden, heartbeat expiry is suspended. Visibility restoration resets the deadline and probes immediately so browser/mobile timer throttling does not create false disconnects.
On liveness failure UTT clears synchronized campaign state immediately, ignores callbacks from the abandoned room, and closes the socket locally. Colyseus automatic reconnection is disabled for this workspace.

Recovery is user-triggered through `Retry campaign`. A successful retry creates/joins a fresh owned room connection. Offline Companion remains Offline until the user explicitly selects Campaign again.

Connection failures and gameplay command rejections are separate UI states. A command rejection must not invalidate otherwise-good synchronized state.

## Consequences

- frozen-but-open connections become visibly unavailable within a bounded application deadline;
- transport close remains a faster path when it arrives first;
- heartbeat traffic cannot inflate session sequence or recovery snapshots;
- background tabs do not flap offline due timer throttling;
- there is one reconnect policy rather than competing SDK/app policies;
- recovery is slightly less automatic, deliberately protecting local Offline state from surprise replacement.

The timeout is intentionally configurable implementation policy. Real-device evidence may justify tuning it later.

## Rejected alternatives

**Rely only on WebSocket close/ping behavior.** This does not prove that the authoritative room application is responding inside a useful gameplay deadline.

**Keep Colyseus automatic reconnect and also add UTT Retry.** Two owners of reconnection create races, stale callbacks and ambiguous Offline Companion behavior.

**Persist heartbeat events.** Liveness is transport metadata, not game history; persistence would create noise and unnecessary writes.
