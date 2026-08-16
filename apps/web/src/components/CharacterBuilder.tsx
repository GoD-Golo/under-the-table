import { useMemo, useState, type FormEvent } from "react";
import {
  DND2024_ABILITIES, DND2024_BACKGROUNDS, DND2024_CLASSES, DND2024_SPECIES,
  abilityModifier, defaultArmorClass, isDnd2024Data, proficiencyBonus, suggestedMaxHp,
  type Dnd2024AbilityScores, type Dnd2024CharacterData, type Dnd2024Class
} from "@utt/rules-dnd2024";
import type { LiveCharacterView } from "../live-room.js";

const CLASS_ARRAYS: Record<Dnd2024Class, Dnd2024AbilityScores> = {
  barbarian: { strength: 15, dexterity: 13, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
  bard: { strength: 8, dexterity: 14, constitution: 12, intelligence: 13, wisdom: 10, charisma: 15 },
  cleric: { strength: 14, dexterity: 8, constitution: 13, intelligence: 10, wisdom: 15, charisma: 12 },
  druid: { strength: 8, dexterity: 12, constitution: 14, intelligence: 13, wisdom: 15, charisma: 10 },
  fighter: { strength: 15, dexterity: 14, constitution: 13, intelligence: 8, wisdom: 10, charisma: 12 },
  monk: { strength: 12, dexterity: 15, constitution: 13, intelligence: 10, wisdom: 14, charisma: 8 },
  paladin: { strength: 15, dexterity: 10, constitution: 13, intelligence: 8, wisdom: 12, charisma: 14 },
  ranger: { strength: 12, dexterity: 15, constitution: 13, intelligence: 8, wisdom: 14, charisma: 10 },
  rogue: { strength: 12, dexterity: 15, constitution: 13, intelligence: 14, wisdom: 10, charisma: 8 },
  sorcerer: { strength: 10, dexterity: 13, constitution: 14, intelligence: 8, wisdom: 12, charisma: 15 },
  warlock: { strength: 8, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 15 },
  wizard: { strength: 8, dexterity: 12, constitution: 13, intelligence: 15, wisdom: 14, charisma: 10 }
};

interface BuilderProps {
  character?: LiveCharacterView | null;
  onSave: (command: { name: string; maxHp: number; rulesetData: Dnd2024CharacterData }) => void;
  onCancel: () => void;
}

function labelize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function initialData(character?: LiveCharacterView | null): Dnd2024CharacterData {
  if (character && isDnd2024Data(character.rulesetData)) return character.rulesetData;
  const abilities = CLASS_ARRAYS.fighter;
  return {
    version: 1, classId: "fighter", species: "human", background: "soldier", level: 1,
    abilities, armorClass: defaultArmorClass(abilities.dexterity), speed: 30, notes: ""
  };
}

export function CharacterBuilder({ character, onSave, onCancel }: BuilderProps) {
  const initial = initialData(character);
  const existingHp = character?.resources.find((resource) => resource.key === "hp");
  const [name, setName] = useState(character?.name ?? "");
  const [classId, setClassId] = useState<Dnd2024Class>(initial.classId);
  const [species, setSpecies] = useState(initial.species);
  const [background, setBackground] = useState(initial.background);
  const [level, setLevel] = useState(initial.level);
  const [abilities, setAbilities] = useState<Dnd2024AbilityScores>(initial.abilities);
  const [armorClass, setArmorClass] = useState(initial.armorClass);
  const [speed, setSpeed] = useState(initial.speed);
  const [maxHp, setMaxHp] = useState(existingHp?.max ?? suggestedMaxHp(initial.classId, initial.level, initial.abilities.constitution));
  const [notes, setNotes] = useState(initial.notes);

  const suggestedHp = useMemo(() => suggestedMaxHp(classId, level, abilities.constitution), [abilities.constitution, classId, level]);
  const baseAc = useMemo(() => defaultArmorClass(abilities.dexterity), [abilities.dexterity]);
  const pb = proficiencyBonus(level);
  const initiative = abilityModifier(abilities.dexterity);

  const setAbility = (ability: keyof Dnd2024AbilityScores, value: number) => {
    setAbilities((current) => ({ ...current, [ability]: Math.max(1, Math.min(30, Math.trunc(value || 1))) }));
  };

  const applyClassArray = () => {
    const next = { ...CLASS_ARRAYS[classId] };
    setAbilities(next);
    setArmorClass(defaultArmorClass(next.dexterity));
    setMaxHp(suggestedMaxHp(classId, level, next.constitution));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(), maxHp,
      rulesetData: { version: 1, classId, species, background, level, abilities, armorClass, speed, notes }
    });
  };

  return <form className="character-builder" onSubmit={submit}>
    <div className="builder-heading">
      <div><span className="sheet-kicker">D&D 2024 · playable sheet</span><h2>{character ? `Build ${character.name}` : "Create adventurer"}</h2></div>
      <div className="builder-derived"><span>PB <strong>{pb >= 0 ? `+${pb}` : pb}</strong></span><span>Init <strong>{initiative >= 0 ? `+${initiative}` : initiative}</strong></span><span>AC <strong>{armorClass}</strong></span></div>
    </div>

    <div className="builder-grid builder-identity-grid">
      <label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Adventurer name" /></label>
      <label><span>Class</span><select value={classId} onChange={(event) => setClassId(event.target.value as Dnd2024Class)}>{DND2024_CLASSES.map((item) => <option value={item} key={item}>{labelize(item)}</option>)}</select></label>
      <label><span>Level</span><input type="number" min={1} max={20} value={level} onChange={(event) => setLevel(Math.max(1, Math.min(20, Number(event.target.value))))} /></label>
      <label><span>Species</span><select value={species} onChange={(event) => setSpecies(event.target.value)}>{DND2024_SPECIES.map((item) => <option value={item} key={item}>{labelize(item)}</option>)}</select></label>
      <label><span>Background</span><select value={background} onChange={(event) => setBackground(event.target.value)}>{DND2024_BACKGROUNDS.map((item) => <option value={item} key={item}>{labelize(item)}</option>)}</select></label>
    </div>

    <section className="builder-section">
      <div className="builder-section-head"><div><span className="sheet-kicker">Ability scores</span><h3>Core stats</h3></div><button className="ghost-button" type="button" onClick={applyClassArray}>Use {labelize(classId)} standard array</button></div>
      <p className="widget-note">Enter final ability scores after background adjustments. Modifiers are derived automatically.</p>
      <div className="ability-editor-grid">
        {DND2024_ABILITIES.map((ability) => <label className="ability-editor" key={ability}>
          <span>{ability.slice(0, 3).toUpperCase()}</span>
          <input type="number" min={1} max={30} value={abilities[ability]} onChange={(event) => setAbility(ability, Number(event.target.value))} />
          <strong>{abilityModifier(abilities[ability]) >= 0 ? "+" : ""}{abilityModifier(abilities[ability])}</strong>
        </label>)}
      </div>
    </section>

    <section className="builder-section">
      <div className="builder-section-head"><div><span className="sheet-kicker">Combat basics</span><h3>Ready for the table</h3></div></div>
      <div className="builder-grid builder-combat-grid">
        <label><span>Max HP</span><input type="number" min={1} max={9999} value={maxHp} onChange={(event) => setMaxHp(Math.max(1, Number(event.target.value)))} /><small>Fixed-progression suggestion: {suggestedHp}</small><button className="inline-link" type="button" onClick={() => setMaxHp(suggestedHp)}>Use suggestion</button></label>
        <label><span>Armor Class</span><input type="number" min={1} max={99} value={armorClass} onChange={(event) => setArmorClass(Math.max(1, Number(event.target.value)))} /><small>Unarmored baseline: {baseAc}</small><button className="inline-link" type="button" onClick={() => setArmorClass(baseAc)}>Use baseline</button></label>
        <label><span>Speed (ft.)</span><input type="number" min={0} max={999} step={5} value={speed} onChange={(event) => setSpeed(Math.max(0, Number(event.target.value)))} /></label>
      </div>
    </section>

    <label className="builder-notes"><span>Notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} placeholder="Concept, traits, equipment notes, reminders…" /></label>
    <p className="widget-note">This MVP stores identity, final scores and table-facing numbers. Background feats, species traits, class features, inventory and spells will layer on top of the same ruleset data instead of blocking play now.</p>
    <div className="sheet-actions builder-actions"><button type="button" className="ghost-button" onClick={onCancel}>Cancel</button><button type="submit" className="game-button primary" disabled={!name.trim()}>Save playable character</button></div>
  </form>;
}
