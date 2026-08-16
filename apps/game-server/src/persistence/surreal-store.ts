import { randomUUID } from "node:crypto";
import { RecordId, Surreal, Table } from "surrealdb";
import {
  STARTER_SCENE_ID,
  normalizeGrid,
  normalizeHotspotCoordinate,
  normalizeLoreSummary,
  normalizeSceneKind,
  normalizeSceneName,
  normalizeTokenCoordinate,
  normalizeTokenKind,
  normalizeTokenLabel,
  type GameEvent,
  type RecentEvent,
  type Scene,
  type SceneHotspot,
  type SceneToken,
  type SessionSnapshot,
  type WorldEntity
} from "@utt/domain";

interface SnapshotRecord {
  session_id: string;
  sequence: number;
  state: Record<string, unknown>;
  updated_at: string;
}

interface SceneRecord {
  [key: string]: unknown;
  scene_id: string;
  name: string;
  kind: Scene["kind"];
  entity_id?: string | undefined;
  background_asset_key?: string | undefined;
  background_width: number;
  background_height: number;
  grid_kind: Scene["grid"]["kind"];
  grid_size: number;
  grid_visible: boolean;
  created_at: string;
  updated_at: string;
}

interface EntityRecord {
  [key: string]: unknown;
  entity_id: string;
  kind: WorldEntity["kind"];
  name: string;
  summary: string;
  created_at: string;
  updated_at: string;
}

interface HotspotRecord {
  [key: string]: unknown;
  hotspot_id: string;
  scene_id: string;
  label: string;
  x: number;
  y: number;
  linked_scene_id?: string | undefined;
  linked_entity_id?: string | undefined;
  created_at: string;
  updated_at: string;
}

interface TokenRecord {
  [key: string]: unknown;
  token_id: string;
  scene_id: string;
  kind: SceneToken["kind"];
  label: string;
  x: number;
  y: number;
  controller_name?: string | undefined;
  created_at: string;
  updated_at: string;
}

type SurrealTransaction = Awaited<ReturnType<Surreal["beginTransaction"]>>;

const schema = `
BEGIN TRANSACTION;
DEFINE TABLE IF NOT EXISTS session_event SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS session_id ON TABLE session_event TYPE string;
DEFINE FIELD IF NOT EXISTS sequence ON TABLE session_event TYPE int ASSERT $value > 0;
DEFINE FIELD IF NOT EXISTS kind ON TABLE session_event TYPE string;
DEFINE FIELD IF NOT EXISTS actor ON TABLE session_event TYPE string;
DEFINE FIELD IF NOT EXISTS summary ON TABLE session_event TYPE string;
DEFINE FIELD IF NOT EXISTS payload ON TABLE session_event TYPE object FLEXIBLE;
DEFINE FIELD IF NOT EXISTS at ON TABLE session_event TYPE string;
DEFINE INDEX IF NOT EXISTS session_event_sequence ON TABLE session_event FIELDS session_id, sequence UNIQUE;

DEFINE TABLE IF NOT EXISTS session_snapshot SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS session_id ON TABLE session_snapshot TYPE string;
DEFINE FIELD IF NOT EXISTS sequence ON TABLE session_snapshot TYPE int ASSERT $value >= 0;
DEFINE FIELD IF NOT EXISTS state ON TABLE session_snapshot TYPE object FLEXIBLE;
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE session_snapshot TYPE string;
DEFINE INDEX IF NOT EXISTS session_snapshot_session ON TABLE session_snapshot FIELDS session_id UNIQUE;

DEFINE TABLE IF NOT EXISTS world_entity SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS entity_id ON TABLE world_entity TYPE string;
DEFINE FIELD IF NOT EXISTS kind ON TABLE world_entity TYPE string;
DEFINE FIELD IF NOT EXISTS name ON TABLE world_entity TYPE string;
DEFINE FIELD IF NOT EXISTS summary ON TABLE world_entity TYPE string;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE world_entity TYPE string;
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE world_entity TYPE string;

DEFINE TABLE IF NOT EXISTS scene SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS scene_id ON TABLE scene TYPE string;
DEFINE FIELD IF NOT EXISTS name ON TABLE scene TYPE string;
DEFINE FIELD IF NOT EXISTS kind ON TABLE scene TYPE string;
DEFINE FIELD IF NOT EXISTS entity_id ON TABLE scene TYPE option<string>;
DEFINE FIELD IF NOT EXISTS background_asset_key ON TABLE scene TYPE option<string>;
DEFINE FIELD IF NOT EXISTS background_width ON TABLE scene TYPE int ASSERT $value >= 320 AND $value <= 10000;
DEFINE FIELD IF NOT EXISTS background_height ON TABLE scene TYPE int ASSERT $value >= 180 AND $value <= 10000;
DEFINE FIELD IF NOT EXISTS grid_kind ON TABLE scene TYPE string;
DEFINE FIELD IF NOT EXISTS grid_size ON TABLE scene TYPE int ASSERT $value >= 16 AND $value <= 240;
DEFINE FIELD IF NOT EXISTS grid_visible ON TABLE scene TYPE bool;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE scene TYPE string;
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE scene TYPE string;

DEFINE TABLE IF NOT EXISTS scene_hotspot SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS hotspot_id ON TABLE scene_hotspot TYPE string;
DEFINE FIELD IF NOT EXISTS scene_id ON TABLE scene_hotspot TYPE string;
DEFINE FIELD IF NOT EXISTS label ON TABLE scene_hotspot TYPE string;
DEFINE FIELD IF NOT EXISTS x ON TABLE scene_hotspot TYPE float ASSERT $value >= 0 AND $value <= 1;
DEFINE FIELD IF NOT EXISTS y ON TABLE scene_hotspot TYPE float ASSERT $value >= 0 AND $value <= 1;
DEFINE FIELD IF NOT EXISTS linked_scene_id ON TABLE scene_hotspot TYPE option<string>;
DEFINE FIELD IF NOT EXISTS linked_entity_id ON TABLE scene_hotspot TYPE option<string>;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE scene_hotspot TYPE string;
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE scene_hotspot TYPE string;
DEFINE INDEX IF NOT EXISTS scene_hotspot_scene ON TABLE scene_hotspot FIELDS scene_id;

DEFINE TABLE IF NOT EXISTS scene_token SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS token_id ON TABLE scene_token TYPE string;
DEFINE FIELD IF NOT EXISTS scene_id ON TABLE scene_token TYPE string;
DEFINE FIELD IF NOT EXISTS kind ON TABLE scene_token TYPE string;
DEFINE FIELD IF NOT EXISTS label ON TABLE scene_token TYPE string;
DEFINE FIELD IF NOT EXISTS x ON TABLE scene_token TYPE float ASSERT $value >= 0 AND $value <= 1;
DEFINE FIELD IF NOT EXISTS y ON TABLE scene_token TYPE float ASSERT $value >= 0 AND $value <= 1;
DEFINE FIELD IF NOT EXISTS controller_name ON TABLE scene_token TYPE option<string>;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE scene_token TYPE string;
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE scene_token TYPE string;
DEFINE INDEX IF NOT EXISTS scene_token_scene ON TABLE scene_token FIELDS scene_id;
COMMIT TRANSACTION;
`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function requireIdentifier(value: string, label: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error(`${label} must be a simple SurrealDB identifier`);
  return value;
}

function asRecentEvents(value: unknown): RecentEvent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const event = item as Record<string, unknown>;
    if (
      typeof event.sequence !== "number" ||
      (event.kind !== "roll" && event.kind !== "hp" && event.kind !== "scene_presented" && event.kind !== "token_created" && event.kind !== "token_moved") ||
      typeof event.actor !== "string" ||
      typeof event.summary !== "string" ||
      typeof event.at !== "string"
    ) return [];
    return [{
      sequence: event.sequence,
      kind: event.kind,
      actor: event.actor,
      summary: event.summary,
      at: event.at
    }];
  });
}

function mapScene(record: SceneRecord): Scene {
  return {
    id: record.scene_id,
    name: record.name,
    kind: record.kind,
    entityId: record.entity_id ?? null,
    backgroundAssetKey: record.background_asset_key ?? null,
    backgroundWidth: record.background_width,
    backgroundHeight: record.background_height,
    grid: { kind: record.grid_kind, size: record.grid_size, visible: record.grid_visible },
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function mapEntity(record: EntityRecord): WorldEntity {
  return {
    id: record.entity_id,
    kind: record.kind,
    name: record.name,
    summary: record.summary,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function mapHotspot(record: HotspotRecord): SceneHotspot {
  return {
    id: record.hotspot_id,
    sceneId: record.scene_id,
    label: record.label,
    x: record.x,
    y: record.y,
    linkedSceneId: record.linked_scene_id ?? null,
    linkedEntityId: record.linked_entity_id ?? null,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function mapToken(record: TokenRecord): SceneToken {
  return {
    id: record.token_id,
    sceneId: record.scene_id,
    kind: record.kind,
    label: record.label,
    x: record.x,
    y: record.y,
    controllerName: record.controller_name ?? null,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function defaultGridFor(kind: Scene["kind"]): Scene["grid"] {
  return kind === "combat_test"
    ? { kind: "square", size: 64, visible: true }
    : { kind: "none", size: 64, visible: false };
}

export interface CreateSceneInput {
  name: unknown;
  kind: unknown;
  gridKind?: unknown;
  gridSize?: unknown;
  gridVisible?: unknown;
  loreSummary?: unknown;
}

export interface CreateHotspotInput {
  sceneId: string;
  label: unknown;
  x: unknown;
  y: unknown;
  linkedSceneId?: unknown;
  linkedEntityId?: unknown;
  loreSummary?: unknown;
  createLinkedScene?: { name?: unknown; kind?: unknown } | null;
}

export class SurrealStore {
  private readonly db = new Surreal();
  private connection: Promise<void> | undefined;

  async connect(): Promise<void> {
    if (!this.connection) {
      this.connection = this.connectAndInitialize().catch((error) => {
        this.connection = undefined;
        throw error;
      });
    }
    return this.connection;
  }

  private async connectAndInitialize(): Promise<void> {
    const url = await this.connectWithRetry();
    const namespace = requireIdentifier(process.env.SURREAL_NAMESPACE ?? "utt", "SURREAL_NAMESPACE");
    const database = requireIdentifier(process.env.SURREAL_DATABASE ?? "development", "SURREAL_DATABASE");
    try {
      await this.db.query(`DEFINE NAMESPACE IF NOT EXISTS ${namespace};`);
      await this.db.use({ namespace });
      await this.db.query(`DEFINE DATABASE IF NOT EXISTS ${database} STRICT;`);
      await this.db.use({ namespace, database });
      await this.db.query(schema);
      await this.ensureStarterSceneInternal();
    } catch (error) {
      throw new Error("SurrealDB scope/schema initialization failed", { cause: error });
    }
    console.info(`[persistence] connected and schema-ready at ${url} (${namespace}/${database})`);
  }

  private async connectWithRetry(): Promise<string> {
    const url = process.env.SURREAL_URL ?? "ws://surrealdb:8000";
    const username = process.env.SURREAL_USER;
    const password = process.env.SURREAL_PASS;
    if (!username || !password) throw new Error("SURREAL_USER and SURREAL_PASS are required");
    let lastError: unknown;
    for (let attempt = 1; attempt <= 20; attempt += 1) {
      try {
        await this.db.connect(url, { authentication: { username, password } });
        return url;
      } catch (error) {
        lastError = error;
        console.warn(`[persistence] connection attempt ${attempt}/20 failed`);
        await sleep(Math.min(250 * attempt, 1500));
      }
    }
    throw lastError instanceof Error ? lastError : new Error("unable to connect to SurrealDB");
  }

  private async ensureStarterSceneInternal(): Promise<Scene> {
    const existing = await this.db.select<SceneRecord>(new RecordId("scene", STARTER_SCENE_ID));
    if (existing) return mapScene(existing);
    const now = new Date().toISOString();
    const record: SceneRecord = {
      scene_id: STARTER_SCENE_ID,
      name: "The First Table",
      kind: "blank",
      background_width: 1600,
      background_height: 900,
      grid_kind: "none",
      grid_size: 64,
      grid_visible: false,
      created_at: now,
      updated_at: now
    };
    return mapScene(await this.db.create<SceneRecord>(new RecordId("scene", STARTER_SCENE_ID)).content(record));
  }

  async ensureStarterScene(): Promise<Scene> {
    await this.connect();
    return this.ensureStarterSceneInternal();
  }

  async loadAtlas(): Promise<{ scenes: Scene[]; hotspots: SceneHotspot[]; entities: WorldEntity[]; tokens: SceneToken[] }> {
    await this.connect();
    const [scenes, hotspots, entities, tokens] = await Promise.all([
      this.db.select<SceneRecord>(new Table("scene")),
      this.db.select<HotspotRecord>(new Table("scene_hotspot")),
      this.db.select<EntityRecord>(new Table("world_entity")),
      this.db.select<TokenRecord>(new Table("scene_token"))
    ]);
    return {
      scenes: scenes.map(mapScene).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      hotspots: hotspots.map(mapHotspot).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      entities: entities.map(mapEntity).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      tokens: tokens.map(mapToken).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    };
  }

  async getScene(sceneId: string): Promise<Scene | null> {
    await this.connect();
    const record = await this.db.select<SceneRecord>(new RecordId("scene", sceneId));
    return record ? mapScene(record) : null;
  }

  async getToken(tokenId: string): Promise<SceneToken | null> {
    await this.connect();
    const record = await this.db.select<TokenRecord>(new RecordId("scene_token", tokenId));
    return record ? mapToken(record) : null;
  }

  async listSceneTokens(sceneId: string): Promise<SceneToken[]> {
    await this.connect();
    const [records] = await this.db.query<[TokenRecord[]]>(
      "SELECT * FROM scene_token WHERE scene_id = $sceneId ORDER BY created_at ASC",
      { sceneId }
    );
    return (records ?? []).map(mapToken);
  }

  async createScene(input: CreateSceneInput): Promise<Scene> {
    await this.connect();
    const name = normalizeSceneName(input.name);
    const kind = normalizeSceneKind(input.kind);
    const defaultGrid = defaultGridFor(kind);
    const grid = normalizeGrid(
      input.gridKind ?? defaultGrid.kind,
      input.gridSize ?? defaultGrid.size,
      input.gridVisible ?? defaultGrid.visible
    );
    const loreSummary = normalizeLoreSummary(input.loreSummary);
    const sceneId = randomUUID();
    const entityId = loreSummary ? randomUUID() : null;
    const now = new Date().toISOString();
    const txn = await this.db.beginTransaction();
    try {
      if (entityId) {
        await txn.create(new RecordId("world_entity", entityId)).content({
          entity_id: entityId, kind: "place", name, summary: loreSummary, created_at: now, updated_at: now
        });
      }
      const record = await txn.create<SceneRecord>(new RecordId("scene", sceneId)).content({
        scene_id: sceneId,
        name,
        kind,
        entity_id: entityId ?? undefined,
        background_width: 1600,
        background_height: 900,
        grid_kind: grid.kind,
        grid_size: grid.size,
        grid_visible: grid.visible,
        created_at: now,
        updated_at: now
      });
      await txn.commit();
      return mapScene(record);
    } catch (error) {
      await txn.cancel();
      throw error;
    }
  }

  async setSceneBackground(sceneId: string, assetKey: string, width: number, height: number): Promise<Scene> {
    await this.connect();
    if (!assetKey || assetKey.includes("..")) throw new Error("invalid asset key");
    const safeWidth = Math.round(Number(width));
    const safeHeight = Math.round(Number(height));
    if (!Number.isFinite(safeWidth) || safeWidth < 320 || safeWidth > 10000) throw new Error("invalid image width");
    if (!Number.isFinite(safeHeight) || safeHeight < 180 || safeHeight > 10000) throw new Error("invalid image height");
    const existing = await this.getScene(sceneId);
    if (!existing) throw new Error("scene not found");
    const updated = await this.db.update<SceneRecord>(new RecordId("scene", sceneId)).merge({
      background_asset_key: assetKey,
      background_width: safeWidth,
      background_height: safeHeight,
      kind: existing.kind === "blank" ? "image" : existing.kind,
      updated_at: new Date().toISOString()
    });
    return mapScene(updated);
  }

  async createHotspot(input: CreateHotspotInput): Promise<{ hotspot: SceneHotspot; linkedScene: Scene | null; entity: WorldEntity | null }> {
    await this.connect();
    const source = await this.getScene(input.sceneId);
    if (!source) throw new Error("source scene not found");
    const label = normalizeSceneName(input.label);
    const x = normalizeHotspotCoordinate(input.x);
    const y = normalizeHotspotCoordinate(input.y);
    const loreSummary = normalizeLoreSummary(input.loreSummary);
    const directLinkedSceneId = typeof input.linkedSceneId === "string" && input.linkedSceneId ? input.linkedSceneId : null;
    const directLinkedEntityId = typeof input.linkedEntityId === "string" && input.linkedEntityId ? input.linkedEntityId : null;
    if (directLinkedSceneId && input.createLinkedScene) throw new Error("choose an existing linked scene or create a new one, not both");
    if (directLinkedSceneId && !await this.getScene(directLinkedSceneId)) throw new Error("linked scene not found");

    const hotspotId = randomUUID();
    const linkedSceneId = input.createLinkedScene ? randomUUID() : directLinkedSceneId;
    const entityId = loreSummary ? randomUUID() : directLinkedEntityId;
    const now = new Date().toISOString();
    const txn = await this.db.beginTransaction();
    try {
      let entity: WorldEntity | null = null;
      if (loreSummary && entityId) {
        const entityRecord = await txn.create<EntityRecord>(new RecordId("world_entity", entityId)).content({
          entity_id: entityId, kind: "place", name: label, summary: loreSummary, created_at: now, updated_at: now
        });
        entity = mapEntity(entityRecord);
      }

      let linkedScene: Scene | null = null;
      if (input.createLinkedScene && linkedSceneId) {
        const childKind = normalizeSceneKind(input.createLinkedScene.kind ?? "blank");
        const childName = normalizeSceneName(input.createLinkedScene.name ?? label);
        const childGrid = defaultGridFor(childKind);
        const childRecord = await txn.create<SceneRecord>(new RecordId("scene", linkedSceneId)).content({
          scene_id: linkedSceneId,
          name: childName,
          kind: childKind,
          entity_id: entityId ?? undefined,
          background_width: 1600,
          background_height: 900,
          grid_kind: childGrid.kind,
          grid_size: childGrid.size,
          grid_visible: childGrid.visible,
          created_at: now,
          updated_at: now
        });
        linkedScene = mapScene(childRecord);
      }

      const hotspotRecord = await txn.create<HotspotRecord>(new RecordId("scene_hotspot", hotspotId)).content({
        hotspot_id: hotspotId,
        scene_id: source.id,
        label,
        x,
        y,
        linked_scene_id: linkedSceneId ?? undefined,
        linked_entity_id: entityId ?? undefined,
        created_at: now,
        updated_at: now
      });
      await txn.commit();
      return { hotspot: mapHotspot(hotspotRecord), linkedScene, entity };
    } catch (error) {
      await txn.cancel();
      throw error;
    }
  }

  async loadSnapshot(sessionId: string): Promise<SessionSnapshot | null> {
    await this.connect();
    const record = await this.db.select<SnapshotRecord>(new RecordId("session_snapshot", sessionId));
    if (!record) return null;
    const state = record.state;
    const latest = state.latestRoll;
    const latestRoll = typeof latest === "object" && latest !== null ? latest as SessionSnapshot["latestRoll"] : null;
    if (typeof state.characterName !== "string" || typeof state.hp !== "number" || typeof state.maxHp !== "number") {
      throw new Error(`snapshot ${sessionId} has an invalid state shape`);
    }
    return {
      sessionId: record.session_id,
      sequence: record.sequence,
      characterName: state.characterName,
      activeSceneId: typeof state.activeSceneId === "string" ? state.activeSceneId : STARTER_SCENE_ID,
      hp: state.hp,
      maxHp: state.maxHp,
      latestRoll,
      recentEvents: asRecentEvents(state.recentEvents)
    };
  }

  private async persistSessionInTransaction(
    txn: SurrealTransaction, event: GameEvent, snapshot: SessionSnapshot
  ): Promise<void> {
    await txn.create(new Table("session_event")).content({
      session_id: event.sessionId,
      sequence: event.sequence,
      kind: event.kind,
      actor: event.actor,
      summary: event.summary,
      payload: event.payload,
      at: event.at
    });
    await txn.upsert(new RecordId("session_snapshot", snapshot.sessionId)).content({
      session_id: snapshot.sessionId,
      sequence: snapshot.sequence,
      state: {
        characterName: snapshot.characterName,
        activeSceneId: snapshot.activeSceneId,
        hp: snapshot.hp,
        maxHp: snapshot.maxHp,
        latestRoll: snapshot.latestRoll,
        recentEvents: snapshot.recentEvents
      },
      updated_at: new Date().toISOString()
    });
  }

  async createTokenWithEvent(input: {
    tokenId: string; sceneId: string; kind: unknown; label: unknown; x: unknown; y: unknown; controllerName: string | null;
  }, event: GameEvent, snapshot: SessionSnapshot): Promise<SceneToken> {
    await this.connect();
    if (!await this.getScene(input.sceneId)) throw new Error("scene not found");
    const kind = normalizeTokenKind(input.kind);
    const label = normalizeTokenLabel(input.label);
    const x = normalizeTokenCoordinate(input.x);
    const y = normalizeTokenCoordinate(input.y);
    const now = new Date().toISOString();
    const txn = await this.db.beginTransaction();
    try {
      const record = await txn.create<TokenRecord>(new RecordId("scene_token", input.tokenId)).content({
        token_id: input.tokenId, scene_id: input.sceneId, kind, label, x, y,
        controller_name: input.controllerName ?? undefined, created_at: now, updated_at: now
      });
      await this.persistSessionInTransaction(txn, event, snapshot);
      await txn.commit();
      return mapToken(record);
    } catch (error) {
      await txn.cancel();
      throw error;
    }
  }

  async moveTokenWithEvent(
    tokenId: string, xInput: unknown, yInput: unknown, event: GameEvent, snapshot: SessionSnapshot
  ): Promise<SceneToken> {
    await this.connect();
    const existing = await this.getToken(tokenId);
    if (!existing) throw new Error("token not found");
    const x = normalizeTokenCoordinate(xInput);
    const y = normalizeTokenCoordinate(yInput);
    const txn = await this.db.beginTransaction();
    try {
      const record = await txn.update<TokenRecord>(new RecordId("scene_token", tokenId)).merge({
        x, y, updated_at: new Date().toISOString()
      });
      await this.persistSessionInTransaction(txn, event, snapshot);
      await txn.commit();
      return mapToken(record);
    } catch (error) {
      await txn.cancel();
      throw error;
    }
  }

  async persist(event: GameEvent, snapshot: SessionSnapshot): Promise<void> {
    await this.connect();
    const txn = await this.db.beginTransaction();
    try {
      await this.persistSessionInTransaction(txn, event, snapshot);
      await txn.commit();
    } catch (error) {
      await txn.cancel();
      throw error;
    }
  }
}

export const surrealStore = new SurrealStore();
