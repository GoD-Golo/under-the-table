# Vertical Slice 009 — Permissions & Co-DM Scopes

Status: **implemented and verified**

## Goal

Turn the role labels introduced with Campaign/Table context into an explicit authorization model without inventing fake authentication.

```text
role label / preset
        ↓ configuration only
capabilities + scopes
        ↓ evaluated by policy engine
allow / deny
```

VS009 focuses on delegation: an Owner can add a DM, Co-DM or Player membership, start from a role package, then fine-tune campaign capabilities, world scope and Table-specific capabilities.

## Capability model

Campaign capabilities:

- `campaign.members.manage`
- `world.read`
- `world.scene.edit`
- `world.lore.edit`
- `world.npc.manage`
- `character.propose`
- `character.review`
- `character.edit`
- `character.private`

Table capabilities:

- `session.join`
- `session.run`
- `session.present`
- `table.manage`
- `character.play`

Role labels do **not** grant access at runtime. The role helpers only provide initial capability packages when a membership is created/granted. Existing capabilities can then diverge from the readable label.

The Player campaign preset does not receive `world.read`. In the current architecture `world.read` authorizes the complete prep Atlas, not a player-safe lore projection. Player-visible world reading will use a filtered projection rather than reusing DM-prep read access.

## World scopes

Campaign/world capabilities can currently use:

- `campaign` — the full campaign world;
- `world_subgraph` — a selected canonical world entity, with optional descendant intent.

The policy engine already accepts explicit `ancestorEntityIds` and correctly evaluates descendant scope. The current world data model, however, does not yet have a canonical containment/ancestry relation. Scene hotspot links are navigation links, not a safe parent/child hierarchy, so VS009 deliberately does not reinterpret them as containment.

Current runtime enforcement therefore proves campaign-wide and exact-world-entity scope. `includeDescendants` becomes operational as soon as explicit World Graph containment supplies ancestry.

The current `GET /api/atlas` returns one complete Atlas snapshot. A scoped collaborator must **not** receive that full snapshot and rely on client-side hiding. Until server-side scoped Atlas projection exists, full Atlas access conservatively requires campaign-wide `world.read`. The UI reflects this by withholding the full World/Director entry when only a partial scope is available.

## Campaign collaborator UI

Campaign Home now contains a Collaborators section:

- the system-managed `Local Preview` Owner is visible but cannot be edited/revoked before authentication;
- Owner can add DM / Co-DM / Player collaborators from role presets;
- campaign capabilities are independently toggleable;
- world scope can be whole-campaign or a selected world entity;
- each Table has independent membership/capabilities;
- campaign revoke cascades only that collaborator's Table memberships in the same Campaign;
- Policy Preview evaluates a selected membership/capability/resource and displays Allowed/Denied plus the reason without impersonating the member or executing an action.

Member keys such as `preview-collaborator-<uuid>` are configuration references, **not login identities**.

## Enforcement surfaces

VS009 routes existing mutations through the centralized policy service.

**Atlas HTTP**

- full Atlas read -> campaign-wide `world.read`;
- root scene creation -> campaign-wide `world.scene.edit`;
- scene background / hotspot edit -> `world.scene.edit` on the scene's canonical entity scope;
- hotspot lore summary -> also `world.lore.edit`.

**Character lifecycle HTTP**

- add identity to Campaign / change request -> `character.propose`;
- approve/reject request -> `character.review`;
- direct structural override -> `character.edit`;
- DM-private character state -> `character.private`;
- add a CampaignCharacter to a Table -> Table `table.manage`.

**Live room**

- join -> `session.join` via `onAuth()`;
- dice/HP/PC initiative/basic attacks/player-token actions -> `character.play`;
- quick NPC initiative, turn advance/clear, NPC/object token actions and fog -> `session.run`;
- Present scene -> `session.present`.

These checks use the fixed preview principal today. They are still useful because future authenticated principal resolution can enter at one boundary rather than replacing each mutation rule.

## Verification evidence

Pure domain policy tests prove that role labels alone grant nothing, exact and descendant world scopes evaluate correctly, Table rights stay separate, presets produce the intended packages, and malformed scopes are rejected.

The final frozen-install quality gate passes strict workspace typechecking, ESLint, production builds and **43 tests** total: 30 generic domain tests, 6 D&D 2024 adapter tests and 7 game-server tests. `git diff --check` is clean.

After rebuilding the private Compose preview from the exact candidate tree, both health endpoints passed. A non-mutating Colyseus join probe passed `onAuth()` / `session.join`, recovered one Table character and observed session sequence **95** without creating a gameplay event.

A disposable persisted Co-DM policy smoke proved:

- exact Greyhaven `world.scene.edit` -> **allowed**;
- Copper Road under a Greyhaven-only exact scope -> **outside_scope**;
- `campaign.members.manage` -> **missing_capability**;
- `session.run` before Table membership -> **missing_membership**;
- Co-DM Table grant -> `session.run` **allowed**;
- same Table preset -> `table.manage` **missing_capability**;
- campaign revoke cascaded the disposable Table membership;
- permission configuration and cleanup did not create gameplay events; session sequence remained **95**.

Browser QA exercised collaborator creation, scoped policy preview and Table grant at 1440x900 and 390x844. Both layouts had zero horizontal overflow and zero console/page errors. Independent clean mobile verification repeated the 390px no-overflow/error checks after fixture cleanup. QA collaborators were revoked through the Product API after each run. The final Product snapshot contains only the system-managed preview memberships and Mira Voss at **32/32 HP**, with zero pending change requests and session sequence still **95**.

## Security boundary

VS009 is an authorization-policy foundation, not an authentication milestone. All real clients still resolve to `local-preview`, which has Owner/DM capabilities. Therefore the private Tailscale gateway remains the practical access boundary and capability checks do not yet separate two real humans.

See ADR 0027 and `SECURITY.md`.

## Explicit non-goals

VS009 does not add login/accounts, invitation acceptance, authenticated principal resolution, character ownership, secure secret projection, scoped Atlas filtering, canonical world containment ancestry, audit-history UI, or per-user notification delivery.