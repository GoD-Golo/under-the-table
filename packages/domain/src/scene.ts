export const STARTER_SCENE_ID = "table-landing";

export type SceneKind = "blank" | "image" | "combat_test";
export type GridKind = "none" | "square" | "hex";
export const FOG_COLUMNS = 12;
export const FOG_ROWS = 8;

export interface SceneGrid {
  kind: GridKind;
  size: number;
  visible: boolean;
}

export interface WorldEntity {
  id: string;
  kind: "place" | "generic";
  name: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export interface Scene {
  id: string;
  name: string;
  kind: SceneKind;
  entityId: string | null;
  backgroundAssetKey: string | null;
  backgroundWidth: number;
  backgroundHeight: number;
  grid: SceneGrid;
  createdAt: string;
  updatedAt: string;
}

export interface SceneFog {
  sceneId: string;
  enabled: boolean;
  revealedCells: string[];
  updatedAt: string;
}

export interface SceneHotspot {
  id: string;
  sceneId: string;
  label: string;
  x: number;
  y: number;
  linkedSceneId: string | null;
  linkedEntityId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function normalizeSceneName(value: unknown): string {
  if (typeof value !== "string") throw new Error("scene name is required");
  const cleaned = value.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!cleaned) throw new Error("scene name is required");
  return cleaned;
}

export function normalizeSceneKind(value: unknown): SceneKind {
  if (value === "blank" || value === "image" || value === "combat_test") return value;
  throw new Error("scene kind must be blank, image, or combat_test");
}

export function normalizeGrid(kind: unknown, size: unknown, visible: unknown): SceneGrid {
  if (kind !== "none" && kind !== "square" && kind !== "hex") throw new Error("invalid grid kind");
  const parsed = Number(size);
  if (!Number.isFinite(parsed) || parsed < 16 || parsed > 240) throw new Error("grid size must be between 16 and 240");
  return { kind, size: Math.round(parsed), visible: Boolean(visible) };
}

export function normalizeHotspotCoordinate(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) throw new Error("hotspot coordinate must be between 0 and 1");
  return parsed;
}

export function normalizeLoreSummary(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value !== "string") throw new Error("lore summary must be text");
  return value.trim().slice(0, 2000);
}

export function normalizeFogCell(column: unknown, row: unknown): string {
  const col = Number(column);
  const parsedRow = Number(row);
  if (!Number.isInteger(col) || col < 0 || col >= FOG_COLUMNS) throw new Error(`fog column must be between 0 and ${FOG_COLUMNS - 1}`);
  if (!Number.isInteger(parsedRow) || parsedRow < 0 || parsedRow >= FOG_ROWS) throw new Error(`fog row must be between 0 and ${FOG_ROWS - 1}`);
  return `${col}:${parsedRow}`;
}
