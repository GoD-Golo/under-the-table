# ADR 0006 — Persist live commands as events plus snapshots

Status: Accepted for Vertical Slice 001

## Context

A live room is intentionally ephemeral, but sessions must survive process restarts and later support history/replay/debugging.

## Decision

Each accepted authoritative mutation writes a session event and an updated room snapshot in one database transaction. New rooms restore from the latest snapshot.

## Alternatives considered

- Persist only the latest mutable state.
- Full event sourcing with replay as the only recovery mechanism.

## Consequences

We get durable history and simple recovery without committing yet to full event-sourced reconstruction. Event schemas and replay semantics can evolve after the primitive set stabilizes.
