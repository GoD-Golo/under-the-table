import { useCallback, useEffect, useState } from "react";
import type { LiveCharacterView, LiveViewState } from "./live-room.js";

const STORAGE_KEY = "utt.offline.companion.v2";
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

function cloneCharacter(character: LiveCharacterView | null): LiveCharacterView {
  if (!character) return {
    id: "offline-adventurer", name: "Offline Adventurer", rulesetId: "custom", schemaVersion: 1, rulesetData: {},
    resources: [{ id: "offline-hp", key: "hp", label: "Hit points", current: 10, max: 10 }]
  };
  return { ...character, resources: character.resources.map((resource) => ({ ...resource })) };
}
function offlineState(seed: LiveViewState | null, selectedCharacterId: string | null, copied = false): LiveViewState {
  const selected = seed?.characters.find((character) => character.id === selectedCharacterId) ?? seed?.characters[0] ?? null;
  const character = cloneCharacter(selected);
  const now = new Date().toISOString();
  return {
    sessionId: seed ? `offline-${seed.sessionId}` : "offline-local",
    characters: [character],
    connectedPlayers: 1,
    eventSequence: copied ? 1 : 0,
    activeSceneId: "",
    tokens: [],
    fogEnabled: false,
    fogRevealedCells: [],
    initiative: { round: 0, activeIndex: -1, entries: [] },
    latestRoll: null,
    events: copied ? [{ sequence: 1, kind: "offline", actor: "Local", summary: `Copied ${character.name} for offline play`, at: now }] : []
  };
}

function loadOffline(seed: LiveViewState | null, selectedCharacterId: string | null): LiveViewState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return offlineState(seed, selectedCharacterId);
    const parsed = JSON.parse(raw) as LiveViewState;
    if (!Array.isArray(parsed.characters) || parsed.characters.length === 0 || !Array.isArray(parsed.events)) return offlineState(seed, selectedCharacterId);
    return { ...parsed, connectedPlayers: 1, activeSceneId: "", tokens: [], fogEnabled: false, fogRevealedCells: [], initiative: parsed.initiative ?? { round: 0, activeIndex: -1, entries: [] } };
  } catch {
    return offlineState(seed, selectedCharacterId);
  }
}
export function useOfflineCompanion(seed: LiveViewState | null, selectedCharacterId: string | null) {
  const [state, setState] = useState<LiveViewState>(() => loadOffline(seed, selectedCharacterId));

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

  const adjustHp = useCallback((characterId: string, delta: number) => {
    if (!Number.isFinite(delta)) return;
    appendEvent("hp", `${delta >= 0 ? "+" : ""}${delta} HP (offline)`, (current) => ({
      characters: current.characters.map((character) => {
        if (character.id !== characterId) return character;
        return { ...character, resources: character.resources.map((resource) => resource.key === "hp"
          ? { ...resource, current: Math.max(0, Math.min(resource.max, resource.current + delta)) }
          : resource) };
      })
    }));
  }, [appendEvent]);
  const roll = useCallback((sides: number, modifier: number) => {
    const natural = localRandomInt(sides) + 1;
    const total = natural + modifier;
    appendEvent("roll", `Rolled d${sides} ${modifier >= 0 ? "+" : ""}${modifier}: ${total} (offline)`, () => ({
      latestRoll: { sides, natural, modifier, total }
    }));
  }, [appendEvent]);

  const adoptCampaign = useCallback((campaign: LiveViewState, characterId: string | null) => {
    setState(offlineState(campaign, characterId, true));
  }, []);

  return { state, adjustHp, roll, adoptCampaign };
}
