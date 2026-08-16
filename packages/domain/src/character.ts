export const STARTER_CHARACTER_ID = "mira-voss";
export const DEFAULT_RULESET_ID = "dnd2024";

export interface CharacterDefinition {
  id: string;
  name: string;
  rulesetId: string;
  schemaVersion: number;
  rulesetData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterResource {
  id: string;
  characterId: string;
  key: string;
  label: string;
  current: number;
  max: number;
  updatedAt: string;
}

export interface CharacterRuntime {
  definition: CharacterDefinition;
  resources: CharacterResource[];
}
export function normalizeCharacterName(value: unknown): string {
  if (typeof value !== "string") throw new Error("character name must be text");
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > 80) throw new Error("character name must be 1-80 characters");
  return name;
}

export function normalizeRulesetId(value: unknown): string {
  if (typeof value !== "string") throw new Error("ruleset id must be text");
  const id = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(id)) throw new Error("ruleset id must use lowercase letters, numbers, dots, dashes or underscores");
  return id;
}

export function normalizeResourceKey(value: unknown): string {
  if (typeof value !== "string") throw new Error("resource key must be text");
  const key = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(key)) throw new Error("resource key is invalid");
  return key;
}
export function normalizeResourceBounds(currentValue: unknown, maxValue: unknown): { current: number; max: number } {
  const current = Number(currentValue);
  const max = Number(maxValue);
  if (!Number.isInteger(max) || max <= 0 || max > 999999) throw new Error("resource max must be an integer between 1 and 999999");
  if (!Number.isInteger(current) || current < 0 || current > max) throw new Error("resource current must be an integer between 0 and max");
  return { current, max };
}

export function normalizeRulesetData(value: unknown): Record<string, unknown> {
  if (value === undefined) return {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("ruleset data must be an object");
  return value as Record<string, unknown>;
}
