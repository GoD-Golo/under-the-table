import { useMemo } from "react";
import { readDnd2024Data } from "@utt/rules-dnd2024";
import type { LiveCharacterView } from "../live-room.js";

interface CharacterLibraryProps {
  characters: LiveCharacterView[];
  selectedCharacterId: string | null;
  onSelect: (characterId: string) => void;
  onClose: () => void;
}

function detail(character: LiveCharacterView): string {
  const data = character.rulesetId === "dnd2024" ? readDnd2024Data(character.rulesetData) : null;
  if (data) return `Level ${data.level} ${data.classId}`;
  return character.rulesetId === "dnd2024" ? "Needs D&D build" : character.rulesetId;
}

export function CharacterLibrary({ characters, selectedCharacterId, onSelect, onClose }: CharacterLibraryProps) {
  const selected = useMemo(
    () => characters.find((item) => item.id === selectedCharacterId) ?? characters[0] ?? null,
    [characters, selectedCharacterId]
  );

  return <div className="sheet-backdrop character-library-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="atlas-sheet character-library character-library-v2" aria-label="Character library" onMouseDown={(event) => event.stopPropagation()}>
      <div className="character-library-heading">
        <div><span className="sheet-kicker">This table</span><h2>Character Library</h2><p>Select which table character this device is playing. Structural builds and progression now live in Characters Home.</p></div>
      </div>
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
      </div> : <p className="widget-note">No campaign character has been added to this Table yet.</p>}
      <div className="sheet-actions"><button type="button" className="ghost-button" onClick={onClose}>Close</button></div>
    </section>
  </div>;
}