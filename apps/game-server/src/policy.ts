import {
  STARTER_CAMPAIGN_ID,
  evaluateCampaignAccess,
  evaluateTableAccess,
  type CampaignCapability,
  type TableCapability,
  type WorldPolicyResource
} from "@utt/domain";
import { surrealStore } from "./persistence/surreal-store.js";

export class PolicyDeniedError extends Error {
  readonly statusCode = 403;
  constructor(message: string) { super(message); this.name = "PolicyDeniedError"; }
}

export async function campaignAccess(
  campaignId: string,
  memberKey: string,
  capability: CampaignCapability,
  resource?: WorldPolicyResource
) {
  const membership = await surrealStore.getCampaignMembership(campaignId, memberKey);
  return evaluateCampaignAccess(
    membership ? { capabilities: membership.capabilities as CampaignCapability[], scopes: membership.scopes } : null,
    capability,
    resource
  );
}

export async function tableAccess(tableId: string, memberKey: string, capability: TableCapability) {
  const membership = await surrealStore.getTableMembership(tableId, memberKey);
  return evaluateTableAccess(
    membership ? { capabilities: membership.capabilities as TableCapability[] } : null,
    capability
  );
}

export async function requireCampaignCapability(
  campaignId: string,
  memberKey: string,
  capability: CampaignCapability,
  resource?: WorldPolicyResource
): Promise<void> {
  const decision = await campaignAccess(campaignId, memberKey, capability, resource);
  if (!decision.allowed) throw new PolicyDeniedError(`campaign capability denied: ${capability} (${decision.reason})`);
}

export async function requireTableCapability(tableId: string, memberKey: string, capability: TableCapability): Promise<void> {
  const decision = await tableAccess(tableId, memberKey, capability);
  if (!decision.allowed) throw new PolicyDeniedError(`table capability denied: ${capability} (${decision.reason})`);
}

export async function requireSceneCapability(sceneId: string, memberKey: string, capability: CampaignCapability): Promise<void> {
  const scene = await surrealStore.getScene(sceneId);
  if (!scene) throw new Error("scene not found");
  await requireCampaignCapability(STARTER_CAMPAIGN_ID, memberKey, capability, { worldEntityId: scene.entityId });
}
