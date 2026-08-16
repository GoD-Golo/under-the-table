import { useState } from "react";
import { AtlasWorkspace } from "./components/AtlasWorkspace.js";
import { PlayWorkspace } from "./components/PlayWorkspace.js";
import { useLiveRoom } from "./live-room.js";

type AppView = "director" | "play";

function loadView(): AppView {
  return window.localStorage.getItem("utt.workspace.v1") === "director" ? "director" : "play";
}

export function App() {
  const live = useLiveRoom();
  const [view, setViewState] = useState<AppView>(() => loadView());
  const campaignState = live.status === "connected" ? live.state : null;
  const setView = (next: AppView) => { setViewState(next); window.localStorage.setItem("utt.workspace.v1", next); };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-mark">UTT</span><div><strong>Under The Table</strong><span>Vertical Slice 003.6 · Unified Play</span></div></div>

        <div className="session-strip">
          <span className={`status-pip ${live.status}`} /><span>{live.status}</span><span className="divider" /><span>{live.clientName}</span>
          {campaignState ? <><span className="divider" /><span>{campaignState.connectedPlayers} connected</span></> : null}
        </div>

        <div className="topbar-actions">
          <div className="view-switch" aria-label="Workspace view">
            <button className={view === "director" ? "active" : ""} type="button" onClick={() => setView("director")}>Director</button>
            <button className={view === "play" ? "active" : ""} type="button" onClick={() => setView("play")}>Play</button>
          </div>
          <span className="environment-badge">TAILSCALE DEV</span>
        </div>
      </header>

      {view === "director" && live.error ? <div className="error-banner"><span>{live.error}</span><button type="button" onClick={live.reconnect}>Reconnect</button></div> : null}

      {view === "director" ? (
        campaignState ? <AtlasWorkspace activeSceneId={campaignState.activeSceneId} liveTokens={campaignState.tokens} clientName={live.clientName} tokenRevision={campaignState.events[campaignState.events.length - 1]?.kind.startsWith("token_") ? campaignState.eventSequence : 0} onPresentScene={live.presentScene} onCreateToken={live.createToken} onMoveToken={live.moveToken} /> : <main className="connecting-screen"><div className="sigil">UTT</div><h1>Opening the director table…</h1><p>Director needs the authoritative campaign runtime.</p><button className="game-button primary" type="button" onClick={() => setView("play")}>Use Play offline</button>{live.status === "disconnected" ? <button className="ghost-button" type="button" onClick={live.reconnect}>Try campaign again</button> : null}</main>
      ) : (
        <PlayWorkspace campaignState={campaignState} clientName={live.clientName} connectionStatus={live.status} connectionError={live.error} onRoll={live.roll} onAdjustHp={live.adjustHp} onMoveToken={live.moveToken} onReconnect={live.reconnect} />
      )}

      <footer className="footer-note"><span>{view === "director" ? "Director workspace" : "Play workspace"}</span><span>{view === "director" ? "Browse privately · prepare · present" : "Virtual table or physical companion · one session model"}</span></footer>
    </div>
  );
}
