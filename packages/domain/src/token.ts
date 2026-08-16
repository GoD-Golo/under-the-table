export type SceneTokenKind = "player" | "npc" | "object";

export interface SceneToken {
  id: string;
  sceneId: string;
  kind: SceneTokenKind;
  label: string;
  x: number;
  y: number;
  controllerName: string | null;
  createdAt: string;
  updatedAt: string;
}

export function normalizeTokenKind(value: unknown): SceneTokenKind {
  if (value === "player" || value === "npc" || value === "object") return value;
  throw new Error("token kind must be player, npc, or object");
}

export function normalizeTokenLabel(value: unknown): string {
  if (typeof value !== "string") throw new Error("token label is required");
  const cleaned = value.trim().replace(/\s+/g, " ").slice(0, 60);
  if (!cleaned) throw new Error("token label is required");
  return cleaned;
}

export function normalizeTokenCoordinate(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) throw new Error("token coordinate must be between 0 and 1");
  return parsed;
}
