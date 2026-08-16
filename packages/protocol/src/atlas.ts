export type AtlasSceneKind = "blank" | "image" | "combat_test";
export type AtlasGridKind = "none" | "square" | "hex";
export type AtlasTokenKind = "player" | "npc" | "object";

export interface AtlasEntityDto {
  id: string;
  kind: "place" | "generic";
  name: string;
  summary: string;
}

export interface AtlasSceneDto {
  id: string;
  name: string;
  kind: AtlasSceneKind;
  entityId: string | null;
  backgroundAssetKey: string | null;
  backgroundWidth: number;
  backgroundHeight: number;
  grid: { kind: AtlasGridKind; size: number; visible: boolean };
}

export interface AtlasHotspotDto {
  id: string;
  sceneId: string;
  label: string;
  x: number;
  y: number;
  linkedSceneId: string | null;
  linkedEntityId: string | null;
}

export interface AtlasTokenDto {
  id: string;
  sceneId: string;
  kind: AtlasTokenKind;
  label: string;
  x: number;
  y: number;
  controllerName: string | null;
}

export interface AtlasSnapshotDto {
  scenes: AtlasSceneDto[];
  hotspots: AtlasHotspotDto[];
  entities: AtlasEntityDto[];
  tokens: AtlasTokenDto[];
}
