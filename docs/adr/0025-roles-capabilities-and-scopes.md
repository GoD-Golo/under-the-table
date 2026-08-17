# ADR 0025 — Roles label access; capabilities and scopes define it

Status: Accepted

## Context

A user may own one campaign, co-DM another, DM one Table and play at another. Co-DM access may apply to the whole world or only part of the World Graph. A single global `user.role` cannot represent this without over-granting access or multiplying special-case roles.

## Decision

Model effective access as:

```text
membership + capabilities + scope
```

Owner, DM, Co-DM, and Player are useful product labels, not the complete authorization model.

Campaign Owner grants privileges. Co-DM capabilities may include session running, scene/lore editing, NPC management, presentation, or table management. World scope may cover the entire graph or a selected node/subgraph such as `Greyhaven + descendants`.

Table permissions are independent from World Graph permissions.

## Security note

Until real authentication/authorization is implemented, these structures are domain and UX semantics only. They must not be described as a security boundary.

Future authenticated projections must omit DM-private world/character data from unauthorized clients rather than merely hiding it in the UI.


## VS009 implementation

VS009 implements the capability/scope policy described here. Role labels are used only to create configuration presets; `evaluateCampaignAccess()` and `evaluateTableAccess()` use stored capabilities/scopes, never the role label itself.

World subgraph evaluation supports explicit ancestry input, but production descendant traversal is intentionally deferred until the World Graph has canonical containment relationships. Full Atlas projection remains campaign-wide only.

Authenticated principal resolution is still deferred; see ADR 0027.
