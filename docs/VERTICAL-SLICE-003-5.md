# Vertical Slice 003.5 — Table UX stabilization

Status: **complete / proven on homelab — 2026-08-16**.

## Why this slice exists
VS003 proved authoritative tokens, but two interaction problems were visible before adding walls/vision: accepted token drags briefly snapped back while waiting for the Colyseus patch, and HUD widgets were draggable only inside a compacting grid. Director controls also needed the same customization philosophy as player-facing tools.

## Implemented behavior
- role-neutral `FreeformSurface` primitive for DOM widgets;
- freeform pixel positioning with overlap allowed and no automatic compaction;
- free resize with minimum sizes;
- bring-to-front behavior through persisted z-order;
- per-workspace local persistence;
- optional legacy `Snap grid` mode remains available for Live;
- Live defaults to `Free` mode;
- Director uses the same freeform primitive for floating scene/token tools;
- Director floating tools can be hidden and reset independently;
- map interaction remains available outside floating widgets;
- accepted token movement keeps its optimistic visual position until authoritative state converges;
- a timeout rolls the preview back if no authoritative confirmation arrives;
- hotspot selection now opens an inline map popover with lore summary and linked-scene action;
- double-clicking a linked hotspot enters its scene.

## Browser evidence
Chromium QA against the real Tailscale preview intentionally dragged the Character widget into the Dice widget. The resulting overlap area was about `108,850 px²`, proving there is no collision/compaction requirement in Free mode.

The Character widget was resized by more than 80 px horizontally and 50 px vertically; its position, dimensions and z-order survived a full reload through local storage. The same run switched to `Snap grid` and back to `Free`, proving both modes remain usable.

A Director pass overlapped the Scene and Token Roster floating tools by about `52,710 px²` with zero console/page errors. The Greyhaven hotspot opened its contextual map popover and exposed `Open Greyhaven Gate` without requiring the right inspector.

A live token drag sampled the token position every 25 ms for roughly 450 ms after pointer release. Maximum excursion from the final accepted position was `0 px`, removing the successful-move rubber-band observed in VS003.

A 390×844 browser viewport connected and rendered Live Freeform with zero console/page errors.

## State boundary
Widget positions, sizes, z-order and chosen layout mode are presentation state stored locally. They are not synchronized through Colyseus and are not world/session truth. DM and player roles may eventually have different widget catalogs and permissions while sharing this same layout primitive.

## Explicit non-goals
This slice does not implement authenticated DM/player roles, shared/cloud workspace presets, widget catalogs, hide/show management for every widget, multi-select/grouping, walls, doors, fog/vision, targeting or initiative. Those remain later milestones.
