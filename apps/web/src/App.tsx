import { useState } from "react";
import { AtlasWorkspace } from "./components/AtlasWorkspace.js";
import { BrandLogo } from "./components/BrandLogo.js";
import { LandingPage } from "./components/LandingPage.js";
import { PlayWorkspace } from "./components/PlayWorkspace.js";
import { useLiveRoom } from "./live-room.js";

type AppView = "landing" | "director" | "play";

function loadView(): AppView {
  if (window.location.hash === "#director") return "director";
  if (window.location.hash === "#play") return "play";
  return "landing";
}

function RuntimeWorkspace({ initialView, onNavigate }: { initialView: "director" | "play"; onNavigate: (view: AppView) => void }) {
  const live = useLiveRoom();
  const [view, setViewState] = useState<"director" | "play">(initialView);
  const [immersivePlay, setImmersivePlay] = useState(false);
  const campaignState = live.status === "connected" ? live.state : null;
  const setView = (next: "director" | "play") => { setViewState(next); window.location.hash = next; };

  return (
    <div className={`app-shell ${immersivePlay ? "immersive-play" : ""}`}>
      {!immersivePlay ? <header className="topbar">
        <button className="brand-lockup brand-home-button" type="button" onClick={() => onNavigate("landing")} aria-label="Back to Under The Table home"><BrandLogo compact /><div><strong>Under The Table</strong><span>MVP Preview · Combat Loop</span></div></button>
        <div className="session-strip"><span className={`status-pip ${live.status}`} /><span>{live.status}</span><span className="divider" /><span>{live.clientName}</span>{campaignState ? <><span className="divider" /><span>{campaignState.connectedPlayers} connected</span></> : null}</div>
        <div className="topbar-actions"><div className="view-switch" aria-label="Workspace view"><button className={view === "director" ? "active" : ""} type="button" onClick={() => setView("director")}>Director</button><button className={view === "play" ? "active" : ""} type="button" onClick={() => setView("play")}>Play</button></div><span className="environment-badge">TAILSCALE DEV</span></div>
      </header> : null}

      {view === "director" && live.error ? <div className="error-banner"><span>{live.error}</span><button type="button" onClick={live.reconnect}>Reconnect</button></div> : null}
      {view === "director" ? (
        campaignState ? <AtlasWorkspace activeSceneId={campaignState.activeSceneId} liveTokens={campaignState.tokens} clientName={live.clientName} tokenRevision={campaignState.events[campaignState.events.length - 1]?.kind.startsWith("token_") ? campaignState.eventSequence : 0} onPresentScene={live.presentScene} onCreateToken={live.createToken} onMoveToken={live.moveToken} fogEnabled={campaignState.fogEnabled} fogRevealedCells={campaignState.fogRevealedCells} onSetFogEnabled={live.setFogEnabled} onSetFogCell={live.setFogCell} /> : <main className="connecting-screen"><div className="sigil">UTT</div><h1>Opening the director table…</h1><p>Director needs the authoritative campaign runtime.</p><button className="game-button primary" type="button" onClick={() => setView("play")}>Use Play offline</button>{live.status === "disconnected" ? <button className="ghost-button" type="button" onClick={live.reconnect}>Try campaign again</button> : null}</main>
      ) : (
        <PlayWorkspace campaignState={campaignState} clientName={live.clientName} connectionStatus={live.status} connectionError={live.error} onRoll={live.roll} onAdjustHp={live.adjustHp} onCreateCharacter={live.createCharacter} onUpdateCharacter={live.updateCharacter} onRollInitiative={live.rollInitiative} onAdvanceInitiative={live.advanceInitiative} onClearInitiative={live.clearInitiative} onPerformBasicAttack={live.performBasicAttack} onMoveToken={live.moveToken} onReconnect={live.reconnect} onImmersiveChange={setImmersivePlay} />
      )}
      {!immersivePlay ? <footer className="footer-note"><span>{view === "director" ? "Director workspace" : "Play workspace"}</span><span>{view === "director" ? "Browse privately · prepare · present" : "Virtual table or physical companion · one session model"}</span></footer> : null}
    </div>
  );
}

export function App() {
  const [view, setView] = useState<AppView>(() => loadView());
  const navigate = (next: AppView) => { setView(next); window.location.hash = next === "landing" ? "" : next; };
  if (view === "landing") return <LandingPage onEnterPlay={() => navigate("play")} onEnterDirector={() => navigate("director")} />;
  return <RuntimeWorkspace key={view} initialView={view} onNavigate={navigate} />;
}
