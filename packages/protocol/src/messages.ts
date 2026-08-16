export const ROOM_NAME = "vertical_slice";
export const SESSION_ID = "vertical-slice-001";

export const MESSAGE = {
  roll: "roll",
  adjustHp: "adjust_hp",
  presentScene: "present_scene",
  createToken: "create_token",
  moveToken: "move_token"
} as const;

export interface JoinOptions { clientName?: string }
export interface RollCommand { sides: number; modifier: number }
export interface AdjustHpCommand { delta: number }
export interface PresentSceneCommand { sceneId: string }

export interface CreateTokenCommand {
  sceneId: string;
  kind: "player" | "npc" | "object";
  label: string;
  x: number;
  y: number;
  claim?: boolean;
}

export interface MoveTokenCommand { tokenId: string; x: number; y: number }

export const SERVER_MESSAGE = { commandError: "command_error" } as const;
export interface CommandErrorMessage { message: string }
