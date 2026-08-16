# ADR 0013 — Authoritative token movement with provisional controllers

Status: accepted for the private development foundation.

## Context
VS003 needs draggable player, NPC and object tokens before application authentication or DM/player roles have been chosen. Client-only token movement would violate the live-runtime authority boundary.

## Decision
Persist scene tokens in SurrealDB, but route placement and movement intents through the Colyseus room. The server validates token kind, label, normalized coordinates, scene existence and movement ownership before committing changes.

Only tokens for the active scene are projected into Colyseus live state. Durable Atlas data may contain tokens for any scene. Presenting a scene replaces the live token set with the durable tokens for that scene.

A player token may be provisionally claimed by the client name that creates it. A claimed token rejects movement from another client name. NPC, object and intentionally unclaimed player tokens have no controller and are movable by any participant in this private preview.

Token mutation and the corresponding session event + recovery snapshot commit in one SurrealDB transaction.

## Consequences
`controllerName` is an engineering proof of ownership semantics, not authentication. It is user-controlled local state and must not become a production authorization boundary. Once auth is selected, real user/actor identity replaces this provisional controller without changing the token-movement contract.
