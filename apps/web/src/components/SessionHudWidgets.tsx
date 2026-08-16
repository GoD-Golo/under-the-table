import { useMemo, useState, type ReactNode } from "react";
import {
  DND2024_ABILITIES, DND2024_CLASS_SAVES, DND2024_SKILLS, abilityModifier, attackModifier, passivePerception,
  proficiencyBonus, readDnd2024Data, saveModifier, skillModifier
} from "@utt/rules-dnd2024";
import type { LiveCharacterView, LiveInitiativeEntryView, LiveViewState } from "../live-room.js";
import { WidgetFrame } from "./WidgetFrame.js";

export interface SessionHudOptions {
  state: LiveViewState;
  selectedCharacterId: string | null;
  onSelectCharacter: (characterId: string) => void;
  onRoll: (sides: number, modifier: number) => void;
  onAdjustHp: (characterId: string, delta: number) => void;
  onRollInitiative?: ((command: { characterId?: string; label?: string; modifier?: number; armorClass?: number; maxHp?: number }) => void) | undefined;
  onAdvanceInitiative?: (() => void) | undefined;
  onClearInitiative?: (() => void) | undefined;
  onPerformBasicAttack?: ((command: { attackerCharacterId: string; attackId: string; targetEntryId: string }) => void) | undefined;
  authority: "campaign" | "offline";
}

function selectedCharacter(state: LiveViewState, selectedCharacterId: string | null): LiveCharacterView | null {
  return state.characters.find((character) => character.id === selectedCharacterId) ?? state.characters[0] ?? null;
}

function entryVitals(state: LiveViewState, entry: LiveInitiativeEntryView): { armorClass: number | null; currentHp: number | null; maxHp: number | null } {
  if (!entry.characterId) return { armorClass: entry.armorClass, currentHp: entry.currentHp, maxHp: entry.maxHp };
  const character = state.characters.find((item) => item.id === entry.characterId);
  const dnd = character?.rulesetId === "dnd2024" ? readDnd2024Data(character.rulesetData) : null;
  const hp = character?.resources.find((resource) => resource.key === "hp") ?? null;
  return { armorClass: dnd?.armorClass ?? null, currentHp: hp?.current ?? null, maxHp: hp?.max ?? null };
}

export function useSessionHudWidgets({ state, selectedCharacterId, onSelectCharacter, onRoll, onAdjustHp, onRollInitiative, onAdvanceInitiative, onClearInitiative, onPerformBasicAttack, authority }: SessionHudOptions): Record<string, ReactNode> {
  const [die, setDie] = useState(20);
  const [modifier, setModifier] = useState(5);
  const [checkPanel, setCheckPanel] = useState<"dice" | "saves" | "skills">("dice");
  const [initiativeLabel, setInitiativeLabel] = useState("");
  const [initiativeModifier, setInitiativeModifier] = useState(0);
  const [initiativeArmorClass, setInitiativeArmorClass] = useState(12);
  const [initiativeMaxHp, setInitiativeMaxHp] = useState(10);
  const [targetEntryId, setTargetEntryId] = useState("");
  const character = selectedCharacter(state, selectedCharacterId);
  const hp = character?.resources.find((resource) => resource.key === "hp") ?? null;
  const hpPercent = hp ? Math.round((hp.current / hp.max) * 100) : 0;
  const dnd = character?.rulesetId === "dnd2024" ? readDnd2024Data(character.rulesetData) : null;
  const canRollCharacterInitiative = !!character && (character.rulesetId !== "dnd2024" || !!dnd);
  const authorityNote = authority === "campaign"
    ? "Campaign authoritative. Accepted changes update durable runtime state."
    : "Offline local state. Changes stay on this device and do not sync automatically.";
  const rngMeta = authority === "campaign" ? "Server RNG" : "Local RNG";
  const activeEntry = state.initiative.entries[state.initiative.activeIndex] ?? null;
  const characterTurn = !!character && activeEntry?.characterId === character.id;
  const targets = character ? state.initiative.entries.filter((entry) => entry.characterId !== character.id) : [];
  const effectiveTargetId = targets.some((entry) => entry.id === targetEntryId) ? targetEntryId : targets[0]?.id ?? "";

  return useMemo(() => ({
    character: (
      <WidgetFrame eyebrow="Character" title={character?.name ?? "No character"} meta={dnd ? `Level ${dnd.level} ${dnd.classId}` : character?.rulesetId ?? "unassigned"}>
        {state.characters.length > 1 ? <label className="modifier-control"><span>Character</span><select value={character?.id ?? ""} onChange={(event) => onSelectCharacter(event.target.value)}>{state.characters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
        {dnd ? <>
          <div className="character-derived-strip">
            <span><small>AC</small><strong>{dnd.armorClass}</strong></span>
            <span><small>INIT</small><strong>{abilityModifier(dnd.abilities.dexterity) >= 0 ? "+" : ""}{abilityModifier(dnd.abilities.dexterity)}</strong></span>
            <span><small>PB</small><strong>+{proficiencyBonus(dnd.level)}</strong></span>
            <span><small>PASS</small><strong>{passivePerception(dnd)}</strong></span>
            <span><small>SPD</small><strong>{dnd.speed}</strong></span>
          </div>
          <div className="character-origin-line"><span>{dnd.species}</span><span>{dnd.background}</span></div>
          <div className="ability-check-grid" aria-label="Ability checks">
            {DND2024_ABILITIES.map((ability) => { const mod = abilityModifier(dnd.abilities[ability]); return <button type="button" className="ability-check" key={ability} onClick={() => onRoll(20, mod)}><small>{ability.slice(0, 3).toUpperCase()}</small><strong>{mod >= 0 ? "+" : ""}{mod}</strong></button>; })}
          </div>
        </> : null}
        {character && hp ? <>
          <div className="vital-row"><div><span className="vital-label">Hit points</span><strong className="hp-value">{hp.current}<small> / {hp.max}</small></strong></div><span className="hp-percent">{hpPercent}%</span></div>
          <div className="hp-track"><span style={{ width: `${hpPercent}%` }} /></div>
          <div className="action-cluster" aria-label="Adjust hit points">{[-5, -1, 1, 5].map((delta) => <button className="game-button compact" type="button" key={delta} onClick={() => onAdjustHp(character.id, delta)}>{delta > 0 ? `+${delta}` : delta}</button>)}</div>
        </> : <p className="empty-state">No HP resource is available for this character.</p>}
        <p className="widget-note">{authorityNote}</p>
      </WidgetFrame>
    ),
    dice: (
      <WidgetFrame eyebrow="Checks" title="Dice & tests" meta={rngMeta}>
        <div className="check-tabs" role="tablist">
          {(["dice", "saves", "skills"] as const).map((panel) => <button type="button" className={checkPanel === panel ? "active" : ""} key={panel} onClick={() => setCheckPanel(panel)}>{panel}</button>)}
        </div>
        {checkPanel === "dice" ? <>
          <div className="die-row">{[4, 6, 8, 10, 12, 20, 100].map((sides) => <button className={`die-chip ${die === sides ? "active" : ""}`} type="button" key={sides} onClick={() => setDie(sides)}>d{sides}</button>)}</div>
          <label className="modifier-control"><span>Modifier</span><input type="number" min={-20} max={20} value={modifier} onChange={(event) => setModifier(Number(event.target.value))} /></label>
          <button className="game-button primary roll-button" type="button" onClick={() => onRoll(die, modifier)}>Roll d{die} {modifier >= 0 ? `+${modifier}` : modifier}</button>
        </> : checkPanel === "saves" ? <div className="save-check-grid">
          {dnd ? DND2024_ABILITIES.map((ability) => { const mod = saveModifier(dnd, ability); const proficient = DND2024_CLASS_SAVES[dnd.classId].includes(ability); return <button type="button" className={`check-roll ${proficient ? "proficient" : ""}`} key={ability} onClick={() => onRoll(20, mod)}><span>{ability.slice(0, 3).toUpperCase()}</span><strong>{mod >= 0 ? "+" : ""}{mod}</strong><small>{proficient ? "PROF" : "SAVE"}</small></button>; }) : <p className="empty-state">Finish the D&D build to derive saves.</p>}
        </div> : <div className="skill-check-list">
          {dnd ? DND2024_SKILLS.map((skill) => { const mod = skillModifier(dnd, skill.id); const proficient = dnd.skillProficiencies.includes(skill.id); return <button type="button" className={`skill-roll ${proficient ? "proficient" : ""}`} key={skill.id} onClick={() => onRoll(20, mod)}><span>{skill.id.replaceAll("-", " ")}</span><small>{skill.ability.slice(0, 3).toUpperCase()}</small><strong>{mod >= 0 ? "+" : ""}{mod}</strong></button>; }) : <p className="empty-state">Finish the D&D build to derive skills.</p>}
        </div>}
        <div className="roll-result" aria-live="polite">{state.latestRoll ? <><span>Latest</span><strong>{state.latestRoll.total}</strong><small>d{state.latestRoll.sides}: {state.latestRoll.natural} {state.latestRoll.modifier >= 0 ? "+" : ""}{state.latestRoll.modifier}</small></> : <p>No roll yet. Make the first move.</p>}</div>
      </WidgetFrame>
    ),
    actions: (
      <WidgetFrame eyebrow="Combat" title="Actions" meta={characterTurn ? "Your turn" : activeEntry ? `${activeEntry.label}'s turn` : "Start initiative"}>
        {authority !== "campaign" ? <p className="widget-note">Authoritative attacks are disabled in offline companion mode.</p> : !dnd ? <p className="empty-state">Finish this character's D&D build to use attacks.</p> : !dnd.attacks.length ? <p className="empty-state">Add a weapon in Character Builder to unlock basic attacks.</p> : <>
          <label className="modifier-control"><span>Target</span><select value={effectiveTargetId} onChange={(event) => setTargetEntryId(event.target.value)} disabled={!targets.length}>{targets.length ? targets.map((entry) => { const vitals = entryVitals(state, entry); return <option value={entry.id} key={entry.id}>{entry.label} · AC {vitals.armorClass ?? "?"} · HP {vitals.currentHp ?? "?"}/{vitals.maxHp ?? "?"}</option>; }) : <option value="">No targets in initiative</option>}</select></label>
          <div className="attack-action-list">
            {dnd.attacks.map((attack) => { const hit = attackModifier(dnd, attack); const damageMod = attack.addAbilityModifier ? abilityModifier(dnd.abilities[attack.ability]) : 0; return <button type="button" className="attack-action" key={attack.id} disabled={!characterTurn || !effectiveTargetId || !onPerformBasicAttack || !character} onClick={() => character && onPerformBasicAttack?.({ attackerCharacterId: character.id, attackId: attack.id, targetEntryId: effectiveTargetId })}><div><strong>{attack.name}</strong><small>{attack.range || attack.damageType}</small></div><span><b>{hit >= 0 ? "+" : ""}{hit}</b><small>{attack.damageDiceCount}d{attack.damageDie}{damageMod ? ` ${damageMod >= 0 ? "+" : ""}${damageMod}` : ""} {attack.damageType}</small></span></button>; })}
          </div>
          {!characterTurn ? <p className="widget-note">Basic attacks unlock when this character is the active initiative entry.</p> : null}
        </>}
      </WidgetFrame>
    ),
    initiative: (
      <WidgetFrame eyebrow="Combat" title="Initiative" meta={state.initiative.entries.length ? `Round ${state.initiative.round}` : "Not started"}>
        {authority === "campaign" && onRollInitiative ? <>
          <div className="initiative-actions"><button className="game-button primary" type="button" disabled={!canRollCharacterInitiative} onClick={() => character && onRollInitiative({ characterId: character.id })}>Roll {character?.name ?? "character"}</button><button className="game-button compact" type="button" disabled={!state.initiative.entries.length || !onAdvanceInitiative} onClick={onAdvanceInitiative}>Next turn</button></div>
          {character?.rulesetId === "dnd2024" && !dnd ? <p className="widget-note">Finish this character's D&D build before rolling its initiative.</p> : null}
          <div className="initiative-quick-add">
            <input value={initiativeLabel} onChange={(event) => setInitiativeLabel(event.target.value)} placeholder="NPC / monster" maxLength={80} />
            <input aria-label="Initiative modifier" title="Initiative modifier" type="number" min={-50} max={50} value={initiativeModifier} onChange={(event) => setInitiativeModifier(Number(event.target.value))} />
            <input aria-label="NPC armor class" title="Armor Class" type="number" min={1} max={99} value={initiativeArmorClass} onChange={(event) => setInitiativeArmorClass(Number(event.target.value))} />
            <input aria-label="NPC max HP" title="Max HP" type="number" min={1} max={9999} value={initiativeMaxHp} onChange={(event) => setInitiativeMaxHp(Number(event.target.value))} />
            <button type="button" className="game-button compact" disabled={!initiativeLabel.trim()} onClick={() => { onRollInitiative({ label: initiativeLabel.trim(), modifier: initiativeModifier, armorClass: initiativeArmorClass, maxHp: initiativeMaxHp }); setInitiativeLabel(""); }}>Roll</button>
          </div>
          <div className="initiative-field-hints"><span>Name</span><span>Init</span><span>AC</span><span>HP</span><span /></div>
        </> : <p className="widget-note">Initiative is campaign-authoritative and stays disabled in offline companion mode.</p>}
        <div className="initiative-list">
          {state.initiative.entries.map((entry, index) => { const vitals = entryVitals(state, entry); return <div className={`initiative-entry ${index === state.initiative.activeIndex ? "active" : ""}`} key={entry.id}><span>{index === state.initiative.activeIndex ? "▶" : ""}</span><div><strong>{entry.label}</strong><small>AC {vitals.armorClass ?? "?"} · HP {vitals.currentHp ?? "?"}/{vitals.maxHp ?? "?"}</small></div><b>{entry.score}</b></div>; })}
          {!state.initiative.entries.length ? <p className="empty-state">Roll a character or quick-add an NPC to start combat.</p> : null}
        </div>
        {authority === "campaign" && state.initiative.entries.length ? <button type="button" className="inline-link danger-link" disabled={!onClearInitiative} onClick={onClearInitiative}>Clear combat</button> : null}
      </WidgetFrame>
    ),
    events: (
      <WidgetFrame eyebrow={authority === "campaign" ? "Live feed" : "Local feed"} title="Table log" meta={`${state.eventSequence} events`}>
        <div className="event-list" role="log" aria-live="polite">
          {[...state.events].reverse().map((event) => <article className="event-row" key={event.sequence}><span className={`event-icon ${event.kind}`}>{event.kind === "roll" ? "◆" : event.kind === "hp" ? "♥" : event.kind === "initiative" ? "⚔" : event.kind === "attack" ? "✦" : "↪"}</span><div><p>{event.summary}</p><small>#{event.sequence} · {new Date(event.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</small></div></article>)}
          {state.events.length === 0 ? <p className="empty-state">The table is quiet. Roll or change HP to create the first event.</p> : null}
        </div>
      </WidgetFrame>
    )
  }), [activeEntry, authority, authorityNote, canRollCharacterInitiative, character, characterTurn, checkPanel, die, dnd, effectiveTargetId, hp, hpPercent, initiativeArmorClass, initiativeLabel, initiativeMaxHp, initiativeModifier, modifier, onAdjustHp, onAdvanceInitiative, onClearInitiative, onPerformBasicAttack, onRoll, onRollInitiative, onSelectCharacter, rngMeta, state, targets]);
}
