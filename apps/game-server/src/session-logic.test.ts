import { describe, expect, it } from "vitest";
import { createBasicAttackEvent, createHpEvent, createInitiativeAdvancedEvent, createInitiativeRollEvent, createRollEvent, createScenePresentedEvent, createTokenCreatedEvent, createTokenMovedEvent, resolveBasicAttack } from "./session-logic.js";

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

  it("resolves basic attacks with server RNG, AC and critical damage dice", () => {
    const values = [20, 6, 4];
    const resolution = resolveBasicAttack({ attackModifier: 5, targetArmorClass: 18, damageDiceCount: 1, damageDie: 8, damageModifier: 3 }, () => values.shift() ?? 1);
    expect(resolution).toMatchObject({ natural: 20, total: 25, hit: true, critical: true, damage: 13 });
    expect(resolution.damageRolls).toEqual([6, 4]);
    const event = createBasicAttackEvent({ ...base, attackerCharacterId: "mira", attackerName: "Mira", attackId: "sword", attackName: "Longsword", targetEntryId: "goblin", targetCharacterId: null, targetName: "Goblin", damageType: "slashing", resolution, previousHp: 14, nextHp: 1 });
    expect(event.kind).toBe("attack"); expect(event.summary).toContain("critical hit"); expect(event.payload).toMatchObject({ previousHp: 14, nextHp: 1 });
  });

  it("treats natural 1 as a miss even when the total reaches AC", () => {
    const resolution = resolveBasicAttack({ attackModifier: 20, targetArmorClass: 10, damageDiceCount: 1, damageDie: 6, damageModifier: 4 }, () => 1);
    expect(resolution.hit).toBe(false); expect(resolution.damage).toBe(0); expect(resolution.damageRolls).toEqual([]);
  });

  it("creates initiative roll and advance events", () => {
    const rolled = createInitiativeRollEvent({ ...base, entryId: "i1", characterId: "mira", label: "Mira", natural: 14, modifier: 2, total: 16 });
    const advanced = createInitiativeAdvancedEvent({ ...base, sequence: 5, label: "Goblin", round: 2 });
    expect(rolled.kind).toBe("initiative");
    expect(rolled.payload).toMatchObject({ action: "rolled", total: 16, characterId: "mira" });
    expect(advanced.summary).toContain("round 2");
  });

});
