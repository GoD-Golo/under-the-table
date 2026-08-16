import { useState } from "react";
import { AtlasWorkspace } from "./components/AtlasWorkspace.js";
import { HudGrid } from "./components/HudGrid.js";
import { useLiveRoom } from "./live-room.js";

export function App() {
  const live = useLiveRoom();
  const [layoutResetToken, setLayoutResetToken] = useState(0);
  const [view, setView] = useState<"atlas" | "hud">("atlas");

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">UTT</span>
          <div>
            <strong>Under The Table</strong>
            <span>Vertical Slice 003 · Tokens</span>
          </div>
        </div>

        <div className="session-strip">
          <span className={`status-pip ${live.status}`} />
          <span>{live.status}</span>
          <span className="divider" />
          <span>{live.clientName}</span>
          {live.state ? <><span className="divider" /><span>{live.state.connectedPlayers} connected</span></> : null}
        </div>

        <div className="topbar-actions">
          <div className="view-switch" aria-label="Workspace view">
            <button className={view === "atlas" ? "active" : ""} type="button" onClick={() => setView("atlas")}>Atlas</button>
            <button className={view === "hud" ? "active" : ""} type="button" onClick={() => setView("hud")}>Table HUD</button>
          </div>
          <span className="environment-badge">TAILSCALE DEV</span>
          {view === "hud" ? <button className="ghost-button" type="button" onClick={() => setLayoutResetToken((value) => value + 1)}>Reset HUD</button> : null}
        </div>
      </header>

      {live.error ? (
        <div className="error-banner">
          <span>{live.error}</span>
          <button type="button" onClick={live.reconnect}>Reconnect</button>
        </div>
      ) : null}

      {live.state ? (
        view === "atlas" ? (
          <AtlasWorkspace
            activeSceneId={live.state.activeSceneId}
            liveTokens={live.state.tokens}
            clientName={live.clientName}
            tokenRevision={live.state.events[live.state.events.length - 1]?.kind.startsWith("token_") ? live.state.eventSequence : 0}
            onPresentScene={live.presentScene}
            onCreateToken={live.createToken}
            onMoveToken={live.moveToken}
          />
        ) : (
          <HudGrid state={live.state} onRoll={live.roll} onAdjustHp={live.adjustHp} layoutResetToken={layoutResetToken} />
        )
      ) : (
        <main className="connecting-screen">
          <div className="sigil">UTT</div>
          <h1>Opening the table…</h1>
          <p>Connecting to the authoritative session runtime.</p>
          {live.status === "disconnected" ? <button className="game-button primary" type="button" onClick={live.reconnect}>Try again</button> : null}
        </main>
      )}

      <footer className="footer-note">
        <span>{view === "atlas" ? "Scene Atlas foundation" : "Live HUD foundation"}</span>
        <span>{view === "atlas" ? "Pan · zoom · link · present" : "Drag from widget headers · Resize from edges"}</span>
      </footer>
    </div>
  );
}
