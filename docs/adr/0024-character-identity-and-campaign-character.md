# ADR 0024 — Character identity and campaign character are separate

Status: Accepted

## Context

A user may want to reuse the same character concept in multiple campaigns while making different progression choices in each. Within one campaign, however, that character must remain the same across every Table: inventory, progression, spells, resources, and campaign history cannot silently fork per table.

## Decision

Use three distinct concepts:

```text
CharacterIdentity
  -> CampaignCharacter
      -> TableCharacterMembership
```

`Add to Campaign` deliberately creates/imports a CampaignCharacter from a starting point such as level 1 or the current build. CampaignCharacters then evolve independently and are never automatically synchronized across campaigns.

`Add to Table` creates membership/reference only; it does not duplicate character state.

The durable character implemented in VS004–VS006 is semantically closest to the future CampaignCharacter and should be migrated accordingly rather than discarded.

## Consequences

Characters Home may aggregate one identity and several campaign versions. Future campaign progression edits can support DM approval without changing the character's versions in unrelated campaigns.
