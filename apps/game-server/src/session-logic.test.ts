import { describe, expect, it } from "vitest";
import { createHpEvent, createRollEvent, createScenePresentedEvent, createTokenCreatedEvent, createTokenMovedEvent } from "./session-logic.js";

const base = { sessionId: "test", sequence: 4, actor: "Ada", at: "2026-08-16T00:00:00.000Z" };

describe("authoritative session transitions", () => {
  it("creates a deterministic roll event from the injected server RNG", () => {
    const result = createRollEvent({ ...base, sides: 20, modifier: 5 }, () => 17);
    expect(result.roll.total).toBe(22);
    expect(result.event.payload).toMatchObject({ natural: 17, modifier: 5, total: 22 });
  });

  it("persists the actual clamped HP delta", () => {
    const result = createHpEvent({ ...base, characterId: "mira", characterName: "Mira", currentHp: 3, maxHp: 32, delta: -10 });
    expect(result.nextHp).toBe(0);
    expect(result.event.payload).toMatchObject({ characterId: "mira", requestedDelta: -10, actualDelta: -3 });
    expect(result.event.summary).toContain("Mira HP");
  });
  it("creates a durable scene presentation event", () => {
    const event = createScenePresentedEvent({
      sessionId: "s1", sequence: 3, actor: "DM", at: "now", sceneId: "greyhaven", sceneName: "Greyhaven"
    });
    expect(event.kind).toBe("scene_presented");
    expect(event.payload).toEqual({ sceneId: "greyhaven", sceneName: "Greyhaven" });
  });

  it("creates token placement and movement events", () => {
    const placed = createTokenCreatedEvent({ ...base, tokenId: "t1", sceneId: "s1", kind: "player", label: "Mira", x: .2, y: .3, controllerName: "Ada" });
    const moved = createTokenMovedEvent({ ...base, sequence: 5, tokenId: "t1", label: "Mira", fromX: .2, fromY: .3, x: .4, y: .5 });
    expect(placed.kind).toBe("token_created");
    expect(placed.payload).toMatchObject({ tokenId: "t1", controllerName: "Ada" });
    expect(moved.kind).toBe("token_moved");
    expect(moved.payload).toMatchObject({ fromX: .2, x: .4, y: .5 });
  });

});
