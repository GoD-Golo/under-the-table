# ADR 0005 — Authentication is explicitly deferred

Status: Accepted

## Context

The immediate architectural risk is the live runtime/persistence split, not identity. Picking auth now would couple an unproven foundation to another provider decision.

## Decision

Do not implement application authentication in Vertical Slice 001. Use Tailscale-only network exposure as a development boundary.

## Alternatives considered

- Reuse Supabase Auth.
- Select a new self-hosted auth provider now.
- Build custom credentials/session auth.

## Consequences

The preview is private-development only. No public deployment is allowed under this ADR. Identity/authorization requires a dedicated later decision before user data or internet exposure.
