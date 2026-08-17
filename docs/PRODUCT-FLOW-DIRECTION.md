# Product flow direction

Status: **accepted direction; VS010 live reliability implemented**

This document records the navigation and ownership model agreed after the first branded landing page. It is intentionally broader than the current implementation. Current runtime behavior remains documented in `ARCHITECTURE.md` and the vertical-slice documents.

## Product entry model

The landing page is a showcase and entry surface, not the product home.

Canonical user flow:

```text
Landing
  -> Home
      -> Campaigns
      -> Characters
      -> Active Tables
      -> later: Upcoming / polls / notifications
```

The main authenticated/product surface should simply be called **Home**, not `Campaigns Home`, `Dashboard`, `Portal`, or `Command Center`.

Home should feel closer to a game launcher than an enterprise dashboard: clear continuation actions, current campaigns/tables, recent characters, and only the information needed to choose the next action.
## Campaign, Table, Session, Live Room

These are distinct concepts:

```text
Campaign = shared persistent world and campaign context
Table    = persistent play group/context inside a Campaign
Session  = one actual play occurrence for a Table
Live Room = realtime runtime for the active Session
```

A large campaign may have several Tables with different player rosters and different DMs. The same user may be an Owner, DM, Co-DM, or Player in different campaign/table contexts.

The shared world belongs to the Campaign. Table-specific prep, roster, session history, and live play belong to a Table. Session runtime state must not be confused with campaign/world identity.

## Campaign Home

Entering a campaign should open Campaign Home, not jump directly to Director.

Initial destinations:

- Continue
- Tables
- Characters
- World
- Activity
- later: Scheduling

World-level authoring is shared across Tables according to permissions. Table-specific prep can remain private to that Table.
## Table Home

Table Home provides the missing context before live play.

For a DM or Co-DM it should expose the current scene/session state plus `Prepare` and `Continue session` paths. For a Player it should show the current campaign character and the available participation mode.

Canonical continuation path:

```text
Home
  -> Campaign Home
      -> Table Home
          -> choose/confirm campaign character
          -> Virtual Table or Physical Companion
          -> Live
```

`Director`, `Virtual Table`, and `Companion` remain important product surfaces, but users should encounter them as tools inside an understandable campaign/table flow rather than as the application's top-level information architecture.

## Characters Home

Characters are a first-class Home destination. Characters Home aggregates the user's character identities and their campaign-specific versions.

A character may exist before joining a campaign. Adding a character to a campaign creates a campaign-specific version; adding that campaign character to a Table does **not** create another copy.

```text
CharacterIdentity
  -> CampaignCharacter
      -> TableCharacterMembership
```
## Character lifecycle

`Add to Campaign` is a deliberate fork/import operation. Initial source options should leave room for:

- start from level 1;
- copy the current build;
- later: copy a saved level/build snapshot.

VS008 implements the first two. Copy-current-build clones structural ruleset data and maximum HP, not temporary current damage; the new campaign version starts at full copied maximum HP.

After creation, CampaignCharacters evolve independently. A level-5 choice in Campaign A may differ from the same CharacterIdentity's level-5 choice in Campaign B. There is no automatic cross-campaign synchronization.

`Add to Table` is reference/membership only. Every Table inside the same Campaign sees the same CampaignCharacter state: progression, inventory, spells, persistent resources, and campaign history.

The durable character introduced in VS004–VS006 is the canonical CampaignCharacter data in VS008; `CharacterIdentity` now sits above it and can own independent versions in multiple Campaigns.

## Character governance

Once a character participates in a campaign, arbitrary progression/authoring edits should not silently overwrite campaign truth.

Player-authored structural changes use a diff/approval flow:

`edit -> preview changes -> request DM approval -> approve / reject`.

VS008 permits one pending request per CampaignCharacter and records the character revision at submission. A later structural change makes the request stale and prevents approval from overwriting newer campaign truth. `edit-and-approve` remains a future refinement.

Normal gameplay transitions such as damage, healing, resource use, and item consumption do not require a separate approval request when produced through the game/session rules.

A DM or suitably privileged Co-DM may directly modify campaign character state, including hidden/secret state.
## DM-private character state

CampaignCharacter must leave room for a player-visible projection and DM-private data such as hidden item properties, curses, secret effects, unrevealed conditions, and private notes.

Future authenticated clients must receive only the projection they are authorized to see. Hidden data must not be implemented as CSS-only hiding.

## Roles, capabilities, and scopes

Do not reduce authorization to one global `user.role`.

The direction is:

```text
Membership
+ capabilities
+ scope
```

Useful labels include Owner, DM, Co-DM, and Player, but effective access should be capability-based and context-dependent.

Campaign Owner controls privileges. A Co-DM may receive only selected capabilities such as session running, scene/lore editing, NPC management, presentation, or table management.

World permissions may apply to the complete World Graph or to a selected node/subgraph (for example `Greyhaven + descendants`). Table permissions are separate, so one person may DM one Table and play at another within the same Campaign.
## Scheduling (future)

Scheduling is not part of the immediate MVP slice, but the Table model should leave room for it.

Future flow:

```text
propose dates
  -> players vote availability
  -> optional alternative proposals
  -> DM/Owner closes poll
  -> winning option becomes Scheduled Session
```

Notifications may later cover new polls, uncast votes, selected dates, and pre-session reminders. Calendar integration can layer on top without changing the Campaign/Table/Session boundary.

## Planned implementation order

**VS007 — Product Home & Campaign Flow — implemented foundation**

Campaign/Table/membership boundaries, Home/Campaign/Table/Characters surfaces, socket-free product browsing, and contextual Play/Director navigation are implemented. The current preview maps one persistent starter Table to the existing single live Session; concurrent per-Table rooms remain future runtime work.

**VS008 — Character Campaign Lifecycle — implemented**

CharacterIdentity, independent campaign imports/forks, Table membership by reference, structural change requests with stale-write protection, direct DM overrides, an explicit DM-private data boundary, and Table-filtered live character projection are implemented. Auth is still deferred, so governance affordances are not yet security enforcement.

**VS009 — Permissions & Co-DM Scopes — implemented**

Explicit Campaign/world and Table/session capabilities, world subgraph scopes, collaborator management, Policy Preview and centralized transport enforcement are implemented before authenticated principal resolution.

**VS010 — Live Reliability & Recovery — implemented**

Application heartbeat, stale live-state invalidation, explicit Retry ownership, visible command-rejection UX and Offline Companion stickiness harden the intended Table -> Play flow without adding background synchronization or auth.

The next gameplay/product slice should now be chosen from actual playtest friction rather than extending temporary navigation or reliability scaffolding by default.
