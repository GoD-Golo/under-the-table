# Development security posture

The current Vertical Slice 001 through 006 environment has **no application authentication or authorization**. That is a conscious product decision, not an accidental omission.

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

All connected development clients can currently use director controls, including `Present to table`, scene creation, token creation, fog reveal and uploads. They can also create/edit characters, mutate any character resource, roll/advance/clear initiative, quick-add NPC combatants and issue basic attacks for any eligible active character because authenticated ownership and table roles are not implemented yet. Lore implemented in VS002 is therefore player-safe only. Claimed player tokens can reject moves from another local client name, but that name is user-controlled and is **not authentication**. The VS003.7 fog overlay is not a secrecy boundary because scene assets still reach the browser. DM-secret notes/visibility and real ownership must not rely on client-side masking or provisional client names; identity and authorization need their own design and enforcement.

This environment is suitable for a private development preview, not public production.

Before any public exposure, authentication, authorization, TLS, CSRF/origin policy, rate limiting, upload/content security, secret management and abuse boundaries require their own ADRs and verification.
