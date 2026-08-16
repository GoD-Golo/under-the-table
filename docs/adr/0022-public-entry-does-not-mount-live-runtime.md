# ADR 0022 — Public entry does not mount the live runtime

Status: Accepted

## Context

Before the landing pass, `App` mounted `useLiveRoom()` immediately because Director/Play were the only top-level surfaces. A real landing page should not open a Colyseus room merely because somebody views the product entry surface.

## Decision

The React root now has a small presentation-level entry state:

- root/no hash → Landing;
- `#play` → Play runtime;
- `#director` → Director runtime.

`useLiveRoom()` lives inside the runtime workspace component, so the landing surface does not create a room or load campaign authority until the user enters Play or Director.

## Consequences

- marketing/design iteration is isolated from live authority;
- passive landing visits do not create presence/session connections;
- existing Director/Play state and server authority remain unchanged;
- hash routing is intentionally minimal and can later be replaced by a router without changing the live-room boundary.
