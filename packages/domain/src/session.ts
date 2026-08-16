export type GameEventKind = "roll" | "hp" | "scene_presented" | "token_created" | "token_moved";

export interface GameEvent {
  sequence: number;
  sessionId: string;
  kind: GameEventKind;
  actor: string;
  summary: string;
  payload: Record<string, unknown>;
  at: string;
}

export interface RecentEvent {
  sequence: number;
  kind: GameEventKind;
  actor: string;
  summary: string;
  at: string;
}

export interface SessionSnapshot {
  sessionId: string;
  sequence: number;
  activeSceneId: string;
  latestRoll: {
    sides: number;
    natural: number;
    modifier: number;
    total: number;
  } | null;
  recentEvents: RecentEvent[];
}
