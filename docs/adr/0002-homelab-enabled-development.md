# ADR 0002 — Use the homelab as private development infrastructure

Status: Accepted

## Context

A managed backend was previously convenient because persistent self-hosted infrastructure was not assumed. The owner now has an always-available Debian/Docker homelab connected through Tailscale.

## Decision

Use the homelab for development database, game server and preview. Bind preview to Tailscale; keep internal services unexposed.

## Alternatives considered

- Continue depending on managed development infrastructure.
- Run every service on a developer laptop.

## Consequences

We can choose infrastructure based on product fit and test restart/persistence behavior realistically. The application must remain portable: hostnames, Tailscale IPs and storage locations are configuration, never domain assumptions.
