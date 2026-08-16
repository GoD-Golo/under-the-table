import { useEffect, useState } from "react";
import ReactGridLayout, { useContainerWidth, verticalCompactor, type Layout } from "react-grid-layout";
import type { LiveViewState } from "../live-room.js";
import { FreeformSurface, type FreeformItem } from "./FreeformSurface.js";
import { useSessionHudWidgets } from "./SessionHudWidgets.js";

const GRID_LAYOUT_KEY = "utt.hud.grid.v2";
const MODE_KEY = "utt.hud.layout-mode.v1";

const DEFAULT_GRID_LAYOUT: Layout = [
  { i: "character", x: 0, y: 0, w: 4, h: 12, minW: 3, minH: 9 },
  { i: "dice", x: 4, y: 0, w: 4, h: 7, minW: 3, minH: 6 },
  { i: "initiative", x: 8, y: 0, w: 4, h: 9, minW: 3, minH: 7 },
  { i: "events", x: 4, y: 7, w: 4, h: 11, minW: 3, minH: 7 }
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
  selectedCharacterId: string | null;
  onSelectCharacter: (characterId: string) => void;
  onRoll: (sides: number, modifier: number) => void;
  onAdjustHp: (characterId: string, delta: number) => void;
  onRollInitiative?: ((command: { characterId?: string; label?: string; modifier?: number }) => void) | undefined;
  onAdvanceInitiative?: (() => void) | undefined;
  onClearInitiative?: (() => void) | undefined;
  layoutResetToken: number;
  authority?: "campaign" | "offline";
}

export function HudGrid({ state, selectedCharacterId, onSelectCharacter, onRoll, onAdjustHp, onRollInitiative, onAdvanceInitiative, onClearInitiative, layoutResetToken, authority = "campaign" }: HudGridProps) {
  const { width, containerRef, mounted } = useContainerWidth();
  const [gridLayout, setGridLayout] = useState<Layout>(() => loadGridLayout());
  const [layoutMode, setLayoutMode] = useState<HudLayoutMode>(() => loadMode());
  const widgets = useSessionHudWidgets({ state, selectedCharacterId, onSelectCharacter, onRoll, onAdjustHp, onRollInitiative, onAdvanceInitiative, onClearInitiative, authority });

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

  const freeformItems: FreeformItem[] = [
    { id: "character", initial: { x: 28, y: 64, width: 350, height: 460, z: 2 }, minWidth: 290, minHeight: 360, node: widgets.character },
    { id: "dice", initial: { x: 405, y: 92, width: 360, height: 350, z: 3 }, minWidth: 310, minHeight: 270, node: widgets.dice },
    { id: "initiative", initial: { x: 790, y: 72, width: 360, height: 430, z: 4 }, minWidth: 300, minHeight: 300, node: widgets.initiative },
    { id: "events", initial: { x: 1175, y: 54, width: 390, height: 530, z: 1 }, minWidth: 300, minHeight: 300, node: widgets.events }
  ];

  return (
    <section className={`hud-stage ${layoutMode === "freeform" ? "freeform-mode" : "grid-mode"}`} ref={containerRef}>
      <div className="stage-grid" aria-hidden="true" />
      <div className="hud-layout-toolbar" role="group" aria-label="HUD layout mode">
        <span>Layout</span>
        <button type="button" className={layoutMode === "freeform" ? "active" : ""} onClick={() => setMode("freeform")}>Free</button>
        <button type="button" className={layoutMode === "grid" ? "active" : ""} onClick={() => setMode("grid")}>Snap grid</button>
      </div>

      {layoutMode === "freeform" ? (
        <FreeformSurface items={freeformItems} storageKey="utt.hud.freeform.v2" resetToken={layoutResetToken} className="hud-freeform" />
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
    </section>
  );
}
