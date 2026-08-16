# ADR 0008 — Atomic development schema bootstrap

Status: Accepted

## Context

The first SurrealDB startup exposed a dangerous failure mode: a multi-statement schema bootstrap failed while defining a flexible field and left one table partially defined as `SCHEMALESS`. Retrying the same DDL could not repair the table because `IF NOT EXISTS` preserved the bad definition.

## Decision

Bootstrap the Vertical Slice schema inside an explicit SurrealQL transaction. Connection retries cover network/readiness failures only; schema errors fail immediately and restart the service rather than being misclassified as connectivity problems.

## Alternatives considered

- Retry all connection + DDL work together.
- Use `DEFINE ... OVERWRITE` on every process start.
- Ignore schema mode and use schemaless tables.

## Consequences

A failed first bootstrap leaves no partial schema. Existing schema is preserved on ordinary restarts. Future non-trivial schema evolution should move from bootstrap DDL to explicit versioned migrations rather than expanding this initializer indefinitely.
