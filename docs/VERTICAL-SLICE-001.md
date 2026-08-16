# Vertical Slice 001 — authoritative live HUD

Status: **complete / proven on homelab — 2026-08-16**.

## Question this slice answers

Can Under The Table feel like a live game while keeping current-session authority separate from durable campaign data?

**Answer:** yes, for the narrow foundation slice defined here. This is evidence for the architecture, not a claim that the full product or D&D rules engine exists.

## Proven acceptance criteria

1. Private preview loads at `http://100.91.197.37:4310` through the homelab Tailscale interface.
2. The HUD contains draggable/resizable Character, Dice and Event Log widgets.
3. Widget position and size survive a browser reload via presentation-only local storage.
4. Two SDK clients join the same Colyseus room and observe the same authoritative state.
5. Dice are generated on the game server with Node `crypto.randomInt`; the browser sends only roll intent.
6. HP changes are validated and clamped by pure server/domain logic.
7. Each accepted mutation writes an event and updated snapshot in one SurrealDB transaction before live state is accepted.
8. Restarting only `game-server` creates a new room that restores the latest snapshot.
9. Host listener inspection shows only `100.91.197.37:4310`; ports 2567 and 8000 remain Docker-internal.
10. Strict typecheck, lint, unit tests and production builds pass.
11. Headless Chromium verified the real Tailscale URL with zero console/page errors, a live roll interaction, drag, resize, reload persistence and HUD reset.

## Final runtime evidence

The final two-client smoke run reached room `686MBUckI`, event sequence `7`, HP `26`, and latest roll total `15`. After restarting only the authoritative runtime, recovery joined a different room (`mrHb27Tdd`) at the same sequence `7` and HP `26`.

Direct SurrealDB inspection after the run reported seven durable events and one `vertical-slice-001` snapshot at sequence 7 / HP 26. Both `session_event` and `session_snapshot` are `SCHEMAFULL`; the containing development database is created `STRICT`.

The browser QA artifact is stored in ignored development output at `.runtime/vertical-slice-desktop.png`; a second image proves the moved/resized layout after reload. These artifacts are evidence, not committed product assets.

Runtime memory at handoff was deliberately small relative to the busy homelab: approximately 115 MiB SurrealDB, 39 MiB game server, and 11 MiB Nginx/web. The host was already under memory/swap pressure before this stack, so conservative limits remain part of the development policy.

## Explicit non-goals

- authentication or user accounts;
- public internet / production deployment;
- full D&D rules implementation;
- character builder;
- map/VTT rendering;
- homebrew editor;
- mobile app.

## Bugs found by proving the slice

- SurrealDB's non-root image could not initially write a root-owned Docker volume; a one-shot ownership initializer now preserves non-root database execution.
- Non-atomic schema bootstrap could leave a partial schemaless table; bootstrap DDL is now transactional and schema errors are not retried as network errors.
- Custom `utt/development` scope was selected before it existed; bootstrap now creates namespace then strict database before applying table schema.
- `crypto.randomUUID()` broke the HTTP Tailscale preview because it requires a secure browser context; the development-only display name uses `crypto.getRandomValues()` with a harmless fallback instead.
- The recovery smoke harness originally read client state before the initial full-state packet was applied; it now waits for the expected authoritative sequence.

These failures are intentionally documented because the goal of Vertical Slice 001 was to expose architectural failure modes before feature breadth.
