# ADR 0022 — Public entry does not mount the live runtime

Status: Accepted

## Context

Before the landing pass, `App` mounted `useLiveRoom()` immediately because Director/Play were the only top-level surfaces. VS007 adds Home, Campaign, Table and Character browsing. Neither a showcase visit nor ordinary product navigation should create Colyseus presence.

## Decision

The React root separates read-only/product navigation from runtime participation.

- root/no hash -> Landing showcase;
- Home/Campaigns/Characters/Campaign/Table routes -> HTTP product read model;
- contextual Table Play and Campaign World/Director routes -> runtime workspace.

`useLiveRoom()` lives only inside the runtime workspace. Product browsing fetches `/game/api/product`, so no live room is created until the user explicitly enters Play/Companion or Director.

## Consequences

- showcase and product browsing are isolated from live authority/presence;
- Campaign/Table context can be inspected without joining a Session;
- entering a runtime surface opens the room and leaving it closes that connection;
- hash routing is still intentionally minimal and can later be replaced without changing this boundary.
