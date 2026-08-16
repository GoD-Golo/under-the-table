import { useMemo, useState, type FormEvent } from "react";
import {
  DND2024_ABILITIES, DND2024_BACKGROUNDS, DND2024_CLASSES, DND2024_CLASS_SAVES, DND2024_SKILLS, DND2024_SPECIES, DND2024_WEAPON_TEMPLATES,
  abilityModifier, defaultArmorClass, proficiencyBonus, readDnd2024Data, suggestedMaxHp,
  type Dnd2024Ability, type Dnd2024AbilityScores, type Dnd2024Attack, type Dnd2024CharacterData, type Dnd2024Class, type Dnd2024Skill
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
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function attackId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `attack-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function initialData(character?: LiveCharacterView | null): Dnd2024CharacterData {
  const existing = character ? readDnd2024Data(character.rulesetData) : null;
  if (existing) return existing;
  const abilities = CLASS_ARRAYS.fighter;
  return {
    version: 2, classId: "fighter", species: "human", background: "soldier", level: 1,
    abilities, armorClass: defaultArmorClass(abilities.dexterity), speed: 30, notes: "", skillProficiencies: [], attacks: []
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
  const [skillProficiencies, setSkillProficiencies] = useState<Dnd2024Skill[]>(initial.skillProficiencies);
  const [attacks, setAttacks] = useState<Dnd2024Attack[]>(initial.attacks);
  const [weaponTemplate, setWeaponTemplate] = useState(0);

  const suggestedHp = useMemo(() => suggestedMaxHp(classId, level, abilities.constitution), [abilities.constitution, classId, level]);
  const baseAc = useMemo(() => defaultArmorClass(abilities.dexterity), [abilities.dexterity]);
  const pb = proficiencyBonus(level);
  const initiative = abilityModifier(abilities.dexterity);
  const saveProficiencies = DND2024_CLASS_SAVES[classId];

  const setAbility = (ability: keyof Dnd2024AbilityScores, value: number) => {
    setAbilities((current) => ({ ...current, [ability]: Math.max(1, Math.min(30, Math.trunc(value || 1))) }));
  };
  const applyClassArray = () => {
    const next = { ...CLASS_ARRAYS[classId] };
    setAbilities(next); setArmorClass(defaultArmorClass(next.dexterity)); setMaxHp(suggestedMaxHp(classId, level, next.constitution));
  };
  const toggleSkill = (skill: Dnd2024Skill) => setSkillProficiencies((current) => current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]);
  const addWeapon = () => {
    const template = DND2024_WEAPON_TEMPLATES[weaponTemplate];
    if (!template) return;
    setAttacks((current) => [...current, { ...template, id: attackId(), proficient: true }]);
  };
  const updateAttack = (id: string, patch: Partial<Dnd2024Attack>) => setAttacks((current) => current.map((attack) => attack.id === id ? { ...attack, ...patch } : attack));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(), maxHp,
      rulesetData: { version: 2, classId, species, background, level, abilities, armorClass, speed, notes, skillProficiencies, attacks }
    });
  };

  return <form className="character-builder" onSubmit={submit}>
    <div className="builder-heading">
      <div><span className="sheet-kicker">D&D 2024 · playable sheet</span><h2>{character ? `Build ${character.name}` : "Create adventurer"}</h2></div>
      <div className="builder-derived"><span>PB <strong>+{pb}</strong></span><span>Init <strong>{initiative >= 0 ? "+" : ""}{initiative}</strong></span><span>AC <strong>{armorClass}</strong></span></div>
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
        {DND2024_ABILITIES.map((ability) => <label className="ability-editor" key={ability}><span>{ability.slice(0, 3).toUpperCase()}</span><input type="number" min={1} max={30} value={abilities[ability]} onChange={(event) => setAbility(ability, Number(event.target.value))} /><strong>{abilityModifier(abilities[ability]) >= 0 ? "+" : ""}{abilityModifier(abilities[ability])}</strong></label>)}
      </div>
      <div className="save-proficiency-line"><span>Class saves</span>{saveProficiencies.map((ability) => <strong key={ability}>{ability.slice(0, 3).toUpperCase()}</strong>)}</div>
    </section>

    <section className="builder-section">
      <div className="builder-section-head"><div><span className="sheet-kicker">Proficiencies</span><h3>Skills</h3></div><small>{skillProficiencies.length} selected</small></div>
      <p className="widget-note">Select the proficiencies produced by your background/class choices. Exact choice-source enforcement comes after MVP.</p>
      <div className="skill-builder-grid">
        {DND2024_SKILLS.map((skill) => <label className={`skill-toggle ${skillProficiencies.includes(skill.id) ? "active" : ""}`} key={skill.id}>
          <input type="checkbox" checked={skillProficiencies.includes(skill.id)} onChange={() => toggleSkill(skill.id)} />
          <span>{labelize(skill.id)}</span><small>{skill.ability.slice(0, 3).toUpperCase()}</small>
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

    <section className="builder-section">
      <div className="builder-section-head"><div><span className="sheet-kicker">Actions</span><h3>Basic attacks</h3></div></div>
      <div className="weapon-template-row"><select value={weaponTemplate} onChange={(event) => setWeaponTemplate(Number(event.target.value))}>{DND2024_WEAPON_TEMPLATES.map((weapon, index) => <option value={index} key={`${weapon.name}-${index}`}>{weapon.name} · {weapon.damageDiceCount}d{weapon.damageDie}</option>)}</select><button className="ghost-button" type="button" onClick={addWeapon}>+ Add weapon</button></div>
      <div className="attack-builder-list">
        {attacks.map((attack) => <div className="attack-builder-row" key={attack.id}>
          <input aria-label="Attack name" value={attack.name} onChange={(event) => updateAttack(attack.id, { name: event.target.value })} maxLength={80} />
          <select aria-label="Attack ability" value={attack.ability} onChange={(event) => updateAttack(attack.id, { ability: event.target.value as Dnd2024Ability })}>{DND2024_ABILITIES.map((ability) => <option value={ability} key={ability}>{ability.slice(0, 3).toUpperCase()}</option>)}</select>
          <label className="inline-check"><input type="checkbox" checked={attack.proficient} onChange={(event) => updateAttack(attack.id, { proficient: event.target.checked })} /> proficient</label>
          <input aria-label="Damage dice count" type="number" min={1} max={10} value={attack.damageDiceCount} onChange={(event) => updateAttack(attack.id, { damageDiceCount: Math.max(1, Math.min(10, Number(event.target.value))) })} />
          <select aria-label="Damage die" value={attack.damageDie} onChange={(event) => updateAttack(attack.id, { damageDie: Number(event.target.value) as Dnd2024Attack["damageDie"] })}>{[4, 6, 8, 10, 12].map((die) => <option value={die} key={die}>d{die}</option>)}</select>
          <input aria-label="Damage type" value={attack.damageType} onChange={(event) => updateAttack(attack.id, { damageType: event.target.value })} maxLength={40} />
          <label className="inline-check"><input type="checkbox" checked={attack.addAbilityModifier} onChange={(event) => updateAttack(attack.id, { addAbilityModifier: event.target.checked })} /> + ability</label>
          <input aria-label="Attack range" value={attack.range} onChange={(event) => updateAttack(attack.id, { range: event.target.value })} maxLength={80} />
          <button type="button" className="inline-link danger-link" onClick={() => setAttacks((current) => current.filter((item) => item.id !== attack.id))}>Remove</button>
        </div>)}
        {!attacks.length ? <p className="empty-state">Add at least one weapon to use the Actions widget in combat.</p> : null}
      </div>
    </section>

    <label className="builder-notes"><span>Notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} placeholder="Concept, traits, equipment notes, reminders…" /></label>
    <p className="widget-note">MVP attacks intentionally stop before mastery, feats and spell effects. Those will use the later Action/Effect engine instead of being custom-coded here.</p>
    <div className="sheet-actions builder-actions"><button type="button" className="ghost-button" onClick={onCancel}>Cancel</button><button type="submit" className="game-button primary" disabled={!name.trim()}>Save playable character</button></div>
  </form>;
}
