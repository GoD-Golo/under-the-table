import { randomInt, randomUUID } from "node:crypto";
import { Room, type Client } from "@colyseus/core";
import {
  normalizeTokenCoordinate, normalizeTokenKind, normalizeTokenLabel,
  type CharacterRuntime, type GameEvent, type InitiativeState, type RecentEvent, type SceneToken, type SessionSnapshot
} from "@utt/domain";
import { DND2024_RULESET_ID, abilityModifier, attackModifier, normalizeDnd2024Data } from "@utt/rules-dnd2024";
import {
  CharacterResourceState,
  CharacterState,
  InitiativeEntryState,
  EventState,
  LiveRoomState,
  TokenState,
  MESSAGE,
  SERVER_MESSAGE,
  SESSION_ID,
  type AdjustHpCommand,
  type CreateCharacterCommand,
  type CreateTokenCommand,
  type JoinOptions,
  type MoveTokenCommand,
  type PresentSceneCommand,
  type PerformBasicAttackCommand,
  type RollCommand,
  type RollInitiativeCommand,
  type SetFogCellCommand,
  type SetFogEnabledCommand,
  type UpdateCharacterCommand
} from "@utt/protocol";
import { surrealStore } from "../persistence/surreal-store.js";
import { createBasicAttackEvent, createHpEvent, createInitiativeAdvancedEvent, createInitiativeClearedEvent, createInitiativeRollEvent, createRollEvent, createScenePresentedEvent, createTokenCreatedEvent, createTokenMovedEvent, resolveBasicAttack } from "../session-logic.js";

const RECENT_EVENT_LIMIT = 12;

function safeClientName(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().replace(/\s+/g, " ").slice(0, 24);
  return cleaned || fallback;
}

function eventToState(event: GameEvent): EventState {
  const state = new EventState();
  state.sequence = event.sequence;
  state.kind = event.kind;
  state.actor = event.actor;
  state.summary = event.summary;
  state.at = event.at;
  return state;
}

function tokenToState(token: SceneToken): TokenState {
  const state = new TokenState();
  state.id = token.id;
  state.sceneId = token.sceneId;
  state.kind = token.kind;
  state.label = token.label;
  state.x = token.x;
  state.y = token.y;
  state.controllerName = token.controllerName ?? "";
  return state;
}

function characterToState(runtime: CharacterRuntime): CharacterState {
  const state = new CharacterState();
  state.id = runtime.definition.id;
  state.name = runtime.definition.name;
  state.rulesetId = runtime.definition.rulesetId;
  state.schemaVersion = runtime.definition.schemaVersion;
  state.rulesetDataJson = JSON.stringify(runtime.definition.rulesetData);
  for (const resource of runtime.resources) {
    const resourceState = new CharacterResourceState();
    resourceState.id = resource.id;
    resourceState.key = resource.key;
    resourceState.label = resource.label;
    resourceState.current = resource.current;
    resourceState.max = resource.max;
    state.resources.set(resource.key, resourceState);
  }
  return state;
}

function initiativeEntryToState(entry: InitiativeState["entries"][number]): InitiativeEntryState {
  const state = new InitiativeEntryState();
  state.id = entry.id;
  state.label = entry.label;
  state.score = entry.score;
  state.characterId = entry.characterId ?? "";
  state.armorClass = entry.armorClass ?? 0;
  state.currentHp = entry.currentHp ?? 0;
  state.maxHp = entry.maxHp ?? 0;
  return state;
}

export class VerticalSliceRoom extends Room {
  state = new LiveRoomState();
  private readonly names = new Map<string, string>();
  private commandQueue: Promise<void> = Promise.resolve();

  async onCreate(): Promise<void> {
    this.maxClients = 12;
    this.state.sessionId = SESSION_ID;
    const starterScene = await surrealStore.ensureStarterScene();
    this.state.activeSceneId = starterScene.id;

    await surrealStore.ensureStarterCharacterFromLegacySnapshot(SESSION_ID);
    const snapshot = await surrealStore.loadSnapshot(SESSION_ID);
    if (snapshot) this.restoreSnapshot(snapshot);
    this.replaceCharacters(await surrealStore.listCharacterRuntimes());
    this.replaceTokens(await surrealStore.listSceneTokens(this.state.activeSceneId));
    this.replaceFog(await surrealStore.getSceneFog(this.state.activeSceneId));
    console.info(`[room] created ${this.roomId}; restored sequence=${snapshot?.sequence ?? 0}, characters=${this.state.characters.size}`);

    this.onMessage(MESSAGE.roll, (client, message: RollCommand) => {
      this.enqueue(client, () => this.handleRoll(client, message));
    });
    this.onMessage(MESSAGE.adjustHp, (client, message: AdjustHpCommand) => {
      this.enqueue(client, () => this.handleHp(client, message));
    });
    this.onMessage(MESSAGE.presentScene, (client, message: PresentSceneCommand) => {
      this.enqueue(client, () => this.handlePresentScene(client, message));
    });
    this.onMessage(MESSAGE.createCharacter, (client, message: CreateCharacterCommand) => {
      this.enqueue(client, () => this.handleCreateCharacter(client, message));
    });
    this.onMessage(MESSAGE.updateCharacter, (client, message: UpdateCharacterCommand) => {
      this.enqueue(client, () => this.handleUpdateCharacter(client, message));
    });
    this.onMessage(MESSAGE.rollInitiative, (client, message: RollInitiativeCommand) => {
      this.enqueue(client, () => this.handleRollInitiative(client, message));
    });
    this.onMessage(MESSAGE.advanceInitiative, (client) => {
      this.enqueue(client, () => this.handleAdvanceInitiative(client));
    });
    this.onMessage(MESSAGE.clearInitiative, (client) => {
      this.enqueue(client, () => this.handleClearInitiative(client));
    });
    this.onMessage(MESSAGE.performBasicAttack, (client, message: PerformBasicAttackCommand) => {
      this.enqueue(client, () => this.handlePerformBasicAttack(client, message));
    });
    this.onMessage(MESSAGE.createToken, (client, message: CreateTokenCommand) => {
      this.enqueue(client, () => this.handleCreateToken(client, message));
    });
    this.onMessage(MESSAGE.moveToken, (client, message: MoveTokenCommand) => {
      this.enqueue(client, () => this.handleMoveToken(client, message));
    });
    this.onMessage(MESSAGE.setFogEnabled, (client, message: SetFogEnabledCommand) => {
      this.enqueue(client, () => this.handleSetFogEnabled(client, message));
    });
    this.onMessage(MESSAGE.setFogCell, (client, message: SetFogCellCommand) => {
      this.enqueue(client, () => this.handleSetFogCell(client, message));
    });
  }

  onJoin(client: Client, options: JoinOptions): void {
    const fallback = `Player-${client.sessionId.slice(0, 4)}`;
    this.names.set(client.sessionId, safeClientName(options?.clientName, fallback));
    this.state.connectedPlayers += 1;
  }

  onLeave(client: Client): void {
    this.names.delete(client.sessionId);
    this.state.connectedPlayers = Math.max(0, this.state.connectedPlayers - 1);
  }

  private enqueue(client: Client, task: () => Promise<void>): void {
    this.commandQueue = this.commandQueue
      .then(task)
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "command failed";
        console.error("[room] command rejected", error);
        client.send(SERVER_MESSAGE.commandError, { message });
      });
  }

  private actorFor(client: Client): string {
    return this.names.get(client.sessionId) ?? `Player-${client.sessionId.slice(0, 4)}`;
  }

  private replaceCharacters(characters: CharacterRuntime[]): void {
    this.state.characters.clear();
    for (const character of characters) this.state.characters.set(character.definition.id, characterToState(character));
  }

  private replaceTokens(tokens: SceneToken[]): void {
    this.state.tokens.clear();
    for (const token of tokens) this.state.tokens.set(token.id, tokenToState(token));
  }

  private replaceFog(fog: { enabled: boolean; revealedCells: string[] }): void {
    this.state.fogEnabled = fog.enabled;
    this.state.fogRevealedCells.clear();
    for (const cell of fog.revealedCells) this.state.fogRevealedCells.push(cell);
  }

  private replaceInitiative(initiative: InitiativeState): void {
    this.state.initiativeRound = initiative.round;
    this.state.initiativeActiveIndex = initiative.activeIndex;
    this.state.initiativeEntries.clear();
    for (const entry of initiative.entries) this.state.initiativeEntries.push(initiativeEntryToState(entry));
  }

  private currentInitiative(): InitiativeState {
    return {
      round: this.state.initiativeRound,
      activeIndex: this.state.initiativeActiveIndex,
      entries: Array.from(this.state.initiativeEntries).map((entry) => ({
        id: entry.id, label: entry.label, score: entry.score, characterId: entry.characterId || null,
        armorClass: entry.armorClass > 0 ? entry.armorClass : null,
        currentHp: entry.maxHp > 0 ? entry.currentHp : null,
        maxHp: entry.maxHp > 0 ? entry.maxHp : null
      }))
    };
  }

  private async handleCreateCharacter(_client: Client, command: CreateCharacterCommand): Promise<void> {
    const rulesetData = command?.rulesetId === DND2024_RULESET_ID ? normalizeDnd2024Data(command?.rulesetData) : command?.rulesetData ?? {};
    const runtime = await surrealStore.createCharacter({
      name: command?.name, rulesetId: command?.rulesetId, maxHp: command?.maxHp, rulesetData
    });
    this.state.characters.set(runtime.definition.id, characterToState(runtime));
  }

  private async handleUpdateCharacter(_client: Client, command: UpdateCharacterCommand): Promise<void> {
    if (typeof command?.characterId !== "string" || !command.characterId) throw new Error("characterId is required");
    const existing = this.state.characters.get(command.characterId);
    if (!existing) throw new Error("character not found");
    const rulesetData = existing.rulesetId === DND2024_RULESET_ID ? normalizeDnd2024Data(command?.rulesetData) : command?.rulesetData ?? {};
    const runtime = await surrealStore.updateCharacter({
      characterId: command.characterId, name: command?.name, maxHp: command?.maxHp, rulesetData
    });
    this.state.characters.set(runtime.definition.id, characterToState(runtime));
  }

  private async handleRollInitiative(client: Client, command: RollInitiativeCommand): Promise<void> {
    let characterId: string | null = null;
    let label = typeof command?.label === "string" ? command.label.trim().replace(/\s+/g, " ").slice(0, 80) : "";
    let modifier = 0;

    if (typeof command?.characterId === "string" && command.characterId) {
      const character = this.state.characters.get(command.characterId);
      if (!character) throw new Error("character not found");
      characterId = character.id;
      label = character.name;
      if (character.rulesetId === DND2024_RULESET_ID) {
        const data = normalizeDnd2024Data(JSON.parse(character.rulesetDataJson));
        modifier = abilityModifier(data.abilities.dexterity);
      }
    } else {
      modifier = Number(command?.modifier ?? 0);
      if (!Number.isInteger(modifier) || modifier < -50 || modifier > 50) throw new Error("initiative modifier must be an integer between -50 and 50");
    }
    if (!label) throw new Error("initiative label is required");
    const npcArmorClass = Number(command?.armorClass ?? 10);
    const npcMaxHp = Number(command?.maxHp ?? 10);
    if (!characterId && (!Number.isInteger(npcArmorClass) || npcArmorClass < 1 || npcArmorClass > 99)) throw new Error("NPC armor class must be 1-99");
    if (!characterId && (!Number.isInteger(npcMaxHp) || npcMaxHp < 1 || npcMaxHp > 9999)) throw new Error("NPC max HP must be 1-9999");

    const natural = randomInt(1, 21);
    const total = natural + modifier;
    const current = this.currentInitiative();
    const activeId = current.entries[current.activeIndex]?.id ?? null;
    const existing = characterId ? current.entries.find((entry) => entry.characterId === characterId) : undefined;
    const entry = {
      id: existing?.id ?? randomUUID(), label, score: total, characterId,
      armorClass: characterId ? null : (existing?.armorClass ?? npcArmorClass),
      currentHp: characterId ? null : (existing?.currentHp ?? npcMaxHp),
      maxHp: characterId ? null : (existing?.maxHp ?? npcMaxHp)
    };
    const entries = existing ? current.entries.map((item) => item.id === existing.id ? entry : item) : [...current.entries, entry];
    entries.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
    const initiative: InitiativeState = {
      round: Math.max(1, current.round),
      activeIndex: activeId ? Math.max(0, entries.findIndex((item) => item.id === activeId)) : 0,
      entries
    };
    const event = createInitiativeRollEvent({
      sessionId: SESSION_ID, sequence: this.state.eventSequence + 1, actor: this.actorFor(client), at: new Date().toISOString(),
      entryId: entry.id, characterId, label, natural, modifier, total
    });
    const latestRoll = { sides: 20, natural, modifier, total };
    await surrealStore.persist(event, this.nextSnapshot(event, latestRoll, this.state.activeSceneId, initiative));
    this.state.latestRollSides = 20;
    this.state.latestRollNatural = natural;
    this.state.latestRollModifier = modifier;
    this.state.latestRollTotal = total;
    this.replaceInitiative(initiative);
    this.applyAcceptedEvent(event);
  }

  private async handlePerformBasicAttack(client: Client, command: PerformBasicAttackCommand): Promise<void> {
    if (typeof command?.attackerCharacterId !== "string" || !command.attackerCharacterId) throw new Error("attackerCharacterId is required");
    if (typeof command?.attackId !== "string" || !command.attackId) throw new Error("attackId is required");
    if (typeof command?.targetEntryId !== "string" || !command.targetEntryId) throw new Error("targetEntryId is required");
    const attacker = this.state.characters.get(command.attackerCharacterId);
    if (!attacker || attacker.rulesetId !== DND2024_RULESET_ID) throw new Error("D&D 2024 attacker not found");
    const attackerData = normalizeDnd2024Data(JSON.parse(attacker.rulesetDataJson));
    const attack = attackerData.attacks.find((item) => item.id === command.attackId);
    if (!attack) throw new Error("attack not found on character");

    const initiative = this.currentInitiative();
    if (!initiative.entries.length || initiative.activeIndex < 0) throw new Error("combat initiative is not active");
    const active = initiative.entries[initiative.activeIndex];
    if (!active || active.characterId !== attacker.id) throw new Error("it is not this character's turn");
    const target = initiative.entries.find((entry) => entry.id === command.targetEntryId);
    if (!target || target.id === active.id) throw new Error("valid target is required");

    let targetArmorClass: number;
    let previousHp: number;
    let targetMaxHp: number;
    let targetCharacterState: CharacterState | undefined;
    if (target.characterId) {
      targetCharacterState = this.state.characters.get(target.characterId);
      if (!targetCharacterState || targetCharacterState.rulesetId !== DND2024_RULESET_ID) throw new Error("target character is unavailable");
      const targetData = normalizeDnd2024Data(JSON.parse(targetCharacterState.rulesetDataJson));
      const hp = targetCharacterState.resources.get("hp");
      if (!hp) throw new Error("target character has no HP resource");
      targetArmorClass = targetData.armorClass; previousHp = hp.current; targetMaxHp = hp.max;
    } else {
      if (target.armorClass === null || target.currentHp === null || target.maxHp === null) throw new Error("NPC target needs AC and HP");
      targetArmorClass = target.armorClass; previousHp = target.currentHp; targetMaxHp = target.maxHp;
    }

    const damageModifier = attack.addAbilityModifier ? abilityModifier(attackerData.abilities[attack.ability]) : 0;
    const resolution = resolveBasicAttack({
      attackModifier: attackModifier(attackerData, attack), targetArmorClass, damageDiceCount: attack.damageDiceCount,
      damageDie: attack.damageDie, damageModifier
    }, randomInt);
    const nextHp = Math.max(0, Math.min(targetMaxHp, previousHp - resolution.damage));
    const nextInitiative: InitiativeState = target.characterId ? initiative : {
      ...initiative, entries: initiative.entries.map((entry) => entry.id === target.id ? { ...entry, currentHp: nextHp } : entry)
    };
    const event = createBasicAttackEvent({
      sessionId: SESSION_ID, sequence: this.state.eventSequence + 1, actor: this.actorFor(client), at: new Date().toISOString(),
      attackerCharacterId: attacker.id, attackerName: attacker.name, attackId: attack.id, attackName: attack.name,
      targetEntryId: target.id, targetCharacterId: target.characterId, targetName: target.label, damageType: attack.damageType,
      resolution, previousHp, nextHp
    });
    const latestRoll = { sides: 20, natural: resolution.natural, modifier: resolution.attackModifier, total: resolution.total };
    const snapshot = this.nextSnapshot(event, latestRoll, this.state.activeSceneId, nextInitiative);
    if (target.characterId && resolution.damage > 0) {
      const resource = await surrealStore.updateCharacterResourceWithEvent(target.characterId, "hp", nextHp, event, snapshot);
      const hpState = targetCharacterState?.resources.get("hp");
      if (hpState) hpState.current = resource.current;
    } else {
      await surrealStore.persist(event, snapshot);
    }
    this.state.latestRollSides = 20; this.state.latestRollNatural = resolution.natural;
    this.state.latestRollModifier = resolution.attackModifier; this.state.latestRollTotal = resolution.total;
    this.replaceInitiative(nextInitiative);
    this.applyAcceptedEvent(event);
  }

  private async handleAdvanceInitiative(client: Client): Promise<void> {
    const current = this.currentInitiative();
    if (!current.entries.length) throw new Error("initiative is empty");
    let activeIndex = current.activeIndex < 0 ? 0 : current.activeIndex + 1;
    let round = Math.max(1, current.round);
    if (activeIndex >= current.entries.length) { activeIndex = 0; round += 1; }
    const initiative: InitiativeState = { ...current, round, activeIndex };
    const label = initiative.entries[activeIndex]?.label ?? "next combatant";
    const event = createInitiativeAdvancedEvent({
      sessionId: SESSION_ID, sequence: this.state.eventSequence + 1, actor: this.actorFor(client), at: new Date().toISOString(), label, round
    });
    await surrealStore.persist(event, this.nextSnapshot(event, this.currentRoll(), this.state.activeSceneId, initiative));
    this.replaceInitiative(initiative);
    this.applyAcceptedEvent(event);
  }

  private async handleClearInitiative(client: Client): Promise<void> {
    const initiative: InitiativeState = { round: 0, activeIndex: -1, entries: [] };
    const event = createInitiativeClearedEvent({
      sessionId: SESSION_ID, sequence: this.state.eventSequence + 1, actor: this.actorFor(client), at: new Date().toISOString()
    });
    await surrealStore.persist(event, this.nextSnapshot(event, this.currentRoll(), this.state.activeSceneId, initiative));
    this.replaceInitiative(initiative);
    this.applyAcceptedEvent(event);
  }

  private async handleCreateToken(client: Client, command: CreateTokenCommand): Promise<void> {
    if (typeof command?.sceneId !== "string" || !command.sceneId) throw new Error("sceneId is required");
    const kind = normalizeTokenKind(command.kind);
    const label = normalizeTokenLabel(command.label);
    const x = normalizeTokenCoordinate(command.x);
    const y = normalizeTokenCoordinate(command.y);
    const actor = this.actorFor(client);
    const tokenId = randomUUID();
    const controllerName = kind === "player" && command.claim !== false ? actor : null;
    const event = createTokenCreatedEvent({
      sessionId: SESSION_ID, sequence: this.state.eventSequence + 1, actor, at: new Date().toISOString(),
      tokenId, sceneId: command.sceneId, kind, label, x, y, controllerName
    });
    const snapshot = this.nextSnapshot(event, this.currentRoll());
    const token = await surrealStore.createTokenWithEvent(
      { tokenId, sceneId: command.sceneId, kind, label, x, y, controllerName }, event, snapshot
    );
    if (token.sceneId === this.state.activeSceneId) this.state.tokens.set(token.id, tokenToState(token));
    this.applyAcceptedEvent(event);
  }

  private async handleMoveToken(client: Client, command: MoveTokenCommand): Promise<void> {
    if (typeof command?.tokenId !== "string" || !command.tokenId) throw new Error("tokenId is required");
    const token = await surrealStore.getToken(command.tokenId);
    if (!token) throw new Error("token not found");
    const actor = this.actorFor(client);
    if (token.controllerName && token.controllerName !== actor) throw new Error(`token is controlled by ${token.controllerName}`);
    const x = normalizeTokenCoordinate(command.x);
    const y = normalizeTokenCoordinate(command.y);
    const event = createTokenMovedEvent({
      sessionId: SESSION_ID, sequence: this.state.eventSequence + 1, actor, at: new Date().toISOString(),
      tokenId: token.id, label: token.label, fromX: token.x, fromY: token.y, x, y
    });
    const snapshot = this.nextSnapshot(event, this.currentRoll());
    const moved = await surrealStore.moveTokenWithEvent(token.id, x, y, event, snapshot);
    const liveToken = this.state.tokens.get(moved.id);
    if (liveToken) { liveToken.x = moved.x; liveToken.y = moved.y; }
    this.applyAcceptedEvent(event);
  }

  private async handleSetFogEnabled(_client: Client, command: SetFogEnabledCommand): Promise<void> {
    if (typeof command?.sceneId !== "string" || command.sceneId !== this.state.activeSceneId) throw new Error("fog can only be edited on the active scene");
    if (typeof command.enabled !== "boolean") throw new Error("fog enabled must be boolean");
    const fog = await surrealStore.setSceneFogEnabled(command.sceneId, command.enabled);
    this.replaceFog(fog);
  }

  private async handleSetFogCell(_client: Client, command: SetFogCellCommand): Promise<void> {
    if (typeof command?.sceneId !== "string" || command.sceneId !== this.state.activeSceneId) throw new Error("fog can only be edited on the active scene");
    if (typeof command.revealed !== "boolean") throw new Error("fog revealed must be boolean");
    const fog = await surrealStore.setSceneFogCell(command.sceneId, command.column, command.row, command.revealed);
    this.replaceFog(fog);
  }

  private async handleRoll(client: Client, command: RollCommand): Promise<void> {
    const sequence = this.state.eventSequence + 1;
    const { event, roll } = createRollEvent({
      sessionId: SESSION_ID,
      sequence,
      actor: this.actorFor(client),
      at: new Date().toISOString(),
      sides: command?.sides,
      modifier: command?.modifier
    }, randomInt);

    const snapshot = this.nextSnapshot(event, {
      sides: roll.sides,
      natural: roll.natural,
      modifier: roll.modifier,
      total: roll.total
    });
    await surrealStore.persist(event, snapshot);

    this.state.latestRollSides = roll.sides;
    this.state.latestRollNatural = roll.natural;
    this.state.latestRollModifier = roll.modifier;
    this.state.latestRollTotal = roll.total;
    this.applyAcceptedEvent(event);
  }

  private async handlePresentScene(client: Client, command: PresentSceneCommand): Promise<void> {
    if (typeof command?.sceneId !== "string" || !command.sceneId) throw new Error("sceneId is required");
    const scene = await surrealStore.getScene(command.sceneId);
    if (!scene) throw new Error("scene not found");
    const event = createScenePresentedEvent({
      sessionId: SESSION_ID,
      sequence: this.state.eventSequence + 1,
      actor: this.actorFor(client),
      at: new Date().toISOString(),
      sceneId: scene.id,
      sceneName: scene.name
    });
    const [sceneTokens, sceneFog] = await Promise.all([surrealStore.listSceneTokens(scene.id), surrealStore.getSceneFog(scene.id)]);
    const snapshot = this.nextSnapshot(event, this.currentRoll(), scene.id);
    await surrealStore.persist(event, snapshot);
    this.state.activeSceneId = scene.id;
    this.replaceTokens(sceneTokens);
    this.replaceFog(sceneFog);
    this.applyAcceptedEvent(event);
  }

  private async handleHp(client: Client, command: AdjustHpCommand): Promise<void> {
    if (typeof command?.characterId !== "string" || !command.characterId) throw new Error("characterId is required");
    const character = this.state.characters.get(command.characterId);
    if (!character) throw new Error("character not found");
    const hp = character.resources.get("hp");
    if (!hp) throw new Error("character has no hp resource");
    const sequence = this.state.eventSequence + 1;
    const { event, nextHp } = createHpEvent({
      sessionId: SESSION_ID, sequence, actor: this.actorFor(client), at: new Date().toISOString(),
      characterId: character.id, characterName: character.name, currentHp: hp.current, maxHp: hp.max, delta: command?.delta
    });
    const snapshot = this.nextSnapshot(event, this.currentRoll());
    const updated = await surrealStore.updateCharacterResourceWithEvent(character.id, "hp", nextHp, event, snapshot);
    hp.current = updated.current;
    this.applyAcceptedEvent(event);
  }

  private applyAcceptedEvent(event: GameEvent): void {
    this.state.eventSequence = event.sequence;
    this.state.events.push(eventToState(event));
    while (this.state.events.length > RECENT_EVENT_LIMIT) this.state.events.shift();
  }

  private currentRoll(): SessionSnapshot["latestRoll"] {
    if (this.state.latestRollSides <= 0) return null;
    return {
      sides: this.state.latestRollSides,
      natural: this.state.latestRollNatural,
      modifier: this.state.latestRollModifier,
      total: this.state.latestRollTotal
    };
  }

  private recentEventsWith(event: GameEvent): RecentEvent[] {
    const existing = Array.from(this.state.events).map((item) => ({
      sequence: item.sequence,
      kind: item.kind as RecentEvent["kind"],
      actor: item.actor,
      summary: item.summary,
      at: item.at
    }));
    return [...existing, {
      sequence: event.sequence,
      kind: event.kind,
      actor: event.actor,
      summary: event.summary,
      at: event.at
    }].slice(-RECENT_EVENT_LIMIT);
  }

  private nextSnapshot(
    event: GameEvent,
    latestRoll: SessionSnapshot["latestRoll"],
    activeSceneId = this.state.activeSceneId,
    initiative = this.currentInitiative()
  ): SessionSnapshot {
    return {
      sessionId: SESSION_ID, sequence: event.sequence, activeSceneId, latestRoll,
      recentEvents: this.recentEventsWith(event), initiative
    };
  }

  private restoreSnapshot(snapshot: SessionSnapshot): void {
    this.state.activeSceneId = snapshot.activeSceneId;
    this.state.eventSequence = snapshot.sequence;
    if (snapshot.latestRoll) {
      this.state.latestRollSides = snapshot.latestRoll.sides;
      this.state.latestRollNatural = snapshot.latestRoll.natural;
      this.state.latestRollModifier = snapshot.latestRoll.modifier;
      this.state.latestRollTotal = snapshot.latestRoll.total;
    }
    for (const event of snapshot.recentEvents.slice(-RECENT_EVENT_LIMIT)) {
      const state = new EventState();
      state.sequence = event.sequence;
      state.kind = event.kind;
      state.actor = event.actor;
      state.summary = event.summary;
      state.at = event.at;
      this.state.events.push(state);
    }
    this.replaceInitiative(snapshot.initiative ?? { round: 0, activeIndex: -1, entries: [] });
  }
}
