import type { CampaignRoleLabel, CapabilityScope, TableRoleLabel } from "./campaign.js";

export const CAMPAIGN_CAPABILITIES = [
  "campaign.members.manage",
  "world.read",
  "world.scene.edit",
  "world.lore.edit",
  "world.npc.manage",
  "character.propose",
  "character.review",
  "character.edit",
  "character.private"
] as const;

export type CampaignCapability = typeof CAMPAIGN_CAPABILITIES[number];

export const TABLE_CAPABILITIES = [
  "session.join",
  "session.run",
  "session.present",
  "table.manage",
  "character.play"
] as const;

export type TableCapability = typeof TABLE_CAPABILITIES[number];

export interface CampaignPolicyMembership {
  capabilities: CampaignCapability[];
  scopes: CapabilityScope[];
}

export interface TablePolicyMembership {
  capabilities: TableCapability[];
}

export interface WorldPolicyResource {
  worldEntityId: string | null;
  ancestorEntityIds?: string[];
}

export interface AccessDecision {
  allowed: boolean;
  reason: "allowed" | "missing_membership" | "missing_capability" | "outside_scope";
}

const campaignCapabilitySet = new Set<string>(CAMPAIGN_CAPABILITIES);
const tableCapabilitySet = new Set<string>(TABLE_CAPABILITIES);
const scopedWorldCapabilities = new Set<CampaignCapability>([
  "world.read", "world.scene.edit", "world.lore.edit", "world.npc.manage"
]);

export function normalizeCampaignCapabilities(value: unknown): CampaignCapability[] {
  if (!Array.isArray(value)) throw new Error("campaign capabilities must be an array");
  const capabilities = value.map((item) => {
    if (typeof item !== "string" || !campaignCapabilitySet.has(item)) throw new Error("invalid campaign capability");
    return item as CampaignCapability;
  });
  return [...new Set(capabilities)];
}

export function normalizeTableCapabilities(value: unknown): TableCapability[] {
  if (!Array.isArray(value)) throw new Error("table capabilities must be an array");
  const capabilities = value.map((item) => {
    if (typeof item !== "string" || !tableCapabilitySet.has(item)) throw new Error("invalid table capability");
    return item as TableCapability;
  });
  return [...new Set(capabilities)];
}

export function normalizeCapabilityScopes(value: unknown): CapabilityScope[] {
  if (!Array.isArray(value)) throw new Error("capability scopes must be an array");
  const scopes = value.map((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) throw new Error("invalid capability scope");
    const input = item as Record<string, unknown>;
    if (input.kind === "campaign") {
      return { kind: "campaign" as const, worldEntityId: null, includeDescendants: true };
    }
    if (input.kind !== "world_subgraph") throw new Error("invalid capability scope kind");
    if (typeof input.worldEntityId !== "string" || !input.worldEntityId.trim()) throw new Error("world subgraph scope requires a world entity");
    return { kind: "world_subgraph" as const, worldEntityId: input.worldEntityId.trim(), includeDescendants: Boolean(input.includeDescendants) };
  });
  const unique = new Map(scopes.map((scope) => [`${scope.kind}:${scope.worldEntityId ?? "*"}:${scope.includeDescendants}`, scope]));
  return [...unique.values()];
}

export function evaluateCampaignAccess(
  membership: CampaignPolicyMembership | null | undefined,
  capability: CampaignCapability,
  resource?: WorldPolicyResource
): AccessDecision {
  if (!membership) return { allowed: false, reason: "missing_membership" };
  if (!membership.capabilities.includes(capability)) return { allowed: false, reason: "missing_capability" };
  if (!scopedWorldCapabilities.has(capability)) return { allowed: true, reason: "allowed" };

  const worldEntityId = resource?.worldEntityId ?? null;
  const ancestors = resource?.ancestorEntityIds ?? [];
  const inScope = membership.scopes.some((scope) => {
    if (scope.kind === "campaign") return true;
    if (!worldEntityId || !scope.worldEntityId) return false;
    if (scope.worldEntityId === worldEntityId) return true;
    return scope.includeDescendants && ancestors.includes(scope.worldEntityId);
  });
  return inScope ? { allowed: true, reason: "allowed" } : { allowed: false, reason: "outside_scope" };
}

export function evaluateTableAccess(
  membership: TablePolicyMembership | null | undefined,
  capability: TableCapability
): AccessDecision {
  if (!membership) return { allowed: false, reason: "missing_membership" };
  return membership.capabilities.includes(capability)
    ? { allowed: true, reason: "allowed" }
    : { allowed: false, reason: "missing_capability" };
}

export function campaignRolePreset(role: CampaignRoleLabel): { capabilities: CampaignCapability[]; scopes: CapabilityScope[] } {
  if (role === "owner") return { capabilities: [...CAMPAIGN_CAPABILITIES], scopes: [{ kind: "campaign", worldEntityId: null, includeDescendants: true }] };
  if (role === "dm") return {
    capabilities: CAMPAIGN_CAPABILITIES.filter((capability) => capability !== "campaign.members.manage"),
    scopes: [{ kind: "campaign", worldEntityId: null, includeDescendants: true }]
  };
  if (role === "co_dm") return {
    capabilities: ["world.read", "world.scene.edit", "world.lore.edit", "world.npc.manage", "character.propose", "character.review"],
    scopes: [{ kind: "campaign", worldEntityId: null, includeDescendants: true }]
  };
  return { capabilities: ["character.propose"], scopes: [{ kind: "campaign", worldEntityId: null, includeDescendants: true }] };
}

export function tableRolePreset(role: TableRoleLabel): { capabilities: TableCapability[] } {
  if (role === "dm") return { capabilities: [...TABLE_CAPABILITIES] };
  if (role === "co_dm") return { capabilities: ["session.join", "session.run", "session.present", "character.play"] };
  return { capabilities: ["session.join", "character.play"] };
}

export function normalizeMemberDisplayName(value: unknown): string {
  if (typeof value !== "string") throw new Error("member display name must be text");
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > 80) throw new Error("member display name must be 1-80 characters");
  return name;
}