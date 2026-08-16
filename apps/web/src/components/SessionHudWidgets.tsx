import { useMemo, useState, type ReactNode } from "react";
import { DND2024_ABILITIES, abilityModifier, isDnd2024Data, proficiencyBonus } from "@utt/rules-dnd2024";
import type { LiveCharacterView, LiveViewState } from "../live-room.js";
import { WidgetFrame } from "./WidgetFrame.js";

export interface SessionHudOptions {
  state: LiveViewState;
  selectedCharacterId: string | null;
  onSelectCharacter: (characterId: string) => void;
  onRoll: (sides: number, modifier: number) => void;
  onAdjustHp: (characterId: string, delta: number) => void;
  onRollInitiative?: ((command: { characterId?: string; label?: string; modifier?: number }) => void) | undefined;
  onAdvanceInitiative?: (() => void) | undefined;
  onClearInitiative?: (() => void) | undefined;
  authority: "campaign" | "offline";
}

function selectedCharacter(state: LiveViewState, selectedCharacterId: string | null): LiveCharacterView | null {
  return state.characters.find((character) => character.id === selectedCharacterId) ?? state.characters[0] ?? null;
}

export function useSessionHudWidgets({ state, selectedCharacterId, onSelectCharacter, onRoll, onAdjustHp, onRollInitiative, onAdvanceInitiative, onClearInitiative, authority }: SessionHudOptions): Record<string, ReactNode> {
  const [die, setDie] = useState(20);
  const [modifier, setModifier] = useState(5);
  const [initiativeLabel, setInitiativeLabel] = useState("");
  const [initiativeModifier, setInitiativeModifier] = useState(0);
  const character = selectedCharacter(state, selectedCharacterId);
  const hp = character?.resources.find((resource) => resource.key === "hp") ?? null;
  const hpPercent = hp ? Math.round((hp.current / hp.max) * 100) : 0;
  const dnd = character?.rulesetId === "dnd2024" && isDnd2024Data(character.rulesetData) ? character.rulesetData : null;
  const canRollCharacterInitiative = !!character && (character.rulesetId !== "dnd2024" || !!dnd);
  const authorityNote = authority === "campaign"
    ? "Campaign authoritative. Accepted changes update this character's durable runtime state."
    : "Offline local state. Changes stay on this device and do not sync automatically.";
  const rngMeta = authority === "campaign" ? "Server RNG" : "Local RNG";

  return useMemo(() => ({
    character: (
      <WidgetFrame eyebrow="Character" title={character?.name ?? "No character"} meta={dnd ? `Level ${dnd.level} ${dnd.classId}` : character?.rulesetId ?? "unassigned"}>
        {state.characters.length > 1 ? (
          <label className="modifier-control"><span>Character</span><select value={character?.id ?? ""} onChange={(event) => onSelectCharacter(event.target.value)}>
            {state.characters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
        ) : null}
        {dnd ? <>
          <div className="character-derived-strip">
            <span><small>AC</small><strong>{dnd.armorClass}</strong></span>
            <span><small>INIT</small><strong>{abilityModifier(dnd.abilities.dexterity) >= 0 ? "+" : ""}{abilityModifier(dnd.abilities.dexterity)}</strong></span>
            <span><small>PB</small><strong>+{proficiencyBonus(dnd.level)}</strong></span>
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
          <div className="action-cluster" aria-label="Adjust hit points">
            {[-5, -1, 1, 5].map((delta) => <button className="game-button compact" type="button" key={delta} onClick={() => onAdjustHp(character.id, delta)}>{delta > 0 ? `+${delta}` : delta}</button>)}
          </div>
        </> : <p className="empty-state">No HP resource is available for this character.</p>}
        <p className="widget-note">{authorityNote}</p>
      </WidgetFrame>
    ),
    dice: (
      <WidgetFrame eyebrow="Action" title="Dice rig" meta={rngMeta}>
        <div className="die-row">{[4, 6, 8, 10, 12, 20, 100].map((sides) => <button className={`die-chip ${die === sides ? "active" : ""}`} type="button" key={sides} onClick={() => setDie(sides)}>d{sides}</button>)}</div>
        <label className="modifier-control"><span>Modifier</span><input type="number" min={-20} max={20} value={modifier} onChange={(event) => setModifier(Number(event.target.value))} /></label>
        <button className="game-button primary roll-button" type="button" onClick={() => onRoll(die, modifier)}>Roll d{die} {modifier >= 0 ? `+${modifier}` : modifier}</button>
        <div className="roll-result" aria-live="polite">{state.latestRoll ? <><span>Latest</span><strong>{state.latestRoll.total}</strong><small>d{state.latestRoll.sides}: {state.latestRoll.natural} {state.latestRoll.modifier >= 0 ? "+" : ""}{state.latestRoll.modifier}</small></> : <p>No roll yet. Make the first move.</p>}</div>
      </WidgetFrame>
    ),
    initiative: (
      <WidgetFrame eyebrow="Combat" title="Initiative" meta={state.initiative.entries.length ? `Round ${state.initiative.round}` : "Not started"}>
        {authority === "campaign" && onRollInitiative ? <>
          <div className="initiative-actions">
            <button className="game-button primary" type="button" disabled={!canRollCharacterInitiative} onClick={() => character && onRollInitiative({ characterId: character.id })}>Roll {character?.name ?? "character"}</button>
            <button className="game-button compact" type="button" disabled={!state.initiative.entries.length || !onAdvanceInitiative} onClick={onAdvanceInitiative}>Next turn</button>
          </div>
          {character?.rulesetId === "dnd2024" && !dnd ? <p className="widget-note">Finish this character's D&D build before rolling its initiative.</p> : null}
          <div className="initiative-quick-add">
            <input value={initiativeLabel} onChange={(event) => setInitiativeLabel(event.target.value)} placeholder="NPC / monster" maxLength={80} />
            <input aria-label="Initiative modifier" type="number" min={-50} max={50} value={initiativeModifier} onChange={(event) => setInitiativeModifier(Number(event.target.value))} />
            <button type="button" className="game-button compact" disabled={!initiativeLabel.trim()} onClick={() => { onRollInitiative({ label: initiativeLabel.trim(), modifier: initiativeModifier }); setInitiativeLabel(""); }}>Roll</button>
          </div>
        </> : <p className="widget-note">Initiative is campaign-authoritative and stays disabled in offline companion mode.</p>}
        <div className="initiative-list">
          {state.initiative.entries.map((entry, index) => <div className={`initiative-entry ${index === state.initiative.activeIndex ? "active" : ""}`} key={entry.id}><span>{index === state.initiative.activeIndex ? "▶" : ""}</span><strong>{entry.label}</strong><b>{entry.score}</b></div>)}
          {!state.initiative.entries.length ? <p className="empty-state">Roll a character or quick-add an NPC to start combat.</p> : null}
        </div>
        {authority === "campaign" && state.initiative.entries.length ? <button type="button" className="inline-link danger-link" disabled={!onClearInitiative} onClick={onClearInitiative}>Clear combat</button> : null}
      </WidgetFrame>
    ),
    events: (
      <WidgetFrame eyebrow={authority === "campaign" ? "Live feed" : "Local feed"} title="Table log" meta={`${state.eventSequence} events`}>
        <div className="event-list" role="log" aria-live="polite">
          {[...state.events].reverse().map((event) => <article className="event-row" key={event.sequence}><span className={`event-icon ${event.kind}`}>{event.kind === "roll" ? "◆" : event.kind === "hp" ? "♥" : event.kind === "initiative" ? "⚔" : "↪"}</span><div><p>{event.summary}</p><small>#{event.sequence} · {new Date(event.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</small></div></article>)}
          {state.events.length === 0 ? <p className="empty-state">The table is quiet. Roll or change HP to create the first event.</p> : null}
        </div>
      </WidgetFrame>
    )
  }), [authority, authorityNote, canRollCharacterInitiative, character, die, dnd, hp, hpPercent, initiativeLabel, initiativeModifier, modifier, onAdjustHp, onAdvanceInitiative, onClearInitiative, onRoll, onRollInitiative, onSelectCharacter, rngMeta, state]);
}
