import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Client, type Room } from "@colyseus/sdk";
import {
  LiveRoomState,
  MESSAGE,
  ROOM_NAME,
  SERVER_MESSAGE,
  type CommandErrorMessage
} from "@utt/protocol";

export interface LiveTokenView {
  id: string;
  sceneId: string;
  kind: "player" | "npc" | "object";
  label: string;
  x: number;
  y: number;
  controllerName: string | null;
}

export interface LiveViewState {
  sessionId: string;
  characterName: string;
  hp: number;
  maxHp: number;
  connectedPlayers: number;
  eventSequence: number;
  activeSceneId: string;
  tokens: LiveTokenView[];
  fogEnabled: boolean;
  fogRevealedCells: string[];
  latestRoll: { sides: number; natural: number; modifier: number; total: number } | null;
  events: Array<{ sequence: number; kind: string; actor: string; summary: string; at: string }>;
}

function snapshot(state: LiveRoomState): LiveViewState {
  return {
    sessionId: state.sessionId,
    characterName: state.characterName,
    hp: state.hp,
    maxHp: state.maxHp,
    connectedPlayers: state.connectedPlayers,
    eventSequence: state.eventSequence,
    activeSceneId: state.activeSceneId,
    tokens: Array.from(state.tokens.values()).map((token) => ({
      id: token.id, sceneId: token.sceneId, kind: token.kind as LiveTokenView["kind"], label: token.label,
      x: token.x, y: token.y, controllerName: token.controllerName || null
    })),
    fogEnabled: state.fogEnabled,
    fogRevealedCells: Array.from(state.fogRevealedCells),
    latestRoll: state.latestRollSides > 0 ? {
      sides: state.latestRollSides,
      natural: state.latestRollNatural,
      modifier: state.latestRollModifier,
      total: state.latestRollTotal
    } : null,
    events: Array.from(state.events).map((event) => ({
      sequence: event.sequence,
      kind: event.kind,
      actor: event.actor,
      summary: event.summary,
      at: event.at
    }))
  };
}

function randomClientSuffix(): string {
  const bytes = new Uint8Array(2);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  return Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0").toUpperCase();
}

function getClientName(): string {
  const key = "utt.vs001.client-name";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const generated = `Explorer-${randomClientSuffix()}`;
  window.localStorage.setItem(key, generated);
  return generated;
}

function endpoint(): string {
  return `${window.location.origin}/game`;
}

export function useLiveRoom() {
  const [state, setState] = useState<LiveViewState | null>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const roomRef = useRef<Room<LiveRoomState> | null>(null);
  const clientName = useMemo(getClientName, []);

  useEffect(() => {
    let cancelled = false;
    let joinedRoom: Room<LiveRoomState> | null = null;
    setStatus("connecting");
    setError(null);

    const connect = async () => {
      try {
        const client = new Client(endpoint());
        const room = await client.joinOrCreate(ROOM_NAME, { clientName }, LiveRoomState);
        if (cancelled) {
          await room.leave();
          return;
        }
        joinedRoom = room;
        roomRef.current = room;
        setState(snapshot(room.state));
        setStatus("connected");
        room.onStateChange((next) => setState(snapshot(next)));
        room.onMessage(SERVER_MESSAGE.commandError, (message: CommandErrorMessage) => setError(message.message));
        room.onLeave(() => {
          if (!cancelled) setStatus("disconnected");
        });
        room.onError((_code, message) => setError(message ?? "Room connection error"));
      } catch (reason) {
        if (!cancelled) {
          setStatus("disconnected");
          setError(reason instanceof Error ? reason.message : "Unable to join live room");
        }
      }
    };

    void connect();
    return () => {
      cancelled = true;
      roomRef.current = null;
      if (joinedRoom) void joinedRoom.leave();
    };
  }, [attempt, clientName]);

  const roll = useCallback((sides: number, modifier: number) => {
    setError(null);
    roomRef.current?.send(MESSAGE.roll, { sides, modifier });
  }, []);

  const presentScene = useCallback((sceneId: string) => {
    setError(null);
    roomRef.current?.send(MESSAGE.presentScene, { sceneId });
  }, []);

  const adjustHp = useCallback((delta: number) => {
    setError(null);
    roomRef.current?.send(MESSAGE.adjustHp, { delta });
  }, []);

  const createToken = useCallback((command: {
    sceneId: string; kind: "player" | "npc" | "object"; label: string; x: number; y: number; claim?: boolean;
  }) => {
    setError(null);
    roomRef.current?.send(MESSAGE.createToken, command);
  }, []);

  const moveToken = useCallback((tokenId: string, x: number, y: number) => {
    setError(null);
    roomRef.current?.send(MESSAGE.moveToken, { tokenId, x, y });
  }, []);

  const setFogEnabled = useCallback((sceneId: string, enabled: boolean) => {
    setError(null);
    roomRef.current?.send(MESSAGE.setFogEnabled, { sceneId, enabled });
  }, []);

  const setFogCell = useCallback((sceneId: string, column: number, row: number, revealed: boolean) => {
    setError(null);
    roomRef.current?.send(MESSAGE.setFogCell, { sceneId, column, row, revealed });
  }, []);

  return {
    state,
    status,
    error,
    clientName,
    roll,
    adjustHp,
    presentScene,
    createToken,
    moveToken,
    setFogEnabled,
    setFogCell,
    reconnect: () => setAttempt((value) => value + 1)
  };
}
