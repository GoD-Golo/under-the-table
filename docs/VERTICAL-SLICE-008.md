# Vertical Slice 008 — Character Campaign Lifecycle

Status: **implemented and verified**

## Goal

Turn durable characters from the earlier single-session MVP into a product lifecycle that supports one reusable character identity, independent campaign-specific versions, and Table membership by reference.

```text
CharacterIdentity
  -> CampaignCharacter
      -> TableCharacterMembership
```

VS008 also establishes the first campaign governance loop for structural character changes while keeping ordinary gameplay mutations on the live-session path.

## Implemented lifecycle

Characters Home now groups campaign versions beneath a persistent `CharacterIdentity`. A new identity can exist before it joins a Campaign.

`Add to Campaign` creates a new independent CampaignCharacter. The current slice supports two explicit sources:

- **Start at level 1** — opens the D&D 2024 Character Builder with level fixed to 1;
- **Copy current build** — copies the chosen source version's structural ruleset data and maximum HP into the new campaign version.

Copy-current-build deliberately does **not** copy temporary current damage. The new campaign version starts with its copied maximum HP as its current HP.

After creation, campaign versions do not synchronize. Choices in Campaign A can diverge permanently from the same identity's version in Campaign B.

`Add to Table` creates only a `TableCharacterMembership`; it does not copy the character. All Tables in one Campaign that reference that character therefore see the same CampaignCharacter state.

## Legacy migration

The existing VS004–VS007 `character` rows are kept as canonical CampaignCharacter data rather than copied into a replacement table. During VS008 bootstrap, any durable `character` that has no `campaign_character_membership` is treated as legacy or an interrupted migration and is wrapped in an identity plus starter campaign/table memberships. New VS008 campaign characters create their membership in the same transaction as the character, so this recovery rule is safe to repeat after a crash.

Mira is migrated deterministically as:

```text
mira-voss-identity
  -> mira-voss
      -> first-table-campaign
          -> main-table
```

Her durable HP and existing session/event history are untouched. Migration source is recorded as `legacy_migration`. Future CampaignCharacters created through the lifecycle are not auto-enrolled into the starter Campaign or Table; they already have an explicit campaign membership, so the orphan-recovery rule does not match them.

## Structural change governance

Player-style structural editing now creates a `CharacterChangeRequest` instead of immediately changing campaign truth.

```text
edit build
  -> pending request
  -> DM review
      -> approve and apply
      -> reject
```

Only one pending structural request is allowed per CampaignCharacter. Each request records the character's `updatedAt` value when submitted. Approval is rejected as stale if the character changed after submission, preventing a late approval from overwriting a newer DM override or other structural update.

The current preview Owner/DM affordance can also perform a direct structural override. VS009 now routes that action through the `character.edit` capability, while authenticated principal resolution remains deferred.

Normal gameplay damage/healing and combat resource transitions remain live-room mutations and do not create approval requests.

## DM-private state boundary

`campaign_character_private_state` stores an explicit flexible object outside the normal Product snapshot. Characters Home currently exposes a small DM-private notes editor as the first consumer.

This is **not a security boundary yet**. Authentication and capability enforcement remain deferred, so any client able to reach the private development gateway can currently call the private-state endpoint directly. The purpose of VS008 is to establish the correct data/projection boundary so later authorization does not need to split player-visible and hidden data after the fact.

## Live-runtime integration

Structural authoring no longer travels through `create_character` / `update_character` Colyseus messages; those commands and the corresponding live UI were removed.

The current live room loads only characters referenced by `main-table`. The runtime Character Library is selection-only. When Add-to-Table, an approved request, or a direct DM override changes the visible character set/build, the HTTP product API finds the active Colyseus room and calls `refreshCharactersFromPersistence()` through `matchMaker.remoteRoomCall()`.

This keeps one source of structural truth in persistence while preserving Colyseus as the authoritative gameplay mutation path. See ADR 0026.

## Verification evidence

The lifecycle smoke used a disposable `VS008 QA` identity and deleted only the IDs it created afterwards. It proved:

- a level-1 CampaignCharacter is created without automatic Table membership;
- the character is absent from the live room before Add-to-Table;
- Add-to-Table makes it appear in the active room without copying it;
- a pending structural request does not change live state;
- approval changes the persisted build and active room projection;
- direct DM structural override also refreshes the active room;
- DM-private state round-trips outside the general Product snapshot;
- structural lifecycle operations left the session gameplay sequence unchanged at **95 -> 95**;
- a request submitted before a later DM override is rejected as stale on approval.

Desktop 1440x900 and mobile 390x844 browser QA verified Characters Home, the reused builder, private-state sheet, and the read-only live Character Library with zero horizontal overflow, console errors, or page errors.

After QA cleanup, persistent character state was again only Mira Voss, identity `mira-voss-identity`, HP 32/32, `main-table`, with zero change requests and unchanged session history.

## Explicit non-goals

VS008 does not add authentication, secure private-state delivery, inventory/item ownership, saved build snapshots, edit-and-approve, character deletion/archival, campaign creation UI, independent concurrent live rooms per Table, or automatic cross-campaign synchronization.