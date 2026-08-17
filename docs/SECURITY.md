# Development security posture

The current Vertical Slice 001 through 009 environment has **no application authentication**. VS009 does have centralized authorization policy, but every real HTTP request and Colyseus client still resolves to the fixed `local-preview` Owner principal, so it does not yet provide per-human access control. That is a conscious staging decision, not an accidental omission.

Compensating development controls:

- preview binds only to loopback or the homelab Tailscale interface;
- SurrealDB root authentication is enabled and credentials live only in ignored `.env`;
- SurrealDB and Colyseus are not published directly to the host network;
- scene assets are served only through the same private gateway;
- uploads are limited to PNG/JPEG/WebP, filenames are server-generated and request size is capped;
- the database uses a `STRICT` scope and current application tables are `SCHEMAFULL`;
- containers that write durable data run non-root after one-shot volume ownership initialization;
- no production/user data is used in this environment.
- Offline Companion state (current HP, local dice result and local event log) is stored in browser `localStorage`; it is neither encrypted nor synchronized and must not be used for secrets or treated as campaign-authoritative storage.

## Known security limitation

All connected development clients currently resolve to the same privileged `local-preview` principal. VS009 capability checks therefore authorize the Owner-level Director, lifecycle and live actions available to that principal; they do not distinguish two real humans yet. Live clients can still mutate any visible character resource, roll/advance/clear initiative, quick-add NPC combatants and issue basic attacks for any eligible active character because character ownership is not implemented. Claimed player tokens can reject moves from another local client name, but that name is user-controlled and is **not authentication**. The VS003.7 fog overlay is not a secrecy boundary, and `/assets` is still served preview-wide through the private gateway rather than through a per-principal asset policy. VS008 DM-private character state now requires the VS009 `character.private` capability, but the fixed preview principal means it is still not secret from another real client that can reach the gateway. DM-secret notes/visibility and real ownership must not rely on client-side masking, endpoint naming, provisional client names or collaborator member keys; authenticated principal resolution and secure server-side projection are still required.

This environment is suitable for a private development preview, not public production.

Before any public exposure, authenticated principal resolution, authorization testing against real principals, TLS, CSRF/origin policy, rate limiting, upload/content security, secret management and abuse boundaries require their own ADRs and verification.


## VS009 policy foundation

VS009 adds centralized capability/scope checks to Atlas mutations, Character lifecycle mutations and live-room join/commands. This reduces future authorization rewrites but does **not** make the preview multi-user secure: every real request and Colyseus client still resolves to the fixed `local-preview` Owner principal. `clientName`, token controller names, collaborator member keys and Policy Preview are not authentication mechanisms.

A collaborator can be configured with narrower capabilities/scopes, and the policy engine can evaluate that membership, but requests are not executed as that collaborator until authenticated principal resolution exists. Full Atlas delivery remains campaign-wide only; scoped collaborators must not receive a complete secret-bearing Atlas and rely on CSS/client filtering. Scene image assets likewise remain preview-wide static resources until authenticated asset delivery or signed/scoped asset access is designed.
