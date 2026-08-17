# ADR 0027 — Centralize authorization policy before authentication

Status: Accepted

## Context

VS009 needs real role/capability/scope behavior before the product has an authenticated user identity system. Pretending that `clientName`, a request header, or a UI "act as" selector is an identity would create fake security and couple policy rules to a development-only mechanism.

Waiting for authentication before defining authorization would create the opposite problem: Atlas, character lifecycle and live-session mutations would continue accumulating ad-hoc role checks that later need to be rewritten.

## Decision

Authorization policy is implemented now as explicit functions that receive a resolved `memberKey`, capability and optional resource scope.

- Role labels are readable configuration packages/presets. They do not grant access at evaluation time.
- Effective access is stored as capabilities plus scopes.
- Campaign/world policy and Table/session policy are evaluated separately.
- HTTP lifecycle/Atlas mutations and Colyseus live commands call the centralized policy service before mutating state.
- Colyseus `onAuth()` also checks `session.join` before presence is established.
- The current development transport resolves every real request/client to `PREVIEW_MEMBER_KEY` (`local-preview`).
- No request header, `clientName`, controller name or UI selector is treated as an authenticated principal.
- The Campaign access UI may run a **policy preview** for another membership. Preview evaluates and returns a decision only; it never executes an action as that member.

Future authentication replaces principal resolution at the transport boundary. The capability/scope policy itself should not need to be redesigned.

## Consequences

VS009 can prove persistence, presets, scope decisions and mutation gates without claiming multi-user security. Every client that can currently reach the private preview gateway still resolves to the system-managed local Owner principal, so a remote caller is effectively privileged until authentication exists.

The system-managed preview membership cannot be edited or revoked through the VS009 collaborator UI/API, avoiding accidental development lockout.

Secure per-user data projection, identity ownership and secret delivery remain dependent on real authentication and principal resolution.