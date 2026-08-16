# ADR 0004 — SurrealDB for durable state

Status: Accepted for development foundation

## Context

UTT needs flexible content/homebrew documents, ordinary relational-style records, durable session history and eventually graph-shaped world relationships. Supabase/PostgreSQL convenience is no longer a binding constraint.

## Decision

Use self-hosted SurrealDB 3.2.3 with RocksDB for the development foundation. Access it only from server-side infrastructure code.

## Alternatives considered

- PostgreSQL directly.
- Supabase.
- Convex.
- MongoDB plus a separate graph store.

## Consequences

One persistence engine can represent document and graph-heavy data while still enforcing schema where useful. This is not yet a production lock-in decision: the persistence boundary must remain isolated enough that production suitability can be revisited with evidence.
