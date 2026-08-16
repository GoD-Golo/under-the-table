# ADR 0014 — Freeform, role-neutral workspaces

Status: Accepted

## Context
React Grid Layout gave VS001 a fast draggable/resizable HUD, but its cell model and compaction make widgets behave like dashboard tiles. UTT wants a game-like surface where tools may overlap, float around a map and differ by role without requiring separate layout engines.

## Decision
Keep DOM widgets, but make a small role-neutral `FreeformSurface` the primary customization primitive. It stores local `x`, `y`, `width`, `height` and `z` values, permits overlap, and does not compact neighbors. Presentation state remains local and outside authoritative game state.

React Grid Layout remains available as an optional Snap Grid mode rather than the foundational layout model. Director and player workspaces must be able to use the same FreeformSurface with different widget catalogs and permissions.

## Consequences
- users can place widgets without invisible grid constraints;
- overlap and manual layering are first-class;
- DM and player experiences can share interaction behavior while exposing different tools;
- grid users retain a structured option;
- future workspace presets can serialize the same placement shape;
- collision avoidance, multi-select and cloud-synced presets are deliberately deferred.
