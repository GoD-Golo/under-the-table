# Vertical Slice 007 — Product Home & Campaign Flow

Status: **implemented and verified on the private preview**

## Goal

VS007 turns the existing Atlas, characters, Director and Play surfaces into one understandable product flow before reliability work hardens the wrong navigation model.

The implemented path is:

```text
Landing
  -> Home
      -> Campaign Home
          -> Table Home
              -> Virtual Table / Physical Companion
          -> World / Director
      -> Characters Home
```

The landing remains a showcase. Home is now the actual product entry surface.

## Persistent product context

SurrealDB now persists six small context tables:

- `campaign`;
- `campaign_table`;
- `campaign_membership`;
- `table_membership`;
- `campaign_character_membership`;
- `table_character_membership`.
The current preview is migrated by adding context around existing durable data, not by copying it. `The First Table` is the starter Campaign; `Main Table` is the starter Table and references the existing `vertical-slice-001` Session.

Existing `character` rows are linked to the starter Campaign and Table. Their definitions/resources remain the same records, so Mira's HP and D&D data are not duplicated. In the accepted future model these rows are closest to `CampaignCharacter`; global `CharacterIdentity` is intentionally VS008 work.

## Product read model

`GET /game/api/product` returns a product snapshot containing the preview viewer context, campaigns, tables, campaign characters, current table scene, and recent activity.

Home, Campaigns, Characters, Campaign Home and Table Home use this HTTP read model and **do not mount Colyseus**. This keeps browsing/navigation separate from active session presence.

The live runtime is mounted only when entering:

- Virtual Table;
- campaign-connected Companion;
- Director.

Leaving those runtime surfaces returns to Table/Campaign context and closes the room connection.

## Navigation semantics

The minimal hash routes now represent product concepts rather than implementation tools:

- `#home`;
- `#campaigns`;
- `#characters`;
- `#campaign/:campaignId`;
- `#table/:tableId`;
- `#table/:tableId/play`;
- `#campaign/:campaignId/world/:tableId?`.
Browser Back/Forward follows those hashes, and product-route changes reset document scroll position so a mobile route never inherits a deep scroll position from the previous page.

Virtual Table's back bubble now returns to Table Home. Companion remains an explicit play-mode choice rather than an implicit back destination.

## Preview membership semantics

The starter preview persists one development membership with Owner + Player campaign labels and DM + Player table labels. Capabilities are persisted separately from labels, and campaign scope is represented independently.

This is **domain/product metadata, not authentication or authorization enforcement**. `local-preview` is not a security identity. The current API does not filter records per authenticated user because auth remains deferred.

Campaign membership scopes are stored as JSON in this slice while exposed as typed domain scopes. VS009 may normalize that storage if permission queries require it; VS007 does not prematurely build a permission engine.

## Current multi-table limitation

The data model and product shell support Campaign -> many Tables, but simultaneous independent live Tables are **not implemented yet**.

`Main Table.currentSessionId` maps to the existing single `vertical-slice-001` session, and Colyseus still uses the existing `vertical_slice` room definition. A future runtime slice must route Tables/Sessions to independent live rooms before real concurrent tables are claimed.

## Explicit non-goals

VS007 does not implement CharacterIdentity creation/forking, campaign-level progression approval, DM-private character data, editable permissions/scopes, auth, campaign/table creation UI, scheduling/polls/notifications, or concurrent multi-table live rooms.

Those boundaries remain planned for VS008/VS009 and later slices rather than being faked in this shell.
## Verification evidence

The product foundation API was exercised against the real SurrealDB data and returned the starter Campaign/Table, Mira Voss at 32/32 HP, `Copper Road Ambush` as the current scene, and recent session activity.

Desktop 1440×900 and mobile 390×844 browser QA verified:

- Landing, Home, Campaigns, Characters, Campaign Home and Table Home: 0 active WebSockets;
- Virtual Table: exactly 1 active live socket and the correct active scene;
- campaign Companion: exactly 1 active live socket after connection;
- Director: exactly 1 active live socket;
- returning to Table Home closes the runtime socket;
- Mira is selected from the Table's campaign-character membership;
- browser Back/Forward resolves Campaign Home <-> Table Home correctly;
- Table Home starts at `scrollY = 0` after navigation;
- no horizontal overflow at either viewport;
- no console errors or page errors in the tested flow.

Domain coverage adds four Campaign/Table boundary tests. The release gate for this slice is the normal frozen install, strict TypeScript, ESLint, all tests, production builds, Docker runtime health, and `git diff --check`.
