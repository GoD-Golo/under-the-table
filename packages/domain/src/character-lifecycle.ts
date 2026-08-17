export const STARTER_CHARACTER_IDENTITY_ID = "mira-voss-identity";

export type CampaignCharacterSource = "legacy_migration" | "level1" | "current_build";
export type CharacterChangeRequestStatus = "pending" | "approved" | "rejected";

export interface CharacterIdentity {
  id: string;
  ownerKey: string;
  displayName: string;
  rulesetId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterChangeRequest {
  id: string;
  campaignId: string;
  characterId: string;
  requestedBy: string;
  status: CharacterChangeRequestStatus;
  proposedName: string;
  proposedMaxHp: number;
  proposedRulesetData: Record<string, unknown>;
  message: string;
  baseUpdatedAt: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface CampaignCharacterPrivateState {
  campaignId: string;
  characterId: string;
  data: Record<string, unknown>;
  updatedAt: string;
}

export function normalizeChangeMessage(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error("change request message must be text");
  return value.trim().replace(/\s+/g, " ").slice(0, 1000);
}

export function normalizePrivateCharacterState(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("private character state must be an object");
  }
  const data = value as Record<string, unknown>;
  const encoded = JSON.stringify(data);
  if (encoded.length > 16_384) throw new Error("private character state must be at most 16 KB");
  return data;
}