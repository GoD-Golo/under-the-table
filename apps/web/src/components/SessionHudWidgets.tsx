import { useMemo, useState, type ReactNode } from "react";
import type { LiveViewState } from "../live-room.js";
import { WidgetFrame } from "./WidgetFrame.js";

export interface SessionHudOptions {
  state: LiveViewState;
  onRoll: (sides: number, modifier: number) => void;
  onAdjustHp: (delta: number) => void;
  authority: "campaign" | "offline";
}

export function useSessionHudWidgets({ state, onRoll, onAdjustHp, authority }: SessionHudOptions): Record<string, ReactNode> {
  const [die, setDie] = useState(20);
  const [modifier, setModifier] = useState(5);
  const hpPercent = Math.round((state.hp / state.maxHp) * 100);
  const authorityNote = authority === "campaign"
    ? "Campaign authoritative. Accepted changes become durable session events."
    : "Offline local state. Changes stay on this device and do not sync automatically.";
  const rngMeta = authority === "campaign" ? "Server RNG" : "Local RNG";

  return useMemo(() => ({
    character: (
      <WidgetFrame eyebrow="Character" title={state.characterName} meta={`#${state.sessionId.slice(-3)}`}>
        <div className="vital-row"><div><span className="vital-label">Hit points</span><strong className="hp-value">{state.hp}<small> / {state.maxHp}</small></strong></div><span className="hp-percent">{hpPercent}%</span></div>
        <div className="hp-track"><span style={{ width: `${hpPercent}%` }} /></div>
        <div className="action-cluster" aria-label="Adjust hit points">
          {[-5, -1, 1, 5].map((delta) => <button className="game-button compact" type="button" key={delta} onClick={() => onAdjustHp(delta)}>{delta > 0 ? `+${delta}` : delta}</button>)}
        </div>
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
    events: (
      <WidgetFrame eyebrow={authority === "campaign" ? "Live feed" : "Local feed"} title="Table log" meta={`${state.eventSequence} events`}>
        <div className="event-list" role="log" aria-live="polite">
          {[...state.events].reverse().map((event) => <article className="event-row" key={event.sequence}><span className={`event-icon ${event.kind}`}>{event.kind === "roll" ? "◆" : event.kind === "hp" ? "♥" : "↪"}</span><div><p>{event.summary}</p><small>#{event.sequence} · {new Date(event.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</small></div></article>)}
          {state.events.length === 0 ? <p className="empty-state">The table is quiet. Roll or change HP to create the first event.</p> : null}
        </div>
      </WidgetFrame>
    )
  }), [authority, authorityNote, die, hpPercent, modifier, onAdjustHp, onRoll, rngMeta, state]);
}
