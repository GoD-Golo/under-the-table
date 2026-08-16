# Scene Atlas direction

Status: product direction; **core primitive proven in Vertical Slice 002**, advanced map/VTT capabilities remain future work.

## Core idea

Under The Table should model maps, locations and visual handouts as a **graph of scenes**, not a rigid World -> Region -> City -> Dungeon hierarchy.

A scene is a visual/spatial surface. It may be:

- an uploaded image;
- a world or regional map;
- a generated/editable hex map;
- a battle map;
- theatre-of-the-mind artwork;
- a custom visual board.

Scenes may contain pins, regions or other hotspots. Activating a hotspot may open another scene, reveal information, focus a location, or later trigger a custom action.

The relationship is graph-like: any scene may link to any other scene. Navigation therefore supports drill-down, lateral travel, shortcuts and return links without imposing a content tree.
## Pins and hotspots

A hotspot is presentation plus navigation intent, not a hard-coded location type. A hotspot can have:

- position or polygon/region on the scene;
- label/icon/style;
- visibility/discovery rules;
- optional linked scene;
- optional metadata/notes;
- future action hooks.

This enables the simple workflow the product should always preserve:

`image -> click pin -> another image -> click one of ten pins -> another scene`

A DM should be able to build a useful atlas with uploaded images and pins without touching generators, grids, walls or rules automation.

## World and hex maps

A later world-map tool may add a lightweight hex creator: terrain painting, labels, roads/rivers, points of interest and optional procedural helpers. Hexes should remain ordinary spatial entities that can host hotspots and links.
Travel rules belong above the map primitive. The eventual travel layer may provide configurable profiles such as time-per-hex, terrain multipliers, pace, rest cadence, encounter checks and resource costs. Exact D&D defaults and alternative travel procedures are intentionally deferred until researched and chosen.

## Battle-map creator

A later battle-map creator should be deliberately small before it becomes ambitious: background/image, square or hex grid, simple terrain/shape drawing, walls/doors, tokens and basic props. Imported image + optional grid must always remain a first-class path.

The product must not force a user to build a map inside UTT before they can play on it.

## Relationship to Live

The same scene model can back world navigation and live play. A DM can activate a scene for the table; clients transition to that scene while server-side visibility determines what each participant receives.

Scene switching should therefore be an authoritative live-session operation, while zoom, local HUD layout and similar presentation preferences remain client state.

## Proven primitive

Vertical Slice 002 now proves: durable scene records, image backgrounds, local pan/zoom, square/hex display grids, pin/hotspot links, optional lore entities, create-linked-scene flow and authoritative scene activation with restart recovery.

Hex generation, travel automation, tokens, vision/walls and battle-map editing remain documented future capabilities rather than implied implementation.
## Lore integration

A scene or hotspot may link to lore as well as to another scene. A location on a map should therefore be able to expose both navigation and context without forcing a page change.

Example interactions for a Greyhaven pin:
- open the Greyhaven lore entry in a side panel;
- navigate into the Greyhaven city-map scene;
- reveal a player-safe summary while keeping DM-only notes private;
- expose related NPCs, factions, quests or events as linked lore.

The relationship should be bidirectional: a lore entry can link back to every scene/hotspot where it appears. Lore should be modeled as an entity/document reference rather than as a filesystem path so storage can change without breaking the graph.

Visibility is part of the model. DM-only lore, discovered lore and player-visible lore must not be conflated, and hidden information should not be sent to clients that are not entitled to see it.
