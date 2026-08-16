# Brand and Landing Surface

Status: **implemented frontend design pass**

## Intent

Under The Table should read as a crafted tabletop product before it reads as a web application. The public entry surface therefore uses a restrained obsidian/brass/bone visual language instead of the denser runtime HUD language.

The logo is a table edge with a dragon eye visible beneath it. The mark is intentionally simple enough to work as an inline SVG, favicon, app mark and small runtime home control.

## Landing composition

The root view is a marketing/entry surface, not a live-room client. It contains:

- a minimal brand/nav bar;
- the `One table. Every screen.` hero;
- a CSS/SVG device choreography showing laptop + phone + tablet converging around the table;
- three concise product principles rather than a dense feature grid;
- a four-surface ecosystem explanation;
- a spell visual-language preview organized by base slot then school;
- explicit entry actions for Play and Director.

The hero is deliberately implemented with DOM/CSS/SVG rather than video or WebGL. This keeps the initial pass lightweight, responsive, inspectable and easy to iterate. The animation uses transform/opacity only and is disabled by `prefers-reduced-motion`.

## Visual language

Core palette:

- Obsidian `#0b0b0d`
- Charcoal `#141519`
- Brass `#b89a5a`
- Bone `#f2ede4`
- Ember `#c24a2a`

Display typography uses the best available local old-style serif stack; UI/body remains the system/Inter-style sans stack. No remote font dependency is required for the preview.

## Spell preview boundary

The landing spell cards are a **design-language preview**, not spell runtime or canonical D&D content. They demonstrate:

1. base-slot hierarchy (`C`, `1`…`9`),
2. school as secondary visual identity,
3. action/range/component metadata as compact tags.

The full spell model belongs to the future Content/Action/Effect + D&D ruleset work. The landing page must not become a second source of game rules.

## Verified behavior

Browser QA covers desktop `1440×900` and mobile `390×844`:

- no horizontal document overflow;
- logo/device/spell systems render;
- landing → immersive Play succeeds;
- Play Back → Companion → brand Home returns to landing;
- active campaign scene is preserved;
- zero console/page errors in the tested flow.
