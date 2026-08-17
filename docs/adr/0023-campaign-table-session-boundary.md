# ADR 0023 — Campaign, Table, Session, and Live Room are distinct

Status: Accepted

## Context

The current MVP runtime was intentionally built around one development session. Product flow now needs to support both conventional campaigns and larger shared worlds where different player groups use different tables.

Treating campaign, table, session, and realtime room as the same entity would make multi-table campaigns, table-specific prep, scheduling, and permissions difficult to model.

## Decision

- **Campaign** owns the shared persistent world/campaign context.
- **Table** is a persistent play group/context inside a Campaign.
- **Session** is one actual play occurrence for a Table.
- **Live Room** is the realtime runtime for an active Session.

Campaign world content may be reused across Tables according to permissions. Table-specific roster, prep, and session history remain table-contextual.

## Consequences

The current single-session development model must be migrated behind these identifiers rather than exposed as the final product model. Product navigation should pass through Home -> Campaign -> Table before live participation.

## VS007 implementation

VS007 instantiates this boundary with persistent `campaign` and `campaign_table` records plus membership relations. The starter `Main Table` references the existing `vertical-slice-001` Session instead of renaming or copying its runtime history. This proves the product/data boundary but does not yet provide independent concurrent Colyseus rooms for multiple Tables.
