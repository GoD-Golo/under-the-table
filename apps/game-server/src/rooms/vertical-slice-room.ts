import { randomInt, randomUUID } from "node:crypto";
import { Room, type Client } from "@colyseus/core";
import {
  normalizeTokenCoordinate, normalizeTokenKind, normalizeTokenLabel,
  type GameEvent, type RecentEvent, type SceneToken, type SessionSnapshot
} from "@utt/domain";
import {
  EventState,
  LiveRoomState,
  TokenState,
  MESSAGE,
  SERVER_MESSAGE,
  SESSION_ID,
  type AdjustHpCommand,
  type CreateTokenCommand,
  type JoinOptions,
  type MoveTokenCommand,
  type PresentSceneCommand,
  type RollCommand,
  type SetFogCellCommand,
  type SetFogEnabledCommand
} from "@utt/protocol";
import { surrealStore } from "../persistence/surreal-store.js";
import { createHpEvent, createRollEvent, createScenePresentedEvent, createTokenCreatedEvent, createTokenMovedEvent } from "../session-logic.js";

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

export class VerticalSliceRoom extends Room {
  state = new LiveRoomState();
  private readonly names = new Map<string, string>();
  private commandQueue: Promise<void> = Promise.resolve();

  async onCreate(): Promise<void> {
    this.maxClients = 12;
    this.state.sessionId = SESSION_ID;
    this.state.characterName = "Mira Voss";
    this.state.maxHp = 32;
    this.state.hp = 32;
    const starterScene = await surrealStore.ensureStarterScene();
    this.state.activeSceneId = starterScene.id;

    const snapshot = await surrealStore.loadSnapshot(SESSION_ID);
    if (snapshot) this.restoreSnapshot(snapshot);
    this.replaceTokens(await surrealStore.listSceneTokens(this.state.activeSceneId));
    this.replaceFog(await surrealStore.getSceneFog(this.state.activeSceneId));
    console.info(`[room] created ${this.roomId}; restored sequence=${snapshot?.sequence ?? 0}, hp=${this.state.hp}`);

    this.onMessage(MESSAGE.roll, (client, message: RollCommand) => {
      this.enqueue(client, () => this.handleRoll(client, message));
    });
    this.onMessage(MESSAGE.adjustHp, (client, message: AdjustHpCommand) => {
      this.enqueue(client, () => this.handleHp(client, message));
    });
    this.onMessage(MESSAGE.presentScene, (client, message: PresentSceneCommand) => {
      this.enqueue(client, () => this.handlePresentScene(client, message));
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

  private replaceTokens(tokens: SceneToken[]): void {
    this.state.tokens.clear();
    for (const token of tokens) this.state.tokens.set(token.id, tokenToState(token));
  }

  private replaceFog(fog: { enabled: boolean; revealedCells: string[] }): void {
    this.state.fogEnabled = fog.enabled;
    this.state.fogRevealedCells.clear();
    for (const cell of fog.revealedCells) this.state.fogRevealedCells.push(cell);
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
    const snapshot = this.nextSnapshot(event, this.currentRoll(), this.state.hp);
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
    const snapshot = this.nextSnapshot(event, this.currentRoll(), this.state.hp);
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
    }, this.state.hp);
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
    const snapshot = this.nextSnapshot(event, this.currentRoll(), this.state.hp, scene.id);
    await surrealStore.persist(event, snapshot);
    this.state.activeSceneId = scene.id;
    this.replaceTokens(sceneTokens);
    this.replaceFog(sceneFog);
    this.applyAcceptedEvent(event);
  }

  private async handleHp(client: Client, command: AdjustHpCommand): Promise<void> {
    const sequence = this.state.eventSequence + 1;
    const { event, nextHp } = createHpEvent({
      sessionId: SESSION_ID,
      sequence,
      actor: this.actorFor(client),
      at: new Date().toISOString(),
      currentHp: this.state.hp,
      maxHp: this.state.maxHp,
      delta: command?.delta
    });

    const snapshot = this.nextSnapshot(event, this.currentRoll(), nextHp);
    await surrealStore.persist(event, snapshot);

    this.state.hp = nextHp;
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
    hp: number,
    activeSceneId = this.state.activeSceneId
  ): SessionSnapshot {
    return {
      sessionId: SESSION_ID,
      sequence: event.sequence,
      characterName: this.state.characterName,
      activeSceneId,
      hp,
      maxHp: this.state.maxHp,
      latestRoll,
      recentEvents: this.recentEventsWith(event)
    };
  }

  private restoreSnapshot(snapshot: SessionSnapshot): void {
    this.state.characterName = snapshot.characterName;
    this.state.activeSceneId = snapshot.activeSceneId;
    this.state.hp = snapshot.hp;
    this.state.maxHp = snapshot.maxHp;
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
  }
}
