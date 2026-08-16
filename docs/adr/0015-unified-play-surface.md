# ADR 0015 — Unified Play surfaces

Status: Accepted

## Context
VS003.5 exposed a customizable Live HUD, while the actual scene/map and synchronized tokens remained in Director/Atlas. That split made the primary live experience unsuitable for virtual tabletop play, but replacing the HUD with a mandatory map would make UTT worse as a companion for groups playing physically.

## Decision
Treat **Play** as participation in a session, not as a specific renderer. Play currently offers two presentation surfaces over the same product model:

- **Virtual Table** — the authoritative active scene and synchronized tokens are the base surface; the freeform session HUD floats above it.
- **Companion** — the session HUD is the primary surface and no map is required, supporting physical-table use.

Connected Companion uses the same Colyseus-authoritative campaign state as Virtual Table. Companion may instead use explicit **Offline local** state for HP, dice and its local event log. Offline state is browser-local presentation/session aid state and is never silently merged into campaign state. If campaign connectivity is unavailable, the source becomes Offline and remains Offline after reconnect until the user explicitly chooses Campaign.

Director remains the preparation/authoring projection and may browse privately away from the active scene.

## Consequences
- maps are optional participation surfaces rather than the definition of a live session;
- virtual, physical and mixed-device tables can share one session model;
- DM/player widget catalogs can keep using the same freeform primitive;
- offline local changes are intentionally isolated and require a future explicit merge/conflict design before campaign synchronization;
- service-worker/PWA offline boot is not implied by this decision;
- walls, vision and fog can now target the Virtual Table scene layer without affecting Companion.
