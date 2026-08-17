export const STARTER_CAMPAIGN_ID = "first-table-campaign";
export const STARTER_TABLE_ID = "main-table";
export const PREVIEW_MEMBER_KEY = "local-preview";

export type CampaignRoleLabel = "owner" | "dm" | "co_dm" | "player";
export type TableRoleLabel = "dm" | "co_dm" | "player";

export interface Campaign {
  id: string;
  name: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignTable {
  id: string;
  campaignId: string;
  name: string;
  summary: string;
  currentSessionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CapabilityScope {
  kind: "campaign" | "world_subgraph";
  worldEntityId: string | null;
  includeDescendants: boolean;
}
export interface CampaignMembership {
  id: string;
  campaignId: string;
  memberKey: string;
  displayName: string;
  roleLabels: CampaignRoleLabel[];
  capabilities: string[];
  scopes: CapabilityScope[];
}

export interface TableMembership {
  id: string;
  tableId: string;
  memberKey: string;
  displayName: string;
  roleLabels: TableRoleLabel[];
  capabilities: string[];
}

export interface CampaignCharacterMembership {
  campaignId: string;
  characterId: string;
  identityId: string;
  sourceKind: "legacy_migration" | "level1" | "current_build";
  sourceCharacterId: string | null;
  createdAt: string;
}

export interface TableCharacterMembership {
  tableId: string;
  characterId: string;
}
export function normalizeCampaignName(value: unknown): string {
  if (typeof value !== "string") throw new Error("campaign name must be text");
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > 100) throw new Error("campaign name must be 1-100 characters");
  return name;
}

export function normalizeTableName(value: unknown): string {
  if (typeof value !== "string") throw new Error("table name must be text");
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > 100) throw new Error("table name must be 1-100 characters");
  return name;
}

export function normalizeCampaignSummary(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error("campaign summary must be text");
  return value.trim().replace(/\s+/g, " ").slice(0, 1000);
}
const campaignRoles = new Set<CampaignRoleLabel>(["owner", "dm", "co_dm", "player"]);
const tableRoles = new Set<TableRoleLabel>(["dm", "co_dm", "player"]);

export function normalizeCampaignRoleLabels(value: unknown): CampaignRoleLabel[] {
  if (!Array.isArray(value)) throw new Error("campaign roles must be an array");
  const roles = value.map((item) => {
    if (typeof item !== "string" || !campaignRoles.has(item as CampaignRoleLabel)) throw new Error("invalid campaign role");
    return item as CampaignRoleLabel;
  });
  return [...new Set(roles)];
}

export function normalizeTableRoleLabels(value: unknown): TableRoleLabel[] {
  if (!Array.isArray(value)) throw new Error("table roles must be an array");
  const roles = value.map((item) => {
    if (typeof item !== "string" || !tableRoles.has(item as TableRoleLabel)) throw new Error("invalid table role");
    return item as TableRoleLabel;
  });
  return [...new Set(roles)];
}
