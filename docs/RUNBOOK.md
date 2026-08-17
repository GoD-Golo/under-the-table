# Development runbook

All commands are run from the repository root on `homelab-golo` unless noted otherwise.

## Configuration

Copy `.env.example` to `.env` and generate a local SurrealDB password. On the homelab set `PREVIEW_BIND_IP` to the server's Tailscale IPv4. `.env` is never committed.

## Dependency / quality checks

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm check
```

The homelab host itself may not expose Corepack/pnpm in its shell. CI-style checks can be run in a Node 22 container with the repository mounted; do not install ad-hoc global tooling on the server just for this repo.

## Build and start the private stack

```bash
docker compose build --memory 1g
docker compose up -d --wait
```

The stack creates two durable volumes: `surreal-data` for structured data and `scene-assets` for uploaded scene images. One-shot init containers set non-root ownership.

Do not use `docker compose down -v` unless intentionally deleting both development persistence domains.

## Inspect

```bash
docker compose ps
docker compose logs --tail=100 game-server
docker compose logs --tail=100 surrealdb
curl -fsS http://100.91.197.37:4310/healthz
curl -fsS http://100.91.197.37:4310/game/healthz
curl -fsS http://100.91.197.37:4310/game/api/atlas
```

Expected host exposure is only the configured Tailscale address/preview port. Colyseus 2567 and SurrealDB 8000 are `expose`-only inside Compose.

## Live/recovery smoke test

From a machine that can reach Tailscale directly:

```bash
UTT_ENDPOINT=http://100.91.197.37:4310/game pnpm smoke:live
```

From a QA container attached to `utt-next_default`, use `UTT_ENDPOINT=http://web:8080/game`; this host's ordinary Docker namespace currently does not route back through the Tailscale interface.

The smoke test joins two clients, executes authoritative mutations and records HP/roll/active-scene recovery evidence in ignored `.runtime/` output. Restart only `game-server`, then rerun with `SMOKE_MODE=verify-recovery`.

## Live liveness / Retry QA

VS010 treats the application heartbeat as transport metadata, not session history. For a manual frozen-room check, keep Play open, pause only `game-server`, and verify the UI leaves synchronized campaign state within the heartbeat deadline and offers `Retry campaign`. Unpause the server before retrying.

Do not use this procedure while another developer is intentionally mutating the preview. After the check, confirm both health endpoints, verify Companion did not auto-switch from Offline back to Campaign, and verify the session event sequence did not advance merely because of heartbeat/retry traffic.

A normal `docker compose stop game-server` includes graceful-shutdown time and is therefore not a precise heartbeat measurement. A frozen process/open socket is the relevant liveness case.

## Token authority smoke

`pnpm exec tsx scripts/token-smoke.ts` proves two-client token creation/movement, rejection of a non-owner move, durable coordinates and restart recovery. In a Compose-network QA container set `UTT_ENDPOINT=http://web:8080/game`; rerun with `SMOKE_MODE=verify-recovery` after restarting only `game-server`.

## Scene assets

Browser uploads accept PNG, JPEG and WebP with a 12 MB request-body limit. The server generates asset filenames and stores scene records as asset keys rather than filesystem paths. Replacing a background removes the previous scene asset after the DB update succeeds.

## Stop

```bash
docker compose down
```
