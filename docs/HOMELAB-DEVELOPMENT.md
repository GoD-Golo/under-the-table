# Homelab development environment

## Why this repository exists now

The legacy project made infrastructure decisions while persistent self-hosted development capacity was limited. The homelab changes that constraint: we can run a real database, authoritative game server, private preview and persistent dev state without choosing a managed backend for convenience.

That is an enabling condition, not a requirement of the product.

## Current host

Kickoff snapshot: 2026-08-16.

- host: `homelab-golo`
- OS: Debian 12 family, Linux 6.12
- Tailscale IPv4: `100.91.197.37`
- Docker + Compose available
- approximately 7.1 GiB RAM total
- approximately 1.4 GiB available at kickoff because the machine already runs other homelab services

The slice therefore uses conservative memory limits and sequential builds.

## Network policy

Only the preview gateway is host-published. The default Compose bind is loopback; the homelab `.env` deliberately overrides it to the Tailscale IPv4.

Current preview target: `http://100.91.197.37:4310`

SurrealDB and the Colyseus port are not host-published. The gateway proxies Colyseus matchmaking/WebSockets under `/game/`.

## Portability

No application code may depend on the numeric Tailscale IP, Docker volume path or homelab hostname. These belong to environment/configuration only.

## SurrealDB volume ownership

SurrealDB 3.2.3 runs as the image's `nonroot` account (UID/GID 65532). Docker named volumes begin root-owned, so Compose includes a one-shot `surreal-init` service that only changes the data-volume ownership before the database starts. The database itself remains non-root. This UID is coupled to the pinned SurrealDB image and must be re-verified on an image upgrade.
