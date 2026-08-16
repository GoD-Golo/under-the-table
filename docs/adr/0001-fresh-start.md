# ADR 0001 — Fresh-start repository

Status: Accepted

## Context

v0.0.4 proved useful product ideas but its executable state has broken build/type paths, duplicate character-builder directions, static feature placeholders and direct Supabase coupling. The target product has also shifted toward a game-like authoritative live runtime.

## Decision

Build the next foundation in a new repository/container stack. Treat v0.0.4 as read-only inspiration only.

## Alternatives considered

- Repair v0.0.4 in place.
- Fork v0.0.4 and gradually delete subsystems.

## Consequences

We pay a small bootstrap cost but avoid inheriting accidental contracts. Useful product ideas must be deliberately reintroduced with current tests/docs instead of copied implicitly.
