import { useCallback, useEffect, useState } from "react";
import type { LiveViewState } from "./live-room.js";

const STORAGE_KEY = "utt.offline.companion.v1";
const MAX_EVENTS = 50;

function localRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) throw new Error("Invalid local die size");
  if (!globalThis.crypto?.getRandomValues) return Math.floor(Math.random() * maxExclusive);
  const range = 0x1_0000_0000;
  const limit = range - (range % maxExclusive);
  const buffer = new Uint32Array(1);
  do globalThis.crypto.getRandomValues(buffer); while ((buffer[0] ?? 0) >= limit);
  return (buffer[0] ?? 0) % maxExclusive;
}

function offlineState(seed: LiveViewState | null, copied = false): LiveViewState {
  const now = new Date().toISOString();
  return {
    sessionId: seed ? `offline-${seed.sessionId}` : "offline-local",
    characterName: seed?.characterName ?? "Offline Adventurer",
    hp: seed?.hp ?? 10,
    maxHp: seed?.maxHp ?? 10,
    connectedPlayers: 1,
    eventSequence: copied ? 1 : 0,
    activeSceneId: "",
    tokens: [],
    fogEnabled: false,
    fogRevealedCells: [],
    latestRoll: null,
    events: copied ? [{ sequence: 1, kind: "offline", actor: "Local", summary: "Copied current campaign character state for offline play", at: now }] : []
  };
}

function loadOffline(seed: LiveViewState | null): LiveViewState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return offlineState(seed);
    const parsed = JSON.parse(raw) as LiveViewState;
    if (typeof parsed.characterName !== "string" || !Number.isFinite(parsed.hp) || !Number.isFinite(parsed.maxHp) || !Array.isArray(parsed.events)) return offlineState(seed);
    return { ...parsed, connectedPlayers: 1, activeSceneId: "", tokens: [] };
  } catch {
    return offlineState(seed);
  }
}

export function useOfflineCompanion(seed: LiveViewState | null) {
  const [state, setState] = useState<LiveViewState>(() => loadOffline(seed));

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const appendEvent = useCallback((kind: string, summary: string, mutate: (current: LiveViewState) => Partial<LiveViewState>) => {
    setState((current) => {
      const sequence = current.eventSequence + 1;
      const event = { sequence, kind, actor: "Local", summary, at: new Date().toISOString() };
      return { ...current, ...mutate(current), eventSequence: sequence, events: [...current.events, event].slice(-MAX_EVENTS) };
    });
  }, []);

  const adjustHp = useCallback((delta: number) => {
    if (!Number.isFinite(delta)) return;
    appendEvent("hp", `${delta >= 0 ? "+" : ""}${delta} HP (offline)`, (current) => ({ hp: Math.max(0, Math.min(current.maxHp, current.hp + delta)) }));
  }, [appendEvent]);

  const roll = useCallback((sides: number, modifier: number) => {
    const natural = localRandomInt(sides) + 1;
    const total = natural + modifier;
    appendEvent("roll", `Rolled d${sides} ${modifier >= 0 ? "+" : ""}${modifier}: ${total} (offline)`, () => ({ latestRoll: { sides, natural, modifier, total } }));
  }, [appendEvent]);

  const adoptCampaign = useCallback((campaign: LiveViewState) => setState(offlineState(campaign, true)), []);

  return { state, adjustHp, roll, adoptCampaign };
}
