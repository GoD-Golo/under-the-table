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


export interface LiveCharacterResourceView {
  id: string;
  key: string;
  label: string;
  current: number;
  max: number;
}

export interface LiveCharacterView {
  id: string;
  name: string;
  rulesetId: string;
  schemaVersion: number;
  rulesetData: Record<string, unknown>;
  resources: LiveCharacterResourceView[];
}


export interface LiveInitiativeEntryView {
  id: string;
  label: string;
  score: number;
  characterId: string | null;
  armorClass: number | null;
  currentHp: number | null;
  maxHp: number | null;
}

export interface LiveViewState {
  sessionId: string;
  characters: LiveCharacterView[];
  connectedPlayers: number;
  eventSequence: number;
  activeSceneId: string;
  tokens: LiveTokenView[];
  fogEnabled: boolean;
  fogRevealedCells: string[];
  initiative: { round: number; activeIndex: number; entries: LiveInitiativeEntryView[] };
  latestRoll: { sides: number; natural: number; modifier: number; total: number } | null;
  events: Array<{ sequence: number; kind: string; actor: string; summary: string; at: string }>;
}

function snapshot(state: LiveRoomState): LiveViewState {
  return {
    sessionId: state.sessionId,
    characters: Array.from(state.characters.values()).map((character) => ({
      id: character.id, name: character.name, rulesetId: character.rulesetId, schemaVersion: character.schemaVersion,
      rulesetData: (() => { try { return JSON.parse(character.rulesetDataJson) as Record<string, unknown>; } catch { return {}; } })(),
      resources: Array.from(character.resources.values()).map((resource) => ({
        id: resource.id, key: resource.key, label: resource.label, current: resource.current, max: resource.max
      }))
    })),
    connectedPlayers: state.connectedPlayers,
    eventSequence: state.eventSequence,
    activeSceneId: state.activeSceneId,
    tokens: Array.from(state.tokens.values()).map((token) => ({
      id: token.id, sceneId: token.sceneId, kind: token.kind as LiveTokenView["kind"], label: token.label,
      x: token.x, y: token.y, controllerName: token.controllerName || null
    })),
    fogEnabled: state.fogEnabled,
    fogRevealedCells: Array.from(state.fogRevealedCells),
    initiative: {
      round: state.initiativeRound, activeIndex: state.initiativeActiveIndex,
      entries: Array.from(state.initiativeEntries).map((entry) => ({ id: entry.id, label: entry.label, score: entry.score, characterId: entry.characterId || null, armorClass: entry.armorClass > 0 ? entry.armorClass : null, currentHp: entry.maxHp > 0 ? entry.currentHp : null, maxHp: entry.maxHp > 0 ? entry.maxHp : null }))
    },
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

const HEARTBEAT_INTERVAL_MS = 2000;
const HEARTBEAT_TIMEOUT_MS = 6000;

type LiveCommandType = (typeof MESSAGE)[Exclude<keyof typeof MESSAGE, "heartbeat">];

export function useLiveRoom() {
  const [state, setState] = useState<LiveViewState | null>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const roomRef = useRef<Room<LiveRoomState> | null>(null);
  const clientName = useMemo(getClientName, []);

  useEffect(() => {
    let cancelled = false;
    let joinedRoom: Room<LiveRoomState> | null = null;
    let heartbeatTimer: number | null = null;
    let removeRuntimeListeners: (() => void) | null = null;
    let heartbeatAckAt = Date.now();
    setState(null);
    setStatus("connecting");
    setConnectionError(null);
    setCommandError(null);

    const stopLivenessTracking = () => {
      if (heartbeatTimer !== null) {
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      removeRuntimeListeners?.();
      removeRuntimeListeners = null;
    };

    const markDisconnected = (message: string, room: Room<LiveRoomState>) => {
      if (cancelled || roomRef.current !== room) return;
      roomRef.current = null;
      stopLivenessTracking();
      setState(null);
      setStatus("disconnected");
      setConnectionError(message);
      setCommandError(null);
    };

    const connect = async () => {
      try {
        const client = new Client(endpoint());
        const room = await client.joinOrCreate(ROOM_NAME, { clientName }, LiveRoomState);
        if (cancelled) {
          await room.leave(false);
          return;
        }
        room.reconnection.enabled = false;
        joinedRoom = room;
        roomRef.current = room;
        heartbeatAckAt = Date.now();
        setState(snapshot(room.state));
        setStatus("connected");
        setConnectionError(null);

        const sendHeartbeat = (resetDeadline = false) => {
          if (cancelled || roomRef.current !== room || document.visibilityState === "hidden") return;
          if (!room.connection.isOpen) {
            markDisconnected("Live session disconnected. Retry to rejoin.", room);
            return;
          }
          const now = Date.now();
          if (resetDeadline) heartbeatAckAt = now;
          if (!resetDeadline && now - heartbeatAckAt >= HEARTBEAT_TIMEOUT_MS) {
            markDisconnected("Live session stopped responding. Retry to rejoin.", room);
            void room.leave(false);
            return;
          }
          room.send(MESSAGE.heartbeat, { nonce: `${now.toString(36)}-${randomClientSuffix()}` });
        };
        const onVisibilityChange = () => {
          if (document.visibilityState === "visible") sendHeartbeat(true);
        };
        const onOffline = () => {
          markDisconnected("Network connection is offline. Retry when connectivity returns.", room);
          void room.leave(false);
        };

        room.onStateChange((next) => {
          if (!cancelled && roomRef.current === room) setState(snapshot(next));
        });
        room.onMessage(SERVER_MESSAGE.commandError, (message: CommandErrorMessage) => {
          if (!cancelled && roomRef.current === room) setCommandError(message.message);
        });
        room.onMessage(SERVER_MESSAGE.heartbeat, () => {
          if (!cancelled && roomRef.current === room) heartbeatAckAt = Date.now();
        });
        room.onLeave(() => markDisconnected("Live session disconnected. Retry to rejoin.", room));
        room.onError((_code, message) => {
          if (!cancelled && roomRef.current === room) setConnectionError(message ?? "Room connection error");
        });
        document.addEventListener("visibilitychange", onVisibilityChange);
        window.addEventListener("offline", onOffline);
        removeRuntimeListeners = () => {
          document.removeEventListener("visibilitychange", onVisibilityChange);
          window.removeEventListener("offline", onOffline);
        };
        heartbeatTimer = window.setInterval(() => sendHeartbeat(false), HEARTBEAT_INTERVAL_MS);
        sendHeartbeat(true);
      } catch (reason) {
        if (!cancelled) {
          roomRef.current = null;
          setState(null);
          setStatus("disconnected");
          setConnectionError(reason instanceof Error ? reason.message : "Unable to join live room");
        }
      }
    };

    void connect();
    return () => {
      cancelled = true;
      roomRef.current = null;
      stopLivenessTracking();
      if (joinedRoom?.connection.isOpen) void joinedRoom.leave(false);
    };
  }, [attempt, clientName]);

  const sendCommand = useCallback((type: LiveCommandType, payload: object) => {
    const room = roomRef.current;
    if (!room || !room.connection.isOpen) {
      setCommandError("Live session is unavailable. Retry the campaign connection.");
      return;
    }
    setCommandError(null);
    try {
      room.send(type, payload);
    } catch (reason) {
      setCommandError(reason instanceof Error ? reason.message : "Unable to send live command");
    }
  }, []);

  const roll = useCallback((sides: number, modifier: number) => {
    sendCommand(MESSAGE.roll, { sides, modifier });
  }, [sendCommand]);

  const presentScene = useCallback((sceneId: string) => {
    sendCommand(MESSAGE.presentScene, { sceneId });
  }, [sendCommand]);

  const adjustHp = useCallback((characterId: string, delta: number) => {
    sendCommand(MESSAGE.adjustHp, { characterId, delta });
  }, [sendCommand]);

  const createToken = useCallback((command: {
    sceneId: string; kind: "player" | "npc" | "object"; label: string; x: number; y: number; claim?: boolean;
  }) => {
    sendCommand(MESSAGE.createToken, command);
  }, [sendCommand]);

  const moveToken = useCallback((tokenId: string, x: number, y: number) => {
    sendCommand(MESSAGE.moveToken, { tokenId, x, y });
  }, [sendCommand]);

  const setFogEnabled = useCallback((sceneId: string, enabled: boolean) => {
    sendCommand(MESSAGE.setFogEnabled, { sceneId, enabled });
  }, [sendCommand]);

  const setFogCell = useCallback((sceneId: string, column: number, row: number, revealed: boolean) => {
    sendCommand(MESSAGE.setFogCell, { sceneId, column, row, revealed });
  }, [sendCommand]);

  const rollInitiative = useCallback((command: { characterId?: string; label?: string; modifier?: number; armorClass?: number; maxHp?: number }) => {
    sendCommand(MESSAGE.rollInitiative, command);
  }, [sendCommand]);

  const advanceInitiative = useCallback(() => {
    sendCommand(MESSAGE.advanceInitiative, {});
  }, [sendCommand]);

  const clearInitiative = useCallback(() => {
    sendCommand(MESSAGE.clearInitiative, {});
  }, [sendCommand]);

  const performBasicAttack = useCallback((command: { attackerCharacterId: string; attackId: string; targetEntryId: string }) => {
    sendCommand(MESSAGE.performBasicAttack, command);
  }, [sendCommand]);

  return {
    state,
    status,
    error: connectionError ?? commandError,
    connectionError,
    commandError,
    clientName,
    roll,
    adjustHp,
    presentScene,
    createToken,
    moveToken,
    setFogEnabled,
    setFogCell,
    rollInitiative,
    advanceInitiative,
    clearInitiative,
    performBasicAttack,
    dismissCommandError: () => setCommandError(null),
    reconnect: () => setAttempt((value) => value + 1)
  };
}
