# ADR 0009 — Scene graph atlas over rigid map hierarchy

Status: accepted as product direction; implementation deferred.

## Context

Under The Table needs world maps, regional maps, city maps, battle maps and visual handouts to flow naturally into one another. A fixed hierarchy such as World -> Region -> City -> Dungeon would make custom campaign structures awkward and would couple navigation to assumed content types.

The desired authoring experience is closer to linked visual surfaces: a pin or hotspot on one image may open any other image/scene, which may itself contain more links.

## Decision

Model visual/spatial campaign surfaces as scenes connected by explicit links. Scene navigation is therefore a graph, not a required tree.

Pins/hotspots are generic scene-local entities. They may point to another scene, but their future behavior is extensible and not limited to navigation.
