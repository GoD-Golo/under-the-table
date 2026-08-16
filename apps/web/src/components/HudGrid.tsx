import { useEffect, useMemo, useState, type ReactNode } from "react";
import ReactGridLayout, { useContainerWidth, verticalCompactor, type Layout } from "react-grid-layout";
import type { LiveViewState } from "../live-room.js";
import { FreeformSurface, type FreeformItem } from "./FreeformSurface.js";
import { WidgetFrame } from "./WidgetFrame.js";

const GRID_LAYOUT_KEY = "utt.vs001.layout";
const MODE_KEY = "utt.hud.layout-mode.v1";

const DEFAULT_GRID_LAYOUT: Layout = [
  { i: "character", x: 0, y: 0, w: 4, h: 7, minW: 3, minH: 6 },
  { i: "dice", x: 4, y: 0, w: 4, h: 7, minW: 3, minH: 6 },
  { i: "events", x: 8, y: 0, w: 4, h: 11, minW: 3, minH: 7 }
];

type HudLayoutMode = "freeform" | "grid";

function loadGridLayout(): Layout {
  try {
    const raw = window.localStorage.getItem(GRID_LAYOUT_KEY);
    if (!raw) return DEFAULT_GRID_LAYOUT;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Layout) : DEFAULT_GRID_LAYOUT;
  } catch {
    return DEFAULT_GRID_LAYOUT;
  }
}

function loadMode(): HudLayoutMode {
  return window.localStorage.getItem(MODE_KEY) === "grid" ? "grid" : "freeform";
}

interface HudGridProps {
  state: LiveViewState;
  onRoll: (sides: number, modifier: number) => void;
  onAdjustHp: (delta: number) => void;
  layoutResetToken: number;
}

export function HudGrid({ state, onRoll, onAdjustHp, layoutResetToken }: HudGridProps) {
  const { width, containerRef, mounted } = useContainerWidth();
  const [gridLayout, setGridLayout] = useState<Layout>(() => loadGridLayout());
  const [layoutMode, setLayoutMode] = useState<HudLayoutMode>(() => loadMode());
  const [die, setDie] = useState(20);
  const [modifier, setModifier] = useState(5);
  const hpPercent = Math.round((state.hp / state.maxHp) * 100);

  useEffect(() => {
    if (layoutResetToken <= 0) return;
    setGridLayout(DEFAULT_GRID_LAYOUT);
    window.localStorage.removeItem(GRID_LAYOUT_KEY);
  }, [layoutResetToken]);

  const setMode = (mode: HudLayoutMode) => {
    setLayoutMode(mode);
    window.localStorage.setItem(MODE_KEY, mode);
  };

  const updateGridLayout = (next: Layout) => {
    setGridLayout(next);
    window.localStorage.setItem(GRID_LAYOUT_KEY, JSON.stringify(next));
  };

  const widgets = useMemo<Record<string, ReactNode>>(() => ({
    character: (
      <WidgetFrame eyebrow="Character" title={state.characterName} meta={`#${state.sessionId.slice(-3)}`}>
        <div className="vital-row">
          <div><span className="vital-label">Hit points</span><strong className="hp-value">{state.hp}<small> / {state.maxHp}</small></strong></div>
          <span className="hp-percent">{hpPercent}%</span>
        </div>
        <div className="hp-track"><span style={{ width: `${hpPercent}%` }} /></div>
        <div className="action-cluster" aria-label="Adjust hit points">
          {[-5, -1, 1, 5].map((delta) => <button className="game-button compact" type="button" key={delta} onClick={() => onAdjustHp(delta)}>{delta > 0 ? `+${delta}` : delta}</button>)}
        </div>
        <p className="widget-note">Server authoritative. Every accepted change becomes a durable event.</p>
      </WidgetFrame>
    ),
    dice: (
      <WidgetFrame eyebrow="Action" title="Dice rig" meta="Server RNG">
        <div className="die-row">
          {[4, 6, 8, 10, 12, 20, 100].map((sides) => <button className={`die-chip ${die === sides ? "active" : ""}`} type="button" key={sides} onClick={() => setDie(sides)}>d{sides}</button>)}
        </div>
        <label className="modifier-control"><span>Modifier</span><input type="number" min={-20} max={20} value={modifier} onChange={(event) => setModifier(Number(event.target.value))} /></label>
        <button className="game-button primary roll-button" type="button" onClick={() => onRoll(die, modifier)}>Roll d{die} {modifier >= 0 ? `+${modifier}` : modifier}</button>
        <div className="roll-result" aria-live="polite">
          {state.latestRoll ? <><span>Latest</span><strong>{state.latestRoll.total}</strong><small>d{state.latestRoll.sides}: {state.latestRoll.natural} {state.latestRoll.modifier >= 0 ? "+" : ""}{state.latestRoll.modifier}</small></> : <p>No roll yet. Make the first move.</p>}
        </div>
      </WidgetFrame>
    ),
    events: (
      <WidgetFrame eyebrow="Live feed" title="Table log" meta={`${state.eventSequence} events`}>
        <div className="event-list" role="log" aria-live="polite">
          {[...state.events].reverse().map((event) => (
            <article className="event-row" key={event.sequence}>
              <span className={`event-icon ${event.kind}`}>{event.kind === "roll" ? "◆" : event.kind === "hp" ? "♥" : "↪"}</span>
              <div><p>{event.summary}</p><small>#{event.sequence} · {new Date(event.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</small></div>
            </article>
          ))}
          {state.events.length === 0 ? <p className="empty-state">The table is quiet. Roll or change HP to create the first event.</p> : null}
        </div>
      </WidgetFrame>
    )
  }), [die, hpPercent, modifier, onAdjustHp, onRoll, state]);

  const freeformItems: FreeformItem[] = [
    { id: "character", initial: { x: 28, y: 64, width: 350, height: 330, z: 2 }, minWidth: 290, minHeight: 260, node: widgets.character },
    { id: "dice", initial: { x: 405, y: 92, width: 390, height: 350, z: 3 }, minWidth: 310, minHeight: 270, node: widgets.dice },
    { id: "events", initial: { x: 830, y: 54, width: 390, height: 530, z: 1 }, minWidth: 300, minHeight: 300, node: widgets.events }
  ];

  return (
    <main className={`hud-stage ${layoutMode === "freeform" ? "freeform-mode" : "grid-mode"}`} ref={containerRef}>
      <div className="stage-grid" aria-hidden="true" />
      <div className="hud-layout-toolbar" role="group" aria-label="HUD layout mode">
        <span>Layout</span>
        <button type="button" className={layoutMode === "freeform" ? "active" : ""} onClick={() => setMode("freeform")}>Free</button>
        <button type="button" className={layoutMode === "grid" ? "active" : ""} onClick={() => setMode("grid")}>Snap grid</button>
      </div>

      {layoutMode === "freeform" ? (
        <FreeformSurface items={freeformItems} storageKey="utt.hud.freeform.v1" resetToken={layoutResetToken} className="hud-freeform" />
      ) : mounted ? (
        <ReactGridLayout
          width={width}
          layout={gridLayout}
          gridConfig={{ cols: 12, rowHeight: 40, margin: [12, 12], containerPadding: [0, 0] }}
          dragConfig={{ enabled: true, handle: ".widget-handle" }}
          resizeConfig={{ enabled: true, handles: ["se", "e", "s"] }}
          compactor={verticalCompactor}
          onLayoutChange={updateGridLayout}
        >
          {Object.entries(widgets).map(([id, node]) => <div key={id} data-widget={id}>{node}</div>)}
        </ReactGridLayout>
      ) : null}
    </main>
  );
}
