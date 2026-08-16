# ADR 0007 — DOM-based configurable HUD

Status: Accepted

## Context

UTT live UI is text/control dense and must remain accessible, draggable, resizable and configurable. It is not currently a canvas-first VTT.

## Decision

Render HUD widgets in React DOM and use React-Grid-Layout v2 for the first layout primitive. Keep presentation layout outside authoritative game state.

## Alternatives considered

- Canvas/WebGL-only UI.
- Fixed dashboard layout.
- Build drag/resize mechanics from scratch.

## Consequences

The first slice gets mature drag/resize behavior and serializable layouts quickly. A future playfield can use Canvas/WebGL without forcing text-heavy HUD controls into it.
