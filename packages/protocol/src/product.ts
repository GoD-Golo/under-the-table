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

export interface ProductCharacterDto {
  id: string;
  campaignId: string;
  name: string;
  rulesetId: string;
  schemaVersion: number;
  rulesetData: Record<string, unknown>;
  hp: { current: number; max: number } | null;
  tableIds: string[];
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
  characters: ProductCharacterDto[];
  activity: ProductActivityDto[];
}
