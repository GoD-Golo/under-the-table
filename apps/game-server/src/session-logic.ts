import { clampHitPoints, rollDie, type GameEvent, type RandomInt } from "@utt/domain";

interface CommonInput {
  sessionId: string;
  sequence: number;
  actor: string;
  at: string;
}

export function createRollEvent(
  input: CommonInput & { sides: number; modifier: number },
  randomInt: RandomInt
): { event: GameEvent; roll: ReturnType<typeof rollDie> } {
  const roll = rollDie(input.sides, input.modifier, randomInt);
  const sign = roll.modifier >= 0 ? `+${roll.modifier}` : `${roll.modifier}`;
  return {
    roll,
    event: {
      sequence: input.sequence,
      sessionId: input.sessionId,
      kind: "roll",
      actor: input.actor,
      summary: `${input.actor} rolled d${roll.sides} ${sign}: ${roll.natural} -> ${roll.total}`,
      payload: { ...roll },
      at: input.at
    }
  };
}

export function createHpEvent(
  input: CommonInput & { characterId: string; characterName: string; currentHp: number; maxHp: number; delta: number }
): { event: GameEvent; nextHp: number } {
  const nextHp = clampHitPoints(input.currentHp, input.maxHp, input.delta);
  const actualDelta = nextHp - input.currentHp;
  return {
    nextHp,
    event: {
      sequence: input.sequence,
      sessionId: input.sessionId,
      kind: "hp",
      actor: input.actor,
      summary: `${input.actor} changed ${input.characterName} HP ${input.currentHp} -> ${nextHp} (${actualDelta >= 0 ? "+" : ""}${actualDelta})`,
      payload: { characterId: input.characterId, previousHp: input.currentHp, nextHp, requestedDelta: input.delta, actualDelta },
      at: input.at
    }
  };
}

export function createScenePresentedEvent(
  input: CommonInput & { sceneId: string; sceneName: string }
): GameEvent {
  return {
    sequence: input.sequence,
    sessionId: input.sessionId,
    kind: "scene_presented",
    actor: input.actor,
    summary: `${input.actor} presented ${input.sceneName}`,
    payload: { sceneId: input.sceneId, sceneName: input.sceneName },
    at: input.at
  };
}

export function createTokenCreatedEvent(input: CommonInput & {
  tokenId: string; sceneId: string; kind: string; label: string; x: number; y: number; controllerName: string | null;
}): GameEvent {
  return {
    sequence: input.sequence, sessionId: input.sessionId, kind: "token_created", actor: input.actor,
    summary: `${input.actor} placed ${input.label}`,
    payload: { tokenId: input.tokenId, sceneId: input.sceneId, kind: input.kind, label: input.label, x: input.x, y: input.y, controllerName: input.controllerName },
    at: input.at
  };
}

export function createTokenMovedEvent(input: CommonInput & {
  tokenId: string; label: string; fromX: number; fromY: number; x: number; y: number;
}): GameEvent {
  return {
    sequence: input.sequence, sessionId: input.sessionId, kind: "token_moved", actor: input.actor,
    summary: `${input.actor} moved ${input.label}`,
    payload: { tokenId: input.tokenId, fromX: input.fromX, fromY: input.fromY, x: input.x, y: input.y },
    at: input.at
  };
}

export function createInitiativeRollEvent(input: CommonInput & {
  entryId: string; characterId: string | null; label: string; natural: number; modifier: number; total: number;
}): GameEvent {
  return {
    sequence: input.sequence, sessionId: input.sessionId, kind: "initiative", actor: input.actor,
    summary: `${input.actor} rolled initiative for ${input.label}: ${input.natural} ${input.modifier >= 0 ? "+" : ""}${input.modifier} -> ${input.total}`,
    payload: { action: "rolled", entryId: input.entryId, characterId: input.characterId, label: input.label, natural: input.natural, modifier: input.modifier, total: input.total },
    at: input.at
  };
}

export function createInitiativeAdvancedEvent(input: CommonInput & { label: string; round: number }): GameEvent {
  return {
    sequence: input.sequence, sessionId: input.sessionId, kind: "initiative", actor: input.actor,
    summary: `${input.actor} advanced initiative to ${input.label} · round ${input.round}`,
    payload: { action: "advanced", label: input.label, round: input.round }, at: input.at
  };
}

export function createInitiativeClearedEvent(input: CommonInput): GameEvent {
  return {
    sequence: input.sequence, sessionId: input.sessionId, kind: "initiative", actor: input.actor,
    summary: `${input.actor} cleared initiative`, payload: { action: "cleared" }, at: input.at
  };
}
