export type ProductCampaignCapability =
  | "campaign.members.manage" | "world.read" | "world.scene.edit" | "world.lore.edit" | "world.npc.manage"
  | "character.propose" | "character.review" | "character.edit" | "character.private";
export type ProductTableCapability = "session.join" | "session.run" | "session.present" | "table.manage" | "character.play";
export interface ProductCapabilityScopeDto { kind: "campaign" | "world_subgraph"; worldEntityId: string | null; includeDescendants: boolean }

export interface ProductCampaignDto {
  id: string;
  name: string;
  summary: string;
  roleLabels: Array<"owner" | "dm" | "co_dm" | "player">;
  capabilities: ProductCampaignCapability[];
  scopes: ProductCapabilityScopeDto[];
  tableCount: number;
  characterCount: number;
}

export interface ProductTableDto {
  id: string;
  campaignId: string;
  name: string;
  summary: string;
  currentSessionId: string | null;
  roleLabels: Array<"dm" | "co_dm" | "player">;
  capabilities: ProductTableCapability[];
  characterIds: string[];
  activeSceneId: string | null;
  activeSceneName: string | null;
}

export interface ProductCampaignMembershipDto {
  id: string; campaignId: string; memberKey: string; displayName: string;
  roleLabels: ("owner" | "dm" | "co_dm" | "player")[];
  capabilities: ProductCampaignCapability[]; scopes: ProductCapabilityScopeDto[]; systemManaged: boolean;
}
export interface ProductTableMembershipDto {
  id: string; tableId: string; memberKey: string; displayName: string;
  roleLabels: ("dm" | "co_dm" | "player")[]; capabilities: ProductTableCapability[]; systemManaged: boolean;
}
export interface ProductWorldEntitySummaryDto { id: string; name: string; kind: string }

export interface ProductCharacterIdentityDto {
  id: string;
  ownerKey: string;
  displayName: string;
  rulesetId: string;
  campaignCharacterIds: string[];
}

export interface ProductCharacterDto {
  id: string;
  identityId: string;
  campaignId: string;
  name: string;
  rulesetId: string;
  schemaVersion: number;
  rulesetData: Record<string, unknown>;
  hp: { current: number; max: number } | null;
  tableIds: string[];
  sourceKind: "legacy_migration" | "level1" | "current_build";
  sourceCharacterId: string | null;
  pendingChangeCount: number;
}

export interface ProductCharacterChangeRequestDto {
  id: string;
  campaignId: string;
  characterId: string;
  requestedBy: string;
  status: "pending" | "approved" | "rejected";
  proposedName: string;
  proposedMaxHp: number;
  proposedRulesetData: Record<string, unknown>;
  message: string;
  baseUpdatedAt: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface ProductActivityDto {
  sequence: number;
  tableId: string;
  actor: string;
  summary: string;
  at: string;
}

export interface ProductSnapshotDto {
  viewer: {
    memberKey: string;
    displayName: string;
    authEnforced: false;
  };
  campaigns: ProductCampaignDto[];
  tables: ProductTableDto[];
  campaignMemberships: ProductCampaignMembershipDto[];
  tableMemberships: ProductTableMembershipDto[];
  worldEntities: ProductWorldEntitySummaryDto[];
  identities: ProductCharacterIdentityDto[];
  characters: ProductCharacterDto[];
  changeRequests: ProductCharacterChangeRequestDto[];
  activity: ProductActivityDto[];
}

export interface ProductCharacterPrivateStateDto { campaignId: string; characterId: string; data: Record<string, unknown>; updatedAt: string }
