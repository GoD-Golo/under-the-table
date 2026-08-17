import { randomUUID } from "node:crypto";
import { RecordId, Surreal, Table } from "surrealdb";
import {
  DEFAULT_RULESET_ID,
  PREVIEW_MEMBER_KEY,
  STARTER_CAMPAIGN_ID,
  STARTER_TABLE_ID,
  STARTER_CHARACTER_ID,
  STARTER_CHARACTER_IDENTITY_ID,
  STARTER_SCENE_ID,
  normalizeCharacterName,
  campaignRolePreset,
  tableRolePreset,
  normalizeCampaignCapabilities,
  normalizeTableCapabilities,
  normalizeCapabilityScopes,
  normalizeMemberDisplayName,
  normalizeCampaignRoleLabels,
  normalizeTableRoleLabels,
  normalizeChangeMessage,
  normalizePrivateCharacterState,
  normalizeFogCell,
  normalizeGrid,
  normalizeHotspotCoordinate,
  normalizeLoreSummary,
  normalizeResourceBounds,
  normalizeResourceKey,
  normalizeRulesetData,
  normalizeRulesetId,
  normalizeSceneKind,
  normalizeSceneName,
  normalizeTokenCoordinate,
  normalizeTokenKind,
  normalizeTokenLabel,
  type Campaign,
  type CampaignCharacterMembership,
  type CampaignMembership,
  type CampaignTable,
  type TableCharacterMembership,
  type TableMembership,
  type CharacterDefinition,
  type CharacterIdentity,
  type CharacterChangeRequest,
  type CampaignCharacterPrivateState,
  type CharacterResource,
  type CharacterRuntime,
  type GameEvent,
  type InitiativeState,
  type RecentEvent,
  type Scene,
  type SceneFog,
  type SceneHotspot,
  type SceneToken,
  type SessionSnapshot,
  type WorldEntity
} from "@utt/domain";


interface CharacterRecord {
  [key: string]: unknown;
  character_id: string;
  name: string;
  ruleset_id: string;
  schema_version: number;
  ruleset_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface CharacterResourceRecord {
  [key: string]: unknown;
  resource_id: string;
  character_id: string;
  resource_key: string;
  label: string;
  current: number;
  max: number;
  updated_at: string;
}

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


interface FogRecord {
  [key: string]: unknown;
  scene_id: string;
  enabled: boolean;
  revealed_cells: string[];
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

interface CampaignRecord {
  [key: string]: unknown;
  campaign_id: string;
  name: string;
  summary: string;
  created_at: string;
  updated_at: string;
}

interface CampaignTableRecord {
  [key: string]: unknown;
  table_id: string;
  campaign_id: string;
  name: string;
  summary: string;
  current_session_id?: string | undefined;
  created_at: string;
  updated_at: string;
}

interface CampaignMembershipRecord {
  [key: string]: unknown;
  membership_id: string;
  campaign_id: string;
  member_key: string;
  display_name: string;
  role_labels: CampaignMembership["roleLabels"];
  capabilities: string[];
  scopes_json: string;
}

interface TableMembershipRecord {
  [key: string]: unknown;
  membership_id: string;
  table_id: string;
  member_key: string;
  display_name: string;
  role_labels: TableMembership["roleLabels"];
  capabilities: string[];
}

interface CharacterIdentityRecord {
  [key: string]: unknown;
  identity_id: string;
  owner_key: string;
  display_name: string;
  ruleset_id: string;
  created_at: string;
  updated_at: string;
}

interface CampaignCharacterMembershipRecord {
  [key: string]: unknown;
  membership_id: string;
  campaign_id: string;
  character_id: string;
  identity_id?: string | undefined;
  source_kind?: CampaignCharacterMembership["sourceKind"] | undefined;
  source_character_id?: string | undefined;
  created_at?: string | undefined;
}

interface CharacterChangeRequestRecord {
  [key: string]: unknown;
  request_id: string; campaign_id: string; character_id: string; requested_by: string;
  status: CharacterChangeRequest["status"]; proposed_name: string; proposed_max_hp: number;
  proposed_ruleset_data: Record<string, unknown>; message: string; base_updated_at: string; created_at: string;
  resolved_at?: string | undefined; resolved_by?: string | undefined;
}

interface CampaignCharacterPrivateStateRecord {
  [key: string]: unknown;
  state_id: string; campaign_id: string; character_id: string; data: Record<string, unknown>; updated_at: string;
}

interface TableCharacterMembershipRecord {
  [key: string]: unknown;
  membership_id: string;
  table_id: string;
  character_id: string;
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


DEFINE TABLE IF NOT EXISTS campaign SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS campaign_id ON TABLE campaign TYPE string;
DEFINE FIELD IF NOT EXISTS name ON TABLE campaign TYPE string;
DEFINE FIELD IF NOT EXISTS summary ON TABLE campaign TYPE string;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE campaign TYPE string;
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE campaign TYPE string;

DEFINE TABLE IF NOT EXISTS campaign_table SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS table_id ON TABLE campaign_table TYPE string;
DEFINE FIELD IF NOT EXISTS campaign_id ON TABLE campaign_table TYPE string;
DEFINE FIELD IF NOT EXISTS name ON TABLE campaign_table TYPE string;
DEFINE FIELD IF NOT EXISTS summary ON TABLE campaign_table TYPE string;
DEFINE FIELD IF NOT EXISTS current_session_id ON TABLE campaign_table TYPE option<string>;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE campaign_table TYPE string;
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE campaign_table TYPE string;
DEFINE INDEX IF NOT EXISTS campaign_table_campaign ON TABLE campaign_table FIELDS campaign_id;

DEFINE TABLE IF NOT EXISTS campaign_membership SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS membership_id ON TABLE campaign_membership TYPE string;
DEFINE FIELD IF NOT EXISTS campaign_id ON TABLE campaign_membership TYPE string;
DEFINE FIELD IF NOT EXISTS member_key ON TABLE campaign_membership TYPE string;
DEFINE FIELD IF NOT EXISTS display_name ON TABLE campaign_membership TYPE string;
DEFINE FIELD IF NOT EXISTS role_labels ON TABLE campaign_membership TYPE array<string>;
DEFINE FIELD IF NOT EXISTS capabilities ON TABLE campaign_membership TYPE array<string>;
DEFINE FIELD IF NOT EXISTS scopes_json ON TABLE campaign_membership TYPE string;
DEFINE INDEX IF NOT EXISTS campaign_membership_member ON TABLE campaign_membership FIELDS campaign_id, member_key UNIQUE;

DEFINE TABLE IF NOT EXISTS table_membership SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS membership_id ON TABLE table_membership TYPE string;
DEFINE FIELD IF NOT EXISTS table_id ON TABLE table_membership TYPE string;
DEFINE FIELD IF NOT EXISTS member_key ON TABLE table_membership TYPE string;
DEFINE FIELD IF NOT EXISTS display_name ON TABLE table_membership TYPE string;
DEFINE FIELD IF NOT EXISTS role_labels ON TABLE table_membership TYPE array<string>;
DEFINE FIELD IF NOT EXISTS capabilities ON TABLE table_membership TYPE array<string>;
DEFINE INDEX IF NOT EXISTS table_membership_member ON TABLE table_membership FIELDS table_id, member_key UNIQUE;

DEFINE TABLE IF NOT EXISTS character_identity SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS identity_id ON TABLE character_identity TYPE string;
DEFINE FIELD IF NOT EXISTS owner_key ON TABLE character_identity TYPE string;
DEFINE FIELD IF NOT EXISTS display_name ON TABLE character_identity TYPE string;
DEFINE FIELD IF NOT EXISTS ruleset_id ON TABLE character_identity TYPE string;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE character_identity TYPE string;
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE character_identity TYPE string;

DEFINE TABLE IF NOT EXISTS campaign_character_membership SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS membership_id ON TABLE campaign_character_membership TYPE string;
DEFINE FIELD IF NOT EXISTS campaign_id ON TABLE campaign_character_membership TYPE string;
DEFINE FIELD IF NOT EXISTS character_id ON TABLE campaign_character_membership TYPE string;
DEFINE FIELD IF NOT EXISTS identity_id ON TABLE campaign_character_membership TYPE option<string>;
DEFINE FIELD IF NOT EXISTS source_kind ON TABLE campaign_character_membership TYPE option<string>;
DEFINE FIELD IF NOT EXISTS source_character_id ON TABLE campaign_character_membership TYPE option<string>;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE campaign_character_membership TYPE option<string>;
DEFINE INDEX IF NOT EXISTS campaign_character_unique ON TABLE campaign_character_membership FIELDS campaign_id, character_id UNIQUE;

DEFINE TABLE IF NOT EXISTS character_change_request SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS request_id ON TABLE character_change_request TYPE string;
DEFINE FIELD IF NOT EXISTS campaign_id ON TABLE character_change_request TYPE string;
DEFINE FIELD IF NOT EXISTS character_id ON TABLE character_change_request TYPE string;
DEFINE FIELD IF NOT EXISTS requested_by ON TABLE character_change_request TYPE string;
DEFINE FIELD IF NOT EXISTS status ON TABLE character_change_request TYPE string;
DEFINE FIELD IF NOT EXISTS proposed_name ON TABLE character_change_request TYPE string;
DEFINE FIELD IF NOT EXISTS proposed_max_hp ON TABLE character_change_request TYPE int ASSERT $value > 0;
DEFINE FIELD IF NOT EXISTS proposed_ruleset_data ON TABLE character_change_request TYPE object FLEXIBLE;
DEFINE FIELD IF NOT EXISTS message ON TABLE character_change_request TYPE string;
DEFINE FIELD IF NOT EXISTS base_updated_at ON TABLE character_change_request TYPE string;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE character_change_request TYPE string;
DEFINE FIELD IF NOT EXISTS resolved_at ON TABLE character_change_request TYPE option<string>;
DEFINE FIELD IF NOT EXISTS resolved_by ON TABLE character_change_request TYPE option<string>;
DEFINE INDEX IF NOT EXISTS character_change_request_character ON TABLE character_change_request FIELDS character_id, status;

DEFINE TABLE IF NOT EXISTS campaign_character_private_state SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS state_id ON TABLE campaign_character_private_state TYPE string;
DEFINE FIELD IF NOT EXISTS campaign_id ON TABLE campaign_character_private_state TYPE string;
DEFINE FIELD IF NOT EXISTS character_id ON TABLE campaign_character_private_state TYPE string;
DEFINE FIELD IF NOT EXISTS data ON TABLE campaign_character_private_state TYPE object FLEXIBLE;
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE campaign_character_private_state TYPE string;
DEFINE INDEX IF NOT EXISTS campaign_character_private_unique ON TABLE campaign_character_private_state FIELDS campaign_id, character_id UNIQUE;

DEFINE TABLE IF NOT EXISTS table_character_membership SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS membership_id ON TABLE table_character_membership TYPE string;
DEFINE FIELD IF NOT EXISTS table_id ON TABLE table_character_membership TYPE string;
DEFINE FIELD IF NOT EXISTS character_id ON TABLE table_character_membership TYPE string;
DEFINE INDEX IF NOT EXISTS table_character_unique ON TABLE table_character_membership FIELDS table_id, character_id UNIQUE;

DEFINE TABLE IF NOT EXISTS character SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS character_id ON TABLE character TYPE string;
DEFINE FIELD IF NOT EXISTS name ON TABLE character TYPE string;
DEFINE FIELD IF NOT EXISTS ruleset_id ON TABLE character TYPE string;
DEFINE FIELD IF NOT EXISTS schema_version ON TABLE character TYPE int ASSERT $value >= 1;
DEFINE FIELD IF NOT EXISTS ruleset_data ON TABLE character TYPE object FLEXIBLE;
DEFINE FIELD IF NOT EXISTS created_at ON TABLE character TYPE string;
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE character TYPE string;

DEFINE TABLE IF NOT EXISTS character_resource SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS resource_id ON TABLE character_resource TYPE string;
DEFINE FIELD IF NOT EXISTS character_id ON TABLE character_resource TYPE string;
DEFINE FIELD IF NOT EXISTS resource_key ON TABLE character_resource TYPE string;
DEFINE FIELD IF NOT EXISTS label ON TABLE character_resource TYPE string;
DEFINE FIELD IF NOT EXISTS current ON TABLE character_resource TYPE int ASSERT $value >= 0;
DEFINE FIELD IF NOT EXISTS max ON TABLE character_resource TYPE int ASSERT $value > 0;
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE character_resource TYPE string;
DEFINE INDEX IF NOT EXISTS character_resource_key ON TABLE character_resource FIELDS character_id, resource_key UNIQUE;

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

DEFINE TABLE IF NOT EXISTS scene_fog SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS scene_id ON TABLE scene_fog TYPE string;
DEFINE FIELD IF NOT EXISTS enabled ON TABLE scene_fog TYPE bool;
DEFINE FIELD IF NOT EXISTS revealed_cells ON TABLE scene_fog TYPE array<string>;
DEFINE FIELD IF NOT EXISTS updated_at ON TABLE scene_fog TYPE string;
DEFINE INDEX IF NOT EXISTS scene_fog_scene ON TABLE scene_fog FIELDS scene_id UNIQUE;
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


function mapCharacter(record: CharacterRecord): CharacterDefinition {
  return {
    id: record.character_id, name: record.name, rulesetId: record.ruleset_id, schemaVersion: record.schema_version,
    rulesetData: { ...record.ruleset_data }, createdAt: record.created_at, updatedAt: record.updated_at
  };
}

function mapCharacterResource(record: CharacterResourceRecord): CharacterResource {
  return {
    id: record.resource_id, characterId: record.character_id, key: record.resource_key, label: record.label,
    current: record.current, max: record.max, updatedAt: record.updated_at
  };
}

function mapCampaign(record: CampaignRecord): Campaign {
  return { id: record.campaign_id, name: record.name, summary: record.summary, createdAt: record.created_at, updatedAt: record.updated_at };
}

function mapCampaignTable(record: CampaignTableRecord): CampaignTable {
  return {
    id: record.table_id, campaignId: record.campaign_id, name: record.name, summary: record.summary,
    currentSessionId: record.current_session_id ?? null, createdAt: record.created_at, updatedAt: record.updated_at
  };
}

function parseMembershipScopes(value: string): CampaignMembership["scopes"] {
  try { return normalizeCapabilityScopes(JSON.parse(value) as unknown); }
  catch { return []; }
}

function mapCampaignMembership(record: CampaignMembershipRecord): CampaignMembership {
  return {
    id: record.membership_id, campaignId: record.campaign_id, memberKey: record.member_key, displayName: record.display_name,
    roleLabels: normalizeCampaignRoleLabels(record.role_labels), capabilities: normalizeCampaignCapabilities(record.capabilities),
    scopes: parseMembershipScopes(record.scopes_json)
  };
}

function mapTableMembership(record: TableMembershipRecord): TableMembership {
  return {
    id: record.membership_id, tableId: record.table_id, memberKey: record.member_key, displayName: record.display_name,
    roleLabels: normalizeTableRoleLabels(record.role_labels), capabilities: normalizeTableCapabilities(record.capabilities)
  };
}

function mapCharacterIdentity(record: CharacterIdentityRecord): CharacterIdentity {
  return {
    id: record.identity_id, ownerKey: record.owner_key, displayName: record.display_name, rulesetId: record.ruleset_id,
    createdAt: record.created_at, updatedAt: record.updated_at
  };
}

function mapCampaignCharacterMembership(record: CampaignCharacterMembershipRecord): CampaignCharacterMembership {
  if (!record.identity_id || !record.source_kind || !record.created_at) throw new Error("campaign character membership is not lifecycle-ready");
  return {
    campaignId: record.campaign_id, characterId: record.character_id, identityId: record.identity_id,
    sourceKind: record.source_kind, sourceCharacterId: record.source_character_id ?? null, createdAt: record.created_at
  };
}

function mapCharacterChangeRequest(record: CharacterChangeRequestRecord): CharacterChangeRequest {
  return {
    id: record.request_id, campaignId: record.campaign_id, characterId: record.character_id, requestedBy: record.requested_by,
    status: record.status, proposedName: record.proposed_name, proposedMaxHp: record.proposed_max_hp,
    proposedRulesetData: { ...record.proposed_ruleset_data }, message: record.message, baseUpdatedAt: record.base_updated_at, createdAt: record.created_at,
    resolvedAt: record.resolved_at ?? null, resolvedBy: record.resolved_by ?? null
  };
}

function mapCampaignCharacterPrivateState(record: CampaignCharacterPrivateStateRecord): CampaignCharacterPrivateState {
  return { campaignId: record.campaign_id, characterId: record.character_id, data: { ...record.data }, updatedAt: record.updated_at };
}

function mapTableCharacterMembership(record: TableCharacterMembershipRecord): TableCharacterMembership {
  return { tableId: record.table_id, characterId: record.character_id };
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

function mapFog(record: FogRecord): SceneFog {
  return { sceneId: record.scene_id, enabled: record.enabled, revealedCells: [...record.revealed_cells], updatedAt: record.updated_at };
}

function emptyFog(sceneId: string): SceneFog {
  return { sceneId, enabled: false, revealedCells: [], updatedAt: new Date(0).toISOString() };
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

export interface ProductFoundation {
  campaigns: Campaign[];
  tables: CampaignTable[];
  campaignMemberships: CampaignMembership[];
  tableMemberships: TableMembership[];
  identities: CharacterIdentity[];
  campaignCharacters: CampaignCharacterMembership[];
  tableCharacters: TableCharacterMembership[];
  characters: CharacterRuntime[];
  changeRequests: CharacterChangeRequest[];
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

  private async ensureStarterProductFoundationInternal(sessionId: string): Promise<void> {
    const now = new Date().toISOString();
    const existingCampaign = await this.db.select<CampaignRecord>(new RecordId("campaign", STARTER_CAMPAIGN_ID));
    if (!existingCampaign) {
      await this.db.create<CampaignRecord>(new RecordId("campaign", STARTER_CAMPAIGN_ID)).content({
        campaign_id: STARTER_CAMPAIGN_ID,
        name: "The First Table",
        summary: "The shared campaign world behind the current Under The Table preview.",
        created_at: now, updated_at: now
      });
    }

    const existingTable = await this.db.select<CampaignTableRecord>(new RecordId("campaign_table", STARTER_TABLE_ID));
    if (!existingTable) {
      await this.db.create<CampaignTableRecord>(new RecordId("campaign_table", STARTER_TABLE_ID)).content({
        table_id: STARTER_TABLE_ID, campaign_id: STARTER_CAMPAIGN_ID, name: "Main Table",
        summary: "The original live table, preserved as the first persistent Table context.",
        current_session_id: sessionId, created_at: now, updated_at: now
      });
    } else if (existingTable.current_session_id !== sessionId) {
      await this.db.update<CampaignTableRecord>(new RecordId("campaign_table", STARTER_TABLE_ID)).merge({ current_session_id: sessionId, updated_at: now });
    }

    const ownerPreset = campaignRolePreset("owner");
    await this.db.upsert<CampaignMembershipRecord>(new RecordId("campaign_membership", "preview-campaign-membership")).content({
      membership_id: "preview-campaign-membership", campaign_id: STARTER_CAMPAIGN_ID, member_key: PREVIEW_MEMBER_KEY,
      display_name: "Local Preview", role_labels: ["owner", "player"],
      capabilities: ownerPreset.capabilities, scopes_json: JSON.stringify(ownerPreset.scopes)
    });
    const dmTablePreset = tableRolePreset("dm");
    await this.db.upsert<TableMembershipRecord>(new RecordId("table_membership", "preview-table-membership")).content({
      membership_id: "preview-table-membership", table_id: STARTER_TABLE_ID, member_key: PREVIEW_MEMBER_KEY,
      display_name: "Local Preview", role_labels: ["dm", "player"], capabilities: dmTablePreset.capabilities
    });

    await this.ensureStarterCharacterFromLegacySnapshot(sessionId);
    const legacyCharacters = await this.listCharacterRuntimes();
    const existingMemberships = await this.db.select<CampaignCharacterMembershipRecord>(new Table("campaign_character_membership"));
    const enrolledCharacterIds = new Set(existingMemberships.map((membership) => membership.character_id));
    for (const character of legacyCharacters) {
      if (enrolledCharacterIds.has(character.definition.id)) continue;
      const identityId = character.definition.id === STARTER_CHARACTER_ID ? STARTER_CHARACTER_IDENTITY_ID : `${character.definition.id}-identity`;
      await this.db.upsert<CharacterIdentityRecord>(new RecordId("character_identity", identityId)).content({
        identity_id: identityId, owner_key: PREVIEW_MEMBER_KEY, display_name: character.definition.name,
        ruleset_id: character.definition.rulesetId, created_at: character.definition.createdAt, updated_at: now
      });
      const campaignMembershipId = `${STARTER_CAMPAIGN_ID}--${character.definition.id}`;
      await this.db.upsert<CampaignCharacterMembershipRecord>(new RecordId("campaign_character_membership", campaignMembershipId)).content({
        membership_id: campaignMembershipId, campaign_id: STARTER_CAMPAIGN_ID, character_id: character.definition.id, identity_id: identityId,
        source_kind: "legacy_migration", created_at: character.definition.createdAt
      });
      const tableMembershipId = `${STARTER_TABLE_ID}--${character.definition.id}`;
      await this.db.upsert<TableCharacterMembershipRecord>(new RecordId("table_character_membership", tableMembershipId)).content({
        membership_id: tableMembershipId, table_id: STARTER_TABLE_ID, character_id: character.definition.id
      });
    }

    const memberships = await this.db.select<CampaignCharacterMembershipRecord>(new Table("campaign_character_membership"));
    for (const membership of memberships) {
      if (membership.identity_id && membership.source_kind && membership.created_at) continue;
      const character = await this.getCharacterRuntime(membership.character_id);
      if (!character) continue;
      const identityId = character.definition.id === STARTER_CHARACTER_ID ? STARTER_CHARACTER_IDENTITY_ID : `${character.definition.id}-identity`;
      await this.db.upsert<CharacterIdentityRecord>(new RecordId("character_identity", identityId)).content({
        identity_id: identityId, owner_key: PREVIEW_MEMBER_KEY, display_name: character.definition.name,
        ruleset_id: character.definition.rulesetId, created_at: character.definition.createdAt, updated_at: now
      });
      await this.db.update<CampaignCharacterMembershipRecord>(new RecordId("campaign_character_membership", membership.membership_id)).merge({
        identity_id: identityId, source_kind: "legacy_migration", created_at: character.definition.createdAt
      });
    }
  }

  async loadProductFoundation(sessionId: string): Promise<ProductFoundation> {
    await this.connect();
    await this.ensureStarterProductFoundationInternal(sessionId);
    const [campaigns, tables, campaignMemberships, tableMemberships, identities, campaignCharacters, tableCharacters, characters, changeRequests] = await Promise.all([
      this.db.select<CampaignRecord>(new Table("campaign")), this.db.select<CampaignTableRecord>(new Table("campaign_table")),
      this.db.select<CampaignMembershipRecord>(new Table("campaign_membership")), this.db.select<TableMembershipRecord>(new Table("table_membership")),
      this.db.select<CharacterIdentityRecord>(new Table("character_identity")), this.db.select<CampaignCharacterMembershipRecord>(new Table("campaign_character_membership")),
      this.db.select<TableCharacterMembershipRecord>(new Table("table_character_membership")), this.listCharacterRuntimes(),
      this.db.select<CharacterChangeRequestRecord>(new Table("character_change_request"))
    ]);
    return {
      campaigns: campaigns.map(mapCampaign), tables: tables.map(mapCampaignTable),
      campaignMemberships: campaignMemberships.map(mapCampaignMembership), tableMemberships: tableMemberships.map(mapTableMembership),
      identities: identities.map(mapCharacterIdentity), campaignCharacters: campaignCharacters.map(mapCampaignCharacterMembership),
      tableCharacters: tableCharacters.map(mapTableCharacterMembership), characters,
      changeRequests: changeRequests.map(mapCharacterChangeRequest).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    };
  }

  async getCampaignTable(tableId: string): Promise<CampaignTable | null> {
    await this.connect();
    const record = await this.db.select<CampaignTableRecord>(new RecordId("campaign_table", tableId));
    return record ? mapCampaignTable(record) : null;
  }

  async getCampaignMembership(campaignId: string, memberKey: string): Promise<CampaignMembership | null> {
    await this.connect();
    const [records] = await this.db.query<[CampaignMembershipRecord[]]>(
      "SELECT * FROM campaign_membership WHERE campaign_id = $campaignId AND member_key = $memberKey LIMIT 1",
      { campaignId, memberKey }
    );
    return records?.[0] ? mapCampaignMembership(records[0]) : null;
  }

  async getTableMembership(tableId: string, memberKey: string): Promise<TableMembership | null> {
    await this.connect();
    const [records] = await this.db.query<[TableMembershipRecord[]]>(
      "SELECT * FROM table_membership WHERE table_id = $tableId AND member_key = $memberKey LIMIT 1",
      { tableId, memberKey }
    );
    return records?.[0] ? mapTableMembership(records[0]) : null;
  }

  async upsertCampaignMembership(input: {
    campaignId: string; memberKey: string; displayName: unknown; roleLabels: unknown; capabilities: unknown; scopes: unknown;
  }): Promise<CampaignMembership> {
    await this.connect();
    const campaign = await this.db.select<CampaignRecord>(new RecordId("campaign", input.campaignId));
    if (!campaign) throw new Error("campaign not found");
    const displayName = normalizeMemberDisplayName(input.displayName);
    const roleLabels = normalizeCampaignRoleLabels(input.roleLabels);
    const capabilities = normalizeCampaignCapabilities(input.capabilities);
    const scopes = normalizeCapabilityScopes(input.scopes);
    const existing = await this.getCampaignMembership(input.campaignId, input.memberKey);
    const id = existing?.id ?? randomUUID();
    const record = await this.db.upsert<CampaignMembershipRecord>(new RecordId("campaign_membership", id)).content({
      membership_id: id, campaign_id: input.campaignId, member_key: input.memberKey, display_name: displayName,
      role_labels: roleLabels, capabilities, scopes_json: JSON.stringify(scopes)
    });
    return mapCampaignMembership(record);
  }

  async upsertTableMembership(input: {
    tableId: string; memberKey: string; displayName: unknown; roleLabels: unknown; capabilities: unknown;
  }): Promise<TableMembership> {
    await this.connect();
    const table = await this.db.select<CampaignTableRecord>(new RecordId("campaign_table", input.tableId));
    if (!table) throw new Error("table not found");
    const displayName = normalizeMemberDisplayName(input.displayName);
    const roleLabels = normalizeTableRoleLabels(input.roleLabels);
    const capabilities = normalizeTableCapabilities(input.capabilities);
    const existing = await this.getTableMembership(input.tableId, input.memberKey);
    const id = existing?.id ?? randomUUID();
    const record = await this.db.upsert<TableMembershipRecord>(new RecordId("table_membership", id)).content({
      membership_id: id, table_id: input.tableId, member_key: input.memberKey, display_name: displayName,
      role_labels: roleLabels, capabilities
    });
    return mapTableMembership(record);
  }

  async deleteTableMembership(tableId: string, memberKey: string): Promise<void> {
    await this.connect();
    const membership = await this.getTableMembership(tableId, memberKey);
    if (membership) await this.db.delete(new RecordId("table_membership", membership.id));
  }

  async deleteCampaignMembership(campaignId: string, memberKey: string): Promise<void> {
    await this.connect();
    const membership = await this.getCampaignMembership(campaignId, memberKey);
    if (!membership) return;
    const [tables] = await this.db.query<[CampaignTableRecord[]]>(
      "SELECT * FROM campaign_table WHERE campaign_id = $campaignId", { campaignId }
    );
    for (const table of tables ?? []) await this.deleteTableMembership(table.table_id, memberKey);
    await this.db.delete(new RecordId("campaign_membership", membership.id));
  }

  private async createCharacterInTransaction(
    txn: SurrealTransaction,
    input: { id: string; name: unknown; rulesetId: unknown; maxHp: unknown; currentHp?: unknown; rulesetData?: unknown }
  ): Promise<CharacterRuntime> {
    const name = normalizeCharacterName(input.name);
    const rulesetId = normalizeRulesetId(input.rulesetId);
    const maxHp = Number(input.maxHp);
    const currentHp = input.currentHp === undefined ? maxHp : Number(input.currentHp);
    const hp = normalizeResourceBounds(currentHp, maxHp);
    const rulesetData = normalizeRulesetData(input.rulesetData);
    const now = new Date().toISOString();
    const characterRecord = await txn.create<CharacterRecord>(new RecordId("character", input.id)).content({
      character_id: input.id, name, ruleset_id: rulesetId, schema_version: 1, ruleset_data: rulesetData,
      created_at: now, updated_at: now
    });
    const resourceId = randomUUID();
    const resourceRecord = await txn.create<CharacterResourceRecord>(new RecordId("character_resource", resourceId)).content({
      resource_id: resourceId, character_id: input.id, resource_key: "hp", label: "Hit points",
      current: hp.current, max: hp.max, updated_at: now
    });
    return { definition: mapCharacter(characterRecord), resources: [mapCharacterResource(resourceRecord)] };
  }

  async ensureStarterCharacterFromLegacySnapshot(sessionId: string): Promise<CharacterRuntime> {
    await this.connect();
    const existing = await this.db.select<CharacterRecord>(new RecordId("character", STARTER_CHARACTER_ID));
    if (existing) {
      const resources = await this.listCharacterResources(STARTER_CHARACTER_ID);
      if (resources.some((resource) => resource.key === "hp")) return { definition: mapCharacter(existing), resources };
      const now = new Date().toISOString();
      const resourceId = randomUUID();
      const record = await this.db.create<CharacterResourceRecord>(new RecordId("character_resource", resourceId)).content({
        resource_id: resourceId, character_id: STARTER_CHARACTER_ID, resource_key: "hp", label: "Hit points",
        current: 32, max: 32, updated_at: now
      });
      return { definition: mapCharacter(existing), resources: [mapCharacterResource(record)] };
    }

    const legacySnapshot = await this.db.select<SnapshotRecord>(new RecordId("session_snapshot", sessionId));
    const legacy = legacySnapshot?.state ?? {};
    const name = typeof legacy.characterName === "string" ? legacy.characterName : "Mira Voss";
    const legacyMax = typeof legacy.maxHp === "number" && Number.isInteger(legacy.maxHp) && legacy.maxHp > 0 ? legacy.maxHp : 32;
    const legacyCurrent = typeof legacy.hp === "number" && Number.isInteger(legacy.hp) && legacy.hp >= 0 && legacy.hp <= legacyMax ? legacy.hp : legacyMax;
    const txn = await this.db.beginTransaction();
    try {
      const runtime = await this.createCharacterInTransaction(txn, {
        id: STARTER_CHARACTER_ID, name, rulesetId: DEFAULT_RULESET_ID, maxHp: legacyMax, currentHp: legacyCurrent, rulesetData: {}
      });
      await txn.commit();
      return runtime;
    } catch (error) {
      await txn.cancel();
      throw error;
    }
  }

  private async updateCharacterInTransaction(
    txn: SurrealTransaction, existing: CharacterRuntime,
    input: { characterId: string; name: unknown; maxHp: unknown; rulesetData: unknown }
  ): Promise<CharacterRuntime> {
    const hpResource = existing.resources.find((resource) => resource.key === "hp");
    if (!hpResource) throw new Error("character has no hp resource");
    const name = normalizeCharacterName(input.name);
    const maxHp = Number(input.maxHp);
    const hp = normalizeResourceBounds(Math.min(hpResource.current, maxHp), maxHp);
    const rulesetData = normalizeRulesetData(input.rulesetData);
    const now = new Date().toISOString();
    const characterRecord = await txn.update<CharacterRecord>(new RecordId("character", input.characterId)).merge({
      name, ruleset_data: rulesetData, updated_at: now
    });
    const resourceRecord = await txn.update<CharacterResourceRecord>(new RecordId("character_resource", hpResource.id)).merge({
      current: hp.current, max: hp.max, updated_at: now
    });
    return { definition: mapCharacter(characterRecord), resources: existing.resources.map((resource) => resource.key === "hp" ? mapCharacterResource(resourceRecord) : resource) };
  }

  private async updateCharacter(input: { characterId: string; name: unknown; maxHp: unknown; rulesetData: unknown }): Promise<CharacterRuntime> {
    await this.connect();
    const existing = await this.getCharacterRuntime(input.characterId);
    if (!existing) throw new Error("character not found");
    const txn = await this.db.beginTransaction();
    try {
      const runtime = await this.updateCharacterInTransaction(txn, existing, input);
      await txn.commit();
      return runtime;
    } catch (error) { await txn.cancel(); throw error; }
  }

  async listCharacterResources(characterId: string): Promise<CharacterResource[]> {
    await this.connect();
    const [records] = await this.db.query<[CharacterResourceRecord[]]>(
      "SELECT * FROM character_resource WHERE character_id = $characterId ORDER BY resource_key ASC",
      { characterId }
    );
    return (records ?? []).map(mapCharacterResource);
  }

  async getCharacterRuntime(characterId: string): Promise<CharacterRuntime | null> {
    await this.connect();
    const record = await this.db.select<CharacterRecord>(new RecordId("character", characterId));
    if (!record) return null;
    return { definition: mapCharacter(record), resources: await this.listCharacterResources(characterId) };
  }

  async listCharacterRuntimes(): Promise<CharacterRuntime[]> {
    await this.connect();
    const [characters, resources] = await Promise.all([
      this.db.select<CharacterRecord>(new Table("character")),
      this.db.select<CharacterResourceRecord>(new Table("character_resource"))
    ]);
    const byCharacter = new Map<string, CharacterResource[]>();
    for (const resource of resources.map(mapCharacterResource)) {
      const list = byCharacter.get(resource.characterId) ?? [];
      list.push(resource);
      byCharacter.set(resource.characterId, list);
    }
    return characters.map(mapCharacter).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((definition) => ({
      definition, resources: (byCharacter.get(definition.id) ?? []).sort((a, b) => a.key.localeCompare(b.key))
    }));
  }

  async listTableCharacterRuntimes(tableId: string): Promise<CharacterRuntime[]> {
    await this.connect();
    const [memberships] = await this.db.query<[TableCharacterMembershipRecord[]]>(
      "SELECT * FROM table_character_membership WHERE table_id = $tableId", { tableId }
    );
    const allowed = new Set((memberships ?? []).map((item) => item.character_id));
    return (await this.listCharacterRuntimes()).filter((runtime) => allowed.has(runtime.definition.id));
  }

  async getCharacterIdentity(identityId: string): Promise<CharacterIdentity | null> {
    await this.connect();
    const record = await this.db.select<CharacterIdentityRecord>(new RecordId("character_identity", identityId));
    return record ? mapCharacterIdentity(record) : null;
  }

  async createCharacterIdentity(input: { ownerKey: string; displayName: unknown; rulesetId: unknown }): Promise<CharacterIdentity> {
    await this.connect();
    const displayName = normalizeCharacterName(input.displayName);
    const rulesetId = normalizeRulesetId(input.rulesetId);
    const id = randomUUID();
    const now = new Date().toISOString();
    const record = await this.db.create<CharacterIdentityRecord>(new RecordId("character_identity", id)).content({
      identity_id: id, owner_key: input.ownerKey, display_name: displayName, ruleset_id: rulesetId, created_at: now, updated_at: now
    });
    return mapCharacterIdentity(record);
  }

  async getCampaignCharacterMembership(characterId: string): Promise<CampaignCharacterMembership | null> {
    await this.connect();
    const [records] = await this.db.query<[CampaignCharacterMembershipRecord[]]>(
      "SELECT * FROM campaign_character_membership WHERE character_id = $characterId LIMIT 1", { characterId }
    );
    return records?.[0] ? mapCampaignCharacterMembership(records[0]) : null;
  }

  async createCampaignCharacter(input: {
    identityId: string; campaignId: string; name: unknown; rulesetId: unknown; maxHp: unknown; rulesetData: unknown;
    sourceKind: CampaignCharacterMembership["sourceKind"]; sourceCharacterId?: string | null;
  }): Promise<CharacterRuntime> {
    await this.connect();
    const identity = await this.getCharacterIdentity(input.identityId);
    if (!identity) throw new Error("character identity not found");
    const campaign = await this.db.select<CampaignRecord>(new RecordId("campaign", input.campaignId));
    if (!campaign) throw new Error("campaign not found");
    const [existing] = await this.db.query<[CampaignCharacterMembershipRecord[]]>(
      "SELECT * FROM campaign_character_membership WHERE campaign_id = $campaignId AND identity_id = $identityId LIMIT 1",
      { campaignId: input.campaignId, identityId: input.identityId }
    );
    if (existing?.length) throw new Error("character identity already has a version in this campaign");
    if (input.sourceKind === "current_build") {
      if (!input.sourceCharacterId) throw new Error("current build source character is required");
      const source = await this.getCampaignCharacterMembership(input.sourceCharacterId);
      if (!source || source.identityId !== input.identityId) throw new Error("source character does not belong to this identity");
    }
    const characterId = randomUUID();
    const now = new Date().toISOString();
    const txn = await this.db.beginTransaction();
    try {
      const runtime = await this.createCharacterInTransaction(txn, { id: characterId, name: input.name, rulesetId: input.rulesetId, maxHp: input.maxHp, rulesetData: input.rulesetData });
      const membershipId = `${input.campaignId}--${characterId}`;
      await txn.create<CampaignCharacterMembershipRecord>(new RecordId("campaign_character_membership", membershipId)).content({
        membership_id: membershipId, campaign_id: input.campaignId, character_id: characterId, identity_id: input.identityId,
        source_kind: input.sourceKind, source_character_id: input.sourceCharacterId ?? undefined, created_at: now
      });
      await txn.commit();
      return runtime;
    } catch (error) { await txn.cancel(); throw error; }
  }

  async addCampaignCharacterToTable(characterId: string, tableId: string): Promise<TableCharacterMembership> {
    await this.connect();
    const campaignCharacter = await this.getCampaignCharacterMembership(characterId);
    if (!campaignCharacter) throw new Error("campaign character not found");
    const table = await this.db.select<CampaignTableRecord>(new RecordId("campaign_table", tableId));
    if (!table) throw new Error("table not found");
    if (table.campaign_id !== campaignCharacter.campaignId) throw new Error("table and character belong to different campaigns");
    const membershipId = `${tableId}--${characterId}`;
    const record = await this.db.upsert<TableCharacterMembershipRecord>(new RecordId("table_character_membership", membershipId)).content({
      membership_id: membershipId, table_id: tableId, character_id: characterId
    });
    return mapTableCharacterMembership(record);
  }

  async createCharacterChangeRequest(input: {
    campaignId: string; characterId: string; requestedBy: string; name: unknown; maxHp: unknown; rulesetData: unknown; message?: unknown;
  }): Promise<CharacterChangeRequest> {
    await this.connect();
    const membership = await this.getCampaignCharacterMembership(input.characterId);
    if (!membership || membership.campaignId !== input.campaignId) throw new Error("campaign character not found");
    const runtime = await this.getCharacterRuntime(input.characterId);
    if (!runtime) throw new Error("campaign character not found");
    const [pending] = await this.db.query<[CharacterChangeRequestRecord[]]>(
      "SELECT * FROM character_change_request WHERE character_id = $characterId AND status = 'pending' LIMIT 1",
      { characterId: input.characterId }
    );
    if (pending?.length) throw new Error("character already has a pending change request");
    const name = normalizeCharacterName(input.name);
    const maxHp = Number(input.maxHp);
    normalizeResourceBounds(maxHp, maxHp);
    const rulesetData = normalizeRulesetData(input.rulesetData);
    const message = normalizeChangeMessage(input.message);
    const id = randomUUID();
    const now = new Date().toISOString();
    const record = await this.db.create<CharacterChangeRequestRecord>(new RecordId("character_change_request", id)).content({
      request_id: id, campaign_id: input.campaignId, character_id: input.characterId, requested_by: input.requestedBy, status: "pending",
      proposed_name: name, proposed_max_hp: maxHp, proposed_ruleset_data: rulesetData, message,
      base_updated_at: runtime.definition.updatedAt, created_at: now
    });
    return mapCharacterChangeRequest(record);
  }

  async getCharacterChangeRequest(requestId: string): Promise<CharacterChangeRequest | null> {
    await this.connect();
    const record = await this.db.select<CharacterChangeRequestRecord>(new RecordId("character_change_request", requestId));
    return record ? mapCharacterChangeRequest(record) : null;
  }

  async resolveCharacterChangeRequest(input: { requestId: string; decision: "approve" | "reject"; resolvedBy: string }): Promise<CharacterChangeRequest> {
    await this.connect();
    const request = await this.db.select<CharacterChangeRequestRecord>(new RecordId("character_change_request", input.requestId));
    if (!request) throw new Error("change request not found");
    if (request.status !== "pending") throw new Error("change request is already resolved");
    const existing = await this.getCharacterRuntime(request.character_id);
    if (!existing) throw new Error("character not found");
    if (input.decision === "approve" && existing.definition.updatedAt !== request.base_updated_at) {
      throw new Error("change request is stale because the character changed after it was submitted");
    }
    const now = new Date().toISOString();
    const txn = await this.db.beginTransaction();
    try {
      if (input.decision === "approve") {
        await this.updateCharacterInTransaction(txn, existing, {
          characterId: request.character_id, name: request.proposed_name, maxHp: request.proposed_max_hp, rulesetData: request.proposed_ruleset_data
        });
      }
      const resolved = await txn.update<CharacterChangeRequestRecord>(new RecordId("character_change_request", input.requestId)).merge({
        status: input.decision === "approve" ? "approved" : "rejected", resolved_at: now, resolved_by: input.resolvedBy
      });
      await txn.commit();
      return mapCharacterChangeRequest(resolved);
    } catch (error) { await txn.cancel(); throw error; }
  }

  async updateCampaignCharacterDirect(input: { characterId: string; campaignId: string; name: unknown; maxHp: unknown; rulesetData: unknown }): Promise<CharacterRuntime> {
    const membership = await this.getCampaignCharacterMembership(input.characterId);
    if (!membership || membership.campaignId !== input.campaignId) throw new Error("campaign character not found");
    return this.updateCharacter(input);
  }

  async getCampaignCharacterPrivateState(characterId: string, campaignId: string): Promise<CampaignCharacterPrivateState> {
    await this.connect();
    const membership = await this.getCampaignCharacterMembership(characterId);
    if (!membership || membership.campaignId !== campaignId) throw new Error("campaign character not found");
    const [records] = await this.db.query<[CampaignCharacterPrivateStateRecord[]]>(
      "SELECT * FROM campaign_character_private_state WHERE campaign_id = $campaignId AND character_id = $characterId LIMIT 1",
      { campaignId, characterId }
    );
    const record = records?.[0];
    return record ? mapCampaignCharacterPrivateState(record) : { campaignId, characterId, data: {}, updatedAt: "" };
  }

  async setCampaignCharacterPrivateState(characterId: string, campaignId: string, dataInput: unknown): Promise<CampaignCharacterPrivateState> {
    await this.connect();
    const membership = await this.getCampaignCharacterMembership(characterId);
    if (!membership || membership.campaignId !== campaignId) throw new Error("campaign character not found");
    const data = normalizePrivateCharacterState(dataInput);
    const now = new Date().toISOString();
    const stateId = `${campaignId}--${characterId}`;
    const record = await this.db.upsert<CampaignCharacterPrivateStateRecord>(new RecordId("campaign_character_private_state", stateId)).content({
      state_id: stateId, campaign_id: campaignId, character_id: characterId, data, updated_at: now
    });
    return mapCampaignCharacterPrivateState(record);
  }

  async getCharacterResource(characterId: string, keyInput: unknown): Promise<CharacterResource | null> {
    await this.connect();
    const key = normalizeResourceKey(keyInput);
    const [records] = await this.db.query<[CharacterResourceRecord[]]>(
      "SELECT * FROM character_resource WHERE character_id = $characterId AND resource_key = $key LIMIT 1",
      { characterId, key }
    );
    const record = records?.[0];
    return record ? mapCharacterResource(record) : null;
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

  async getSceneFog(sceneId: string): Promise<SceneFog> {
    await this.connect();
    const record = await this.db.select<FogRecord>(new RecordId("scene_fog", sceneId));
    return record ? mapFog(record) : emptyFog(sceneId);
  }

  async setSceneFogEnabled(sceneId: string, enabled: boolean): Promise<SceneFog> {
    await this.connect();
    if (!await this.getScene(sceneId)) throw new Error("scene not found");
    const current = await this.getSceneFog(sceneId);
    const record = await this.db.upsert<FogRecord>(new RecordId("scene_fog", sceneId)).content({
      scene_id: sceneId, enabled: Boolean(enabled), revealed_cells: current.revealedCells, updated_at: new Date().toISOString()
    });
    return mapFog(record);
  }

  async setSceneFogCell(sceneId: string, column: unknown, row: unknown, revealed: boolean): Promise<SceneFog> {
    await this.connect();
    if (!await this.getScene(sceneId)) throw new Error("scene not found");
    const key = normalizeFogCell(column, row);
    const current = await this.getSceneFog(sceneId);
    const cells = new Set(current.revealedCells);
    if (revealed) cells.add(key); else cells.delete(key);
    const record = await this.db.upsert<FogRecord>(new RecordId("scene_fog", sceneId)).content({
      scene_id: sceneId, enabled: current.enabled, revealed_cells: [...cells].sort(), updated_at: new Date().toISOString()
    });
    return mapFog(record);
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

  private parseInitiative(value: unknown): InitiativeState | undefined {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
    const input = value as Record<string, unknown>;
    const round = Number(input.round);
    const activeIndex = Number(input.activeIndex);
    if (!Number.isInteger(round) || round < 0 || !Number.isInteger(activeIndex)) return undefined;
    if (!Array.isArray(input.entries)) return undefined;
    const entries = input.entries.flatMap((item) => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) return [];
      const entry = item as Record<string, unknown>;
      if (typeof entry.id !== "string" || typeof entry.label !== "string" || !Number.isInteger(Number(entry.score))) return [];
      return [{
        id: entry.id, label: entry.label, score: Number(entry.score), characterId: typeof entry.characterId === "string" ? entry.characterId : null,
        armorClass: Number(entry.armorClass) > 0 ? Number(entry.armorClass) : null,
        currentHp: Number.isInteger(Number(entry.currentHp)) && Number(entry.maxHp) > 0 ? Math.max(0, Number(entry.currentHp)) : null,
        maxHp: Number(entry.maxHp) > 0 ? Number(entry.maxHp) : null
      }];
    });
    return { round, activeIndex: entries.length ? Math.max(0, Math.min(activeIndex, entries.length - 1)) : -1, entries };
  }

  async loadSnapshot(sessionId: string): Promise<SessionSnapshot | null> {
    await this.connect();
    const record = await this.db.select<SnapshotRecord>(new RecordId("session_snapshot", sessionId));
    if (!record) return null;
    const state = record.state;
    const latest = state.latestRoll;
    const latestRoll = typeof latest === "object" && latest !== null ? latest as SessionSnapshot["latestRoll"] : null;
    const initiative = this.parseInitiative(state.initiative);
    return {
      sessionId: record.session_id,
      sequence: record.sequence,
      activeSceneId: typeof state.activeSceneId === "string" ? state.activeSceneId : STARTER_SCENE_ID,
      latestRoll,
      recentEvents: asRecentEvents(state.recentEvents),
      ...(initiative ? { initiative } : {})
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
        activeSceneId: snapshot.activeSceneId,
        latestRoll: snapshot.latestRoll,
        recentEvents: snapshot.recentEvents,
        initiative: snapshot.initiative ?? { round: 0, activeIndex: -1, entries: [] }
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

  async updateCharacterResourceWithEvent(
    characterId: string, keyInput: unknown, currentInput: unknown, event: GameEvent, snapshot: SessionSnapshot
  ): Promise<CharacterResource> {
    await this.connect();
    const existing = await this.getCharacterResource(characterId, keyInput);
    if (!existing) throw new Error("character resource not found");
    const bounds = normalizeResourceBounds(currentInput, existing.max);
    const txn = await this.db.beginTransaction();
    try {
      const record = await txn.update<CharacterResourceRecord>(new RecordId("character_resource", existing.id)).merge({
        current: bounds.current, updated_at: new Date().toISOString()
      });
      await this.persistSessionInTransaction(txn, event, snapshot);
      await txn.commit();
      return mapCharacterResource(record);
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
