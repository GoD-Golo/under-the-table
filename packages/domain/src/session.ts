export type GameEventKind = "roll" | "hp" | "scene_presented" | "token_created" | "token_moved" | "initiative" | "attack";

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


export interface InitiativeEntry {
  id: string;
  label: string;
  score: number;
  characterId: string | null;
  armorClass: number | null;
  currentHp: number | null;
  maxHp: number | null;
}

export interface InitiativeState {
  round: number;
  activeIndex: number;
  entries: InitiativeEntry[];
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
  initiative?: InitiativeState;
}
