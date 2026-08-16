# ADR 0012 — Scene image bytes stay outside the database

Status: accepted for development foundation.

## Context

Scene backgrounds are durable assets, but embedding multi-megabyte image bytes in SurrealDB would couple the world model to blob delivery and inflate ordinary Atlas reads/backups. The homelab gives us persistent Docker storage without requiring a managed object-storage service during development.

## Decision

Store uploaded PNG/JPEG/WebP bytes in a dedicated private `scene-assets` Docker volume. Store only a generated `assetKey` plus image dimensions in the `scene` record. Serve assets through the existing game-server/Nginx gateway; do not expose a new host port.

The upload endpoint generates filenames rather than trusting user filenames, restricts image MIME types, limits request size, writes as the non-root game-server user and removes the previous scene background after a successful replacement.

## Consequences

- SurrealDB remains focused on structured durable state.
- Replacing storage later (filesystem, S3-compatible storage, CDN, etc.) does not require changing scene identity or hotspot links.
- The homelab filesystem/volume is a development adapter, not a production requirement.
- Backup/export policy for assets must eventually be designed alongside database backup rather than assuming DB snapshots contain everything.
