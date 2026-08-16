# Development security posture

The current Vertical Slice 001/002/003 environment has **no application authentication or authorization**. That is a conscious product decision, not an accidental omission.

Compensating development controls:

- preview binds only to loopback or the homelab Tailscale interface;
- SurrealDB root authentication is enabled and credentials live only in ignored `.env`;
- SurrealDB and Colyseus are not published directly to the host network;
- scene assets are served only through the same private gateway;
- uploads are limited to PNG/JPEG/WebP, filenames are server-generated and request size is capped;
- the database uses a `STRICT` scope and VS001/VS002/VS003 application tables are `SCHEMAFULL`;
- containers that write durable data run non-root after one-shot volume ownership initialization;
- no production/user data is used in this environment.

## Known security limitation

All connected development clients can currently use director controls, including `Present to table`, scene creation, token creation and uploads. Lore implemented in VS002 is therefore player-safe only. Claimed player tokens can reject moves from another local client name, but that name is user-controlled and is **not authentication**. DM-secret notes/visibility and real ownership must not rely on it; identity and authorization need their own design and enforcement.

This environment is suitable for a private development preview, not public production.

Before any public exposure, authentication, authorization, TLS, CSRF/origin policy, rate limiting, upload/content security, secret management and abuse boundaries require their own ADRs and verification.
