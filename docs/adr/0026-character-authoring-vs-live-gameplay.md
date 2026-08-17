# ADR 0026 — Character authoring and live gameplay use different mutation paths

Status: Accepted

## Context

VS004–VS006 exposed character creation and structural editing directly through the Colyseus room because the product had only one development session. VS008 introduces `CharacterIdentity`, campaign-specific character versions, Table membership, progression approval and DM-private state. Leaving structural edits in the live room would bypass those lifecycle rules and make campaign authoring indistinguishable from gameplay state transitions.

At the same time, normal table actions such as taking damage, healing, rolling initiative or resolving an attack must remain low-latency authoritative session commands and must not become approval requests.

## Decision

Structural character authoring is a Product lifecycle concern and uses the game-server HTTP API backed by SurrealDB. This includes identity creation, adding/forking a character into a Campaign, adding the CampaignCharacter to a Table, progression/build change requests, approval/rejection, direct DM structural overrides and DM-private character state.

Gameplay mutations remain Colyseus commands. HP changes produced by play, initiative and attacks continue through the authoritative live room and its event/snapshot transaction rules.

The live room projects only characters referenced by its current Table. After an HTTP mutation changes a Table-visible character, the product API calls the active room through Colyseus `matchMaker.remoteRoomCall()` and the room reloads its character projection from persistence. Structural authoring does not emit session gameplay events.

The runtime Character Library is therefore a selector, not a second create/edit surface.

## Consequences

- campaign lifecycle rules cannot be bypassed through the normal live UI;
- gameplay remains fast and authoritative without approval friction;
- one CampaignCharacter can be referenced by multiple Tables without copying it;
- product authoring and live state can converge immediately without duplicating mutation logic;
- the current starter live room still represents only `main-table`; independent concurrent per-Table rooms remain future work;
- auth is still deferred, so HTTP lifecycle endpoints and DM-private endpoints are **not** permission/security boundaries yet. The preview member is treated as the local owner for development only.