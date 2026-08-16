import { useEffect, useState } from "react";
import { useAtlas } from "../atlas.js";
import type { LiveViewState } from "../live-room.js";
import { useOfflineCompanion } from "../offline-companion.js";
import { FreeformSurface, type FreeformItem } from "./FreeformSurface.js";
import { HudGrid } from "./HudGrid.js";
import { SceneCanvas } from "./SceneCanvas.js";
import { useSessionHudWidgets } from "./SessionHudWidgets.js";

type PlayMode = "table" | "companion";
type CompanionSource = "campaign" | "offline";
type MobileWidget = "character" | "dice" | "events";

interface PlayWorkspaceProps {
  campaignState: LiveViewState | null;
  clientName: string;
  connectionStatus: "connecting" | "connected" | "disconnected";
  connectionError: string | null;
  onRoll: (sides: number, modifier: number) => void;
  onAdjustHp: (delta: number) => void;
  onMoveToken: (tokenId: string, x: number, y: number) => void;
  onReconnect: () => void;
}

function loadPlayMode(): PlayMode {
  return window.localStorage.getItem("utt.play.mode.v1") === "companion" ? "companion" : "table";
}

function loadCompanionSource(): CompanionSource {
  return window.localStorage.getItem("utt.play.companion-source.v1") === "offline" ? "offline" : "campaign";
}

function VirtualTable({ state, clientName, onRoll, onAdjustHp, onMoveToken, showHud, resetToken }: {
  state: LiveViewState;
  clientName: string;
  onRoll: (sides: number, modifier: number) => void;
  onAdjustHp: (delta: number) => void;
  onMoveToken: (tokenId: string, x: number, y: number) => void;
  showHud: boolean;
  resetToken: number;
}) {
  const atlas = useAtlas();
  const widgets = useSessionHudWidgets({ state, onRoll, onAdjustHp, authority: "campaign" });
  const [mobileWidget, setMobileWidget] = useState<MobileWidget>("character");
  const scene = atlas.data?.scenes.find((item) => item.id === state.activeSceneId) ?? null;

  useEffect(() => {
    if (atlas.data && state.activeSceneId && !scene) void atlas.refresh();
  }, [atlas.data, atlas.refresh, scene, state.activeSceneId]);

  if (atlas.loading && !scene) return <section className="play-table-loading">Loading active scene…</section>;
  if (!scene) return <section className="play-table-loading"><strong>Active scene unavailable</strong><span>{atlas.error ?? "Waiting for Atlas data."}</span></section>;

  const items: FreeformItem[] = [
    { id: "character", initial: { x: 24, y: 74, width: 330, height: 300, z: 3 }, minWidth: 280, minHeight: 240, node: widgets.character },
    { id: "dice", initial: { x: 382, y: 96, width: 350, height: 330, z: 2 }, minWidth: 300, minHeight: 260, node: widgets.dice },
    { id: "events", initial: { x: 760, y: 60, width: 350, height: 450, z: 1 }, minWidth: 290, minHeight: 280, node: widgets.events }
  ];

  return (
    <section className="play-table-stage">
      <div className="play-scene-title"><span>On table</span><strong>{scene.name}</strong></div>
      <SceneCanvas
        mode="play"
        scene={scene}
        hotspots={[]}
        tokens={state.tokens}
        clientName={clientName}
        selectedHotspotId={null}
        selectedHotspotLore={null}
        onTokenMove={onMoveToken}
      />
      {showHud ? <>
        <FreeformSurface items={items} storageKey="utt.play.table.freeform.v1" resetToken={resetToken} overlay className="play-hud-freeform" />
        <div className="play-mobile-hud">
          <div className="play-mobile-widget">{widgets[mobileWidget]}</div>
          <nav className="play-mobile-dock" aria-label="Live HUD widgets">
            {(["character", "dice", "events"] as MobileWidget[]).map((id) => <button type="button" className={mobileWidget === id ? "active" : ""} key={id} onClick={() => setMobileWidget(id)}>{id === "character" ? "Character" : id === "dice" ? "Dice" : "Log"}</button>)}
          </nav>
        </div>
      </> : null}
    </section>
  );
}

export function PlayWorkspace({ campaignState, clientName, connectionStatus, connectionError, onRoll, onAdjustHp, onMoveToken, onReconnect }: PlayWorkspaceProps) {
  const offline = useOfflineCompanion(campaignState);
  const [mode, setModeState] = useState<PlayMode>(() => loadPlayMode());
  const [companionSource, setCompanionSourceState] = useState<CompanionSource>(() => loadCompanionSource());
  const [showHud, setShowHud] = useState(true);
  const [resetToken, setResetToken] = useState(0);
  useEffect(() => {
    if (companionSource !== "campaign" || campaignState || connectionStatus !== "disconnected") return;
    setCompanionSourceState("offline");
    window.localStorage.setItem("utt.play.companion-source.v1", "offline");
  }, [campaignState, companionSource, connectionStatus]);

  const effectiveSource: CompanionSource = companionSource === "campaign" && campaignState ? "campaign" : "offline";
  const companionState = effectiveSource === "campaign" && campaignState ? campaignState : offline.state;

  const setMode = (next: PlayMode) => { setModeState(next); window.localStorage.setItem("utt.play.mode.v1", next); };
  const setCompanionSource = (next: CompanionSource) => { setCompanionSourceState(next); window.localStorage.setItem("utt.play.companion-source.v1", next); };

  return (
    <main className="play-workspace">
      <header className="play-toolbar">
        <div className="play-mode-switch" role="group" aria-label="Play surface">
          <button type="button" className={mode === "table" ? "active" : ""} disabled={!campaignState} onClick={() => setMode("table")}>Virtual Table</button>
          <button type="button" className={mode === "companion" ? "active" : ""} onClick={() => setMode("companion")}>Companion</button>
        </div>
        <div className="play-toolbar-status"><span className={`status-pip ${connectionStatus}`} /><span>{campaignState ? "Campaign connected" : "No live campaign"}</span></div>
        <div className="play-toolbar-actions">
          {mode === "table" ? <><button type="button" className="ghost-button" onClick={() => setShowHud((value) => !value)}>{showHud ? "Hide HUD" : "Show HUD"}</button>{showHud ? <button type="button" className="ghost-button" onClick={() => setResetToken((value) => value + 1)}>Reset HUD</button> : null}</> : <>
            <div className="companion-source-switch" role="group" aria-label="Companion data source">
              <button type="button" className={effectiveSource === "campaign" ? "active" : ""} disabled={!campaignState} onClick={() => setCompanionSource("campaign")}>Campaign</button>
              <button type="button" className={effectiveSource === "offline" ? "active" : ""} onClick={() => setCompanionSource("offline")}>Offline local</button>
            </div>
            {effectiveSource === "offline" && campaignState ? <button type="button" className="ghost-button" onClick={() => offline.adoptCampaign(campaignState)}>Copy campaign state</button> : null}
            <button type="button" className="ghost-button" onClick={() => setResetToken((value) => value + 1)}>Reset HUD</button>
          </>}
        </div>
      </header>

      {connectionError && !campaignState ? <div className="play-connection-note"><span>{connectionError}</span><button type="button" onClick={onReconnect}>Retry campaign</button></div> : null}

      {mode === "table" ? (
        campaignState ? <VirtualTable state={campaignState} clientName={clientName} onRoll={onRoll} onAdjustHp={onAdjustHp} onMoveToken={onMoveToken} showHud={showHud} resetToken={resetToken} /> : <section className="play-unavailable"><div className="sigil">UTT</div><h1>Virtual Table needs a live campaign</h1><p>Companion can keep running from local state while the campaign is unavailable.</p><button type="button" className="game-button primary" onClick={() => setMode("companion")}>Open Companion</button></section>
      ) : (
        <HudGrid
          state={companionState}
          onRoll={effectiveSource === "campaign" ? onRoll : offline.roll}
          onAdjustHp={effectiveSource === "campaign" ? onAdjustHp : offline.adjustHp}
          layoutResetToken={resetToken}
          authority={effectiveSource}
        />
      )}
    </main>
  );
}
