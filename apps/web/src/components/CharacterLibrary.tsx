import { useEffect, useState, type FormEvent } from "react";
import type { LiveCharacterView } from "../live-room.js";

interface CharacterLibraryProps {
  characters: LiveCharacterView[];
  selectedCharacterId: string | null;
  onSelect: (characterId: string) => void;
  onCreate: (command: { name: string; rulesetId: string; maxHp: number }) => void;
  onClose: () => void;
}

export function CharacterLibrary({ characters, selectedCharacterId, onSelect, onCreate, onClose }: CharacterLibraryProps) {
  const [name, setName] = useState("");
  const [rulesetId, setRulesetId] = useState("dnd2024");
  const [maxHp, setMaxHp] = useState(10);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pendingCount === null || characters.length <= pendingCount) return;
    const created = characters[characters.length - 1];
    if (created) onSelect(created.id);
    setPendingCount(null);
    setName("");
  }, [characters, onSelect, pendingCount]);

  useEffect(() => {
    if (pendingCount === null) return;
    const timer = window.setTimeout(() => { setPendingCount(null); setError("Character was not created. Check the campaign connection and try again."); }, 5000);
    return () => window.clearTimeout(timer);
  }, [pendingCount]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || pendingCount !== null) return;
    setError(null);
    setPendingCount(characters.length);
    onCreate({ name: cleanName, rulesetId, maxHp });
  };

  return (
    <div className="sheet-backdrop character-library-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="atlas-sheet character-library" aria-label="Character library" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-kicker">Party foundation</div>
        <h2>Characters</h2>
        <div className="character-library-list">
          {characters.map((character) => {
            const hp = character.resources.find((resource) => resource.key === "hp");
            return <button type="button" key={character.id} className={`character-library-item ${character.id === selectedCharacterId ? "active" : ""}`} onClick={() => onSelect(character.id)}>
              <strong>{character.name}</strong><span>{character.rulesetId}</span><small>{hp ? `${hp.current} / ${hp.max} HP` : "No HP resource"}</small>
            </button>;
          })}
        </div>
        <form className="character-create-form" onSubmit={submit}>
          <div className="sheet-kicker">Minimal create</div>
          <label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="New adventurer" /></label>
          <label><span>Ruleset</span><select value={rulesetId} onChange={(event) => setRulesetId(event.target.value)}><option value="dnd2024">D&D 2024</option><option value="custom">Custom</option></select></label>
          <label><span>Starting max HP</span><input type="number" min={1} max={9999} value={maxHp} onChange={(event) => setMaxHp(Number(event.target.value))} /></label>
          <p className="widget-note">Class, species, background, choices and actions come from the ruleset builder next. Core only creates identity + runtime resources here.</p>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="sheet-actions"><button type="button" className="ghost-button" onClick={onClose}>Close</button><button className="game-button primary" type="submit" disabled={!name.trim() || pendingCount !== null}>{pendingCount !== null ? "Creating…" : "Create character"}</button></div>
        </form>
      </section>
    </div>
  );
}
