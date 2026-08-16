# Engineering contract for Under The Table

This repository is a fresh-start implementation. Preserve the product vision; do not preserve legacy architecture by inertia.

## Source of truth

Use this order: executable behavior and tests -> this repository -> repository docs/ADRs -> authorized dev environment -> legacy repository -> conversation memory.

## Architecture rules

1. Colyseus owns live-session authority. Clients send intent; clients do not mutate authoritative game state.
2. SurrealDB owns durable project/game data. It is not the live simulation authority.
3. The domain/rules layer must not import React, Colyseus, SurrealDB or deployment code.
4. D&D 2024 is the first rules adapter. Core concepts should remain usable by homebrew and future rulesets.
5. Official content and homebrew should converge on the same content primitives: grants, choices, actions, resources and effects.
6. Save serializable simulation state and events, never renderer/UI objects.
7. Keep text-heavy game HUD in the DOM. Do not turn the product into a generic SaaS dashboard.

## Documentation is part of the change

For an architecture-affecting change, update or add an ADR in the same work unit. Record context, decision, alternatives, consequences and status. Update `docs/ARCHITECTURE.md` when the current system changes; do not document plans as if they already exist.

## Homelab rule

The homelab enables richer self-hosted development but is not a product dependency. Production must remain portable. Preview services must bind to Tailscale or loopback, never `0.0.0.0`, unless the owner explicitly changes that policy.

## Explicitly deferred

- authentication/provider choice;
- public internet deployment;
- production data model guarantees beyond the proven slice.

Do not silently reintroduce Supabase or copy the v0.0.4 schema. Do not add auth as a side effect of unrelated work.

## Quality bar

For meaningful behavior: implement the thinnest real slice, run typecheck/lint/tests/build, prove runtime behavior, and visually inspect UI changes. Keep failures visible. Never call mocked persistence or UI-only state complete.
