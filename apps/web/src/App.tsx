import { useEffect, useState } from "react";
import { AtlasWorkspace } from "./components/AtlasWorkspace.js";
import { BrandLogo } from "./components/BrandLogo.js";
import { LandingPage } from "./components/LandingPage.js";
import { PlayWorkspace } from "./components/PlayWorkspace.js";
import { ProductExperience, type ProductScreen } from "./components/ProductExperience.js";
import { useLiveRoom } from "./live-room.js";

type AppRoute =
  | { kind: "landing" }
  | { kind: "product"; screen: ProductScreen; campaignId?: string | undefined; tableId?: string | undefined }
  | { kind: "runtime"; view: "director" | "play"; campaignId?: string | undefined; tableId?: string | undefined };

function loadRoute(): AppRoute {
  const parts = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (!parts.length) return { kind: "landing" };
  if (parts[0] === "home") return { kind: "product", screen: "home" };
  if (parts[0] === "campaigns") return { kind: "product", screen: "campaigns" };
  if (parts[0] === "characters") return { kind: "product", screen: "characters" };
  if (parts[0] === "campaign" && parts[1] && parts[2] === "world") return { kind: "runtime", view: "director", campaignId: parts[1], tableId: parts[3] };
  if (parts[0] === "campaign" && parts[1]) return { kind: "product", screen: "campaign", campaignId: parts[1] };
  if (parts[0] === "table" && parts[1] && parts[2] === "play") return { kind: "runtime", view: "play", tableId: parts[1] };
  if (parts[0] === "table" && parts[1]) return { kind: "product", screen: "table", tableId: parts[1] };
  return { kind: "product", screen: "home" };
}
function routeHash(route: AppRoute): string {
  if (route.kind === "landing") return "";
  if (route.kind === "product") {
    if (route.screen === "home") return "#home";
    if (route.screen === "campaigns") return "#campaigns";
    if (route.screen === "characters") return "#characters";
    if (route.screen === "campaign" && route.campaignId) return `#campaign/${route.campaignId}`;
    if (route.screen === "table" && route.tableId) return `#table/${route.tableId}`;
    return "#home";
  }
  if (route.view === "director" && route.campaignId) return `#campaign/${route.campaignId}/world${route.tableId ? `/${route.tableId}` : ""}`;
  if (route.view === "play" && route.tableId) return `#table/${route.tableId}/play`;
  return "#home";
}

function RuntimeWorkspace({ route, onHome, onExitContext }: {
  route: Extract<AppRoute, { kind: "runtime" }>;
  onHome: () => void;
  onExitContext: () => void;
}) {
  const live = useLiveRoom();
  const [immersivePlay, setImmersivePlay] = useState(false);
  const campaignState = live.status === "connected" ? live.state : null;
  return <div className={`app-shell ${immersivePlay ? "immersive-play" : ""}`}>
    {!immersivePlay ? <header className="topbar">
      <button className="brand-lockup brand-home-button" type="button" onClick={onHome} aria-label="Under The Table Home"><BrandLogo compact /><div><strong>Under The Table</strong><span>{route.view === "director" ? "Director · campaign context" : "Play · table context"}</span></div></button>
      <div className="session-strip"><span className={`status-pip ${live.status}`} /><span>{live.status}</span><span className="divider" /><span>{live.clientName}</span>{campaignState ? <><span className="divider" /><span>{campaignState.connectedPlayers} connected</span></> : null}</div>
      <div className="topbar-actions"><button className="ghost-button runtime-context-back" type="button" onClick={onExitContext}>← {route.tableId ? "Table Home" : "Campaign"}</button><span className="environment-badge">TAILSCALE DEV</span></div>
    </header> : null}

    {route.view === "director" && live.error ? <div className="error-banner"><span>{live.error}</span><button type="button" onClick={live.reconnect}>Reconnect</button></div> : null}
    {route.view === "director" ? (
      campaignState ? <AtlasWorkspace activeSceneId={campaignState.activeSceneId} liveTokens={campaignState.tokens} clientName={live.clientName} tokenRevision={campaignState.events[campaignState.events.length - 1]?.kind.startsWith("token_") ? campaignState.eventSequence : 0} onPresentScene={live.presentScene} onCreateToken={live.createToken} onMoveToken={live.moveToken} fogEnabled={campaignState.fogEnabled} fogRevealedCells={campaignState.fogRevealedCells} onSetFogEnabled={live.setFogEnabled} onSetFogCell={live.setFogCell} /> : <main className="connecting-screen"><div className="sigil">UTT</div><h1>Opening Director…</h1><p>Director needs the authoritative campaign runtime.</p>{live.status === "disconnected" ? <button className="ghost-button" type="button" onClick={live.reconnect}>Try campaign again</button> : null}<button className="game-button" type="button" onClick={onExitContext}>Back to context</button></main>
    ) : (
      <PlayWorkspace campaignState={campaignState} clientName={live.clientName} connectionStatus={live.status} connectionError={live.error} onRoll={live.roll} onAdjustHp={live.adjustHp} onRollInitiative={live.rollInitiative} onAdvanceInitiative={live.advanceInitiative} onClearInitiative={live.clearInitiative} onPerformBasicAttack={live.performBasicAttack} onMoveToken={live.moveToken} onReconnect={live.reconnect} onImmersiveChange={setImmersivePlay} onExitTable={onExitContext} />
    )}
    {!immersivePlay ? <footer className="footer-note"><span>{route.view === "director" ? "Campaign Director" : "Table Play"}</span><span>{route.view === "director" ? "Prepare privately · present deliberately" : "Virtual Table or Physical Companion · same Table"}</span></footer> : null}
  </div>;
}
export function App() {
  const [route, setRoute] = useState<AppRoute>(() => loadRoute());
  useEffect(() => {
    const onHashChange = () => setRoute(loadRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [route]);
  const navigate = (next: AppRoute) => { setRoute(next); window.location.hash = routeHash(next); };
  const home = () => navigate({ kind: "product", screen: "home" });

  if (route.kind === "landing") return <LandingPage onEnterProduct={home} />;
  if (route.kind === "runtime") {
    const exitContext = () => {
      if (route.tableId) navigate({ kind: "product", screen: "table", tableId: route.tableId });
      else if (route.campaignId) navigate({ kind: "product", screen: "campaign", campaignId: route.campaignId });
      else home();
    };
    return <RuntimeWorkspace route={route} onHome={home} onExitContext={exitContext} />;
  }

  return <ProductExperience
    screen={route.screen}
    campaignId={route.campaignId}
    tableId={route.tableId}
    onLanding={() => navigate({ kind: "landing" })}
    onHome={home}
    onCampaigns={() => navigate({ kind: "product", screen: "campaigns" })}
    onCharacters={() => navigate({ kind: "product", screen: "characters" })}
    onCampaign={(campaignId) => navigate({ kind: "product", screen: "campaign", campaignId })}
    onTable={(tableId) => navigate({ kind: "product", screen: "table", tableId })}
    onWorld={(campaignId, tableId) => navigate({ kind: "runtime", view: "director", campaignId, tableId })}
    onPlay={(tableId, surface, characterId) => {
      window.localStorage.setItem("utt.play.mode.v1", surface === "table" ? "table" : "companion");
      window.localStorage.setItem("utt.play.companion-source.v1", "campaign");
      if (characterId) window.localStorage.setItem("utt.play.character.v1", characterId);
      navigate({ kind: "runtime", view: "play", tableId });
    }}
  />;
}
