export interface ProductCampaignDto {
  id: string;
  name: string;
  summary: string;
  roleLabels: Array<"owner" | "dm" | "co_dm" | "player">;
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
  characterIds: string[];
  activeSceneId: string | null;
  activeSceneName: string | null;
}

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
  identities: ProductCharacterIdentityDto[];
  characters: ProductCharacterDto[];
  changeRequests: ProductCharacterChangeRequestDto[];
  activity: ProductActivityDto[];
}

export interface ProductCharacterPrivateStateDto { campaignId: string; characterId: string; data: Record<string, unknown>; updatedAt: string }
