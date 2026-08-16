# ADR 0003 — Colyseus owns live-session authority

Status: Accepted

## Context

The live experience must feel like a game, support multiple synchronized clients and prevent browsers from becoming competing sources of truth.

## Decision

Use Colyseus 0.17.x rooms as the authoritative live runtime. Clients send intent messages; the room validates and mutates synchronized state.

## Alternatives considered

- Database realtime subscriptions as the game authority.
- Hand-written WebSocket protocol.
- Nakama authoritative matches.

## Consequences

The game-state model is explicit and testable, with incremental synchronization handled by Colyseus. Persistence stays a separate concern. The team accepts a Colyseus-specific transport/protocol adapter at the live boundary rather than spreading it through domain code.
