import { useEffect, useMemo, useState } from "react";
import { readDnd2024Data, type Dnd2024CharacterData } from "@utt/rules-dnd2024";
import type { LiveCharacterView } from "../live-room.js";
import { CharacterBuilder } from "./CharacterBuilder.js";

interface CharacterLibraryProps {
  characters: LiveCharacterView[];
  selectedCharacterId: string | null;
  onSelect: (characterId: string) => void;
  onCreate: (command: { name: string; rulesetId: string; maxHp: number; rulesetData?: Record<string, unknown> }) => void;
  onUpdate: (command: { characterId: string; name: string; maxHp: number; rulesetData: Record<string, unknown> }) => void;
  onClose: () => void;
}

type BuilderMode = { kind: "create" } | { kind: "edit"; characterId: string } | null;

function detail(character: LiveCharacterView): string {
  const data = character.rulesetId === "dnd2024" ? readDnd2024Data(character.rulesetData) : null;
  if (data) return `Level ${data.level} ${data.classId}`;
  return character.rulesetId === "dnd2024" ? "Needs D&D build" : character.rulesetId;
}

export function CharacterLibrary({ characters, selectedCharacterId, onSelect, onCreate, onUpdate, onClose }: CharacterLibraryProps) {
  const [builder, setBuilder] = useState<BuilderMode>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const selected = useMemo(() => characters.find((item) => item.id === selectedCharacterId) ?? characters[0] ?? null, [characters, selectedCharacterId]);
  const edited = builder?.kind === "edit" ? characters.find((item) => item.id === builder.characterId) ?? null : null;

  useEffect(() => {
    if (pendingCount === null || characters.length <= pendingCount) return;
    const created = characters[characters.length - 1];
    if (created) onSelect(created.id);
    setPendingCount(null);
    setCreateError(null);
    setBuilder(null);
  }, [characters, onSelect, pendingCount]);

  useEffect(() => {
    if (pendingCount === null) return;
    const timer = window.setTimeout(() => { setPendingCount(null); setCreateError("Character was not created. Check the live connection and try again."); }, 5000);
    return () => window.clearTimeout(timer);
  }, [pendingCount]);

  const saveBuilder = (payload: { name: string; maxHp: number; rulesetData: Dnd2024CharacterData }) => {
    if (builder?.kind === "edit" && edited) {
      onUpdate({ characterId: edited.id, name: payload.name, maxHp: payload.maxHp, rulesetData: { ...payload.rulesetData } });
      setBuilder(null);
      return;
    }
    setCreateError(null);
    setPendingCount(characters.length);
    onCreate({ name: payload.name, rulesetId: "dnd2024", maxHp: payload.maxHp, rulesetData: { ...payload.rulesetData } });
    setBuilder(null);
  };

  return <div className="sheet-backdrop character-library-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="atlas-sheet character-library character-library-v2" aria-label="Character library" onMouseDown={(event) => event.stopPropagation()}>
      {builder ? <CharacterBuilder character={edited} onSave={saveBuilder} onCancel={() => setBuilder(null)} /> : <>
        <div className="character-library-heading">
          <div><span className="sheet-kicker">Party</span><h2>Character Library</h2><p>Pick a sheet for this device or build a playable D&D 2024 character.</p></div>
          <button className="game-button primary" type="button" onClick={() => setBuilder({ kind: "create" })}>+ New character</button>
        </div>
        {createError ? <p className="form-error">{createError}</p> : null}
        {pendingCount !== null ? <p className="widget-note">Creating character in the live campaign…</p> : null}
        <div className="character-library-list">
          {characters.map((character) => {
            const hp = character.resources.find((resource) => resource.key === "hp");
            return <button type="button" key={character.id} className={`character-library-item ${character.id === selected?.id ? "active" : ""}`} onClick={() => onSelect(character.id)}>
              <strong>{character.name}</strong><span>{detail(character)}</span><small>{hp ? `${hp.current} / ${hp.max} HP` : "No HP resource"}</small>
            </button>;
          })}
        </div>
        {selected ? <div className="character-library-footer">
          <div><span className="sheet-kicker">Selected on this device</span><strong>{selected.name}</strong><small>{detail(selected)}</small></div>
          {selected.rulesetId === "dnd2024" ? <button className="ghost-button" type="button" onClick={() => setBuilder({ kind: "edit", characterId: selected.id })}>{readDnd2024Data(selected.rulesetData) ? "Edit build" : "Finish build"}</button> : null}
        </div> : null}
        <div className="sheet-actions"><button type="button" className="ghost-button" onClick={onClose}>Close</button></div>
      </>}
    </section>
  </div>;
}
