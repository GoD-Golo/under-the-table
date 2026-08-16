import { useEffect, useState } from "react";
import { useAtlas } from "../atlas.js";
import type { LiveViewState } from "../live-room.js";
import { useOfflineCompanion } from "../offline-companion.js";
import { CharacterLibrary } from "./CharacterLibrary.js";
import { FreeformSurface, type FreeformItem } from "./FreeformSurface.js";
import { HudGrid } from "./HudGrid.js";
import { SceneCanvas } from "./SceneCanvas.js";
import { useSessionHudWidgets } from "./SessionHudWidgets.js";

type PlayMode = "table" | "companion";
type CompanionSource = "campaign" | "offline";
type MobileWidget = "character" | "dice" | "actions" | "initiative" | "events";

interface PlayWorkspaceProps {
  campaignState: LiveViewState | null;
  clientName: string;
  connectionStatus: "connecting" | "connected" | "disconnected";
  connectionError: string | null;
  onRoll: (sides: number, modifier: number) => void;
  onAdjustHp: (characterId: string, delta: number) => void;
  onCreateCharacter: (command: { name: string; rulesetId: string; maxHp: number; rulesetData?: Record<string, unknown> }) => void;
  onUpdateCharacter: (command: { characterId: string; name: string; maxHp: number; rulesetData: Record<string, unknown> }) => void;
  onRollInitiative: (command: { characterId?: string; label?: string; modifier?: number; armorClass?: number; maxHp?: number }) => void;
  onAdvanceInitiative: () => void;
  onClearInitiative: () => void;
  onPerformBasicAttack: (command: { attackerCharacterId: string; attackId: string; targetEntryId: string }) => void;
  onMoveToken: (tokenId: string, x: number, y: number) => void;
  onReconnect: () => void;
  onImmersiveChange: (immersive: boolean) => void;
}

function loadPlayMode(): PlayMode {
  return window.localStorage.getItem("utt.play.mode.v1") === "companion" ? "companion" : "table";
}

function loadCompanionSource(): CompanionSource {
  return window.localStorage.getItem("utt.play.companion-source.v1") === "offline" ? "offline" : "campaign";
}

function VirtualTable({ state, selectedCharacterId, onSelectCharacter, clientName, onRoll, onAdjustHp, onMoveToken, onRollInitiative, onAdvanceInitiative, onClearInitiative, onPerformBasicAttack, showHud, resetToken }: {
  state: LiveViewState;
  selectedCharacterId: string | null;
  onSelectCharacter: (characterId: string) => void;
  clientName: string;
  onRoll: (sides: number, modifier: number) => void;
  onAdjustHp: (characterId: string, delta: number) => void;
  onMoveToken: (tokenId: string, x: number, y: number) => void;
  onRollInitiative: (command: { characterId?: string; label?: string; modifier?: number; armorClass?: number; maxHp?: number }) => void;
  onAdvanceInitiative: () => void;
  onClearInitiative: () => void;
  onPerformBasicAttack: (command: { attackerCharacterId: string; attackId: string; targetEntryId: string }) => void;
  showHud: boolean;
  resetToken: number;
}) {
  const atlas = useAtlas();
  const widgets = useSessionHudWidgets({ state, selectedCharacterId, onSelectCharacter, onRoll, onAdjustHp, onRollInitiative, onAdvanceInitiative, onClearInitiative, onPerformBasicAttack, authority: "campaign" });
  const [mobileWidget, setMobileWidget] = useState<MobileWidget>("character");
  const scene = atlas.data?.scenes.find((item) => item.id === state.activeSceneId) ?? null;

  useEffect(() => {
    if (atlas.data && state.activeSceneId && !scene) void atlas.refresh();
  }, [atlas.data, atlas.refresh, scene, state.activeSceneId]);

  if (atlas.loading && !scene) return <section className="play-table-loading">Loading active scene…</section>;
  if (!scene) return <section className="play-table-loading"><strong>Active scene unavailable</strong><span>{atlas.error ?? "Waiting for Atlas data."}</span></section>;

  const items: FreeformItem[] = [
    { id: "character", initial: { x: 24, y: 74, width: 350, height: 450, z: 3 }, minWidth: 290, minHeight: 360, node: widgets.character },
    { id: "dice", initial: { x: 390, y: 74, width: 330, height: 410, z: 2 }, minWidth: 300, minHeight: 300, node: widgets.dice },
    { id: "actions", initial: { x: 735, y: 74, width: 330, height: 360, z: 5 }, minWidth: 300, minHeight: 280, node: widgets.actions },
    { id: "initiative", initial: { x: 1080, y: 74, width: 330, height: 430, z: 4 }, minWidth: 300, minHeight: 320, node: widgets.initiative },
    { id: "events", initial: { x: 735, y: 450, width: 500, height: 300, z: 1 }, minWidth: 320, minHeight: 250, node: widgets.events }
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
        fogEnabled={state.fogEnabled}
        fogRevealedCells={state.fogRevealedCells}
      />
      {showHud ? <>
        <FreeformSurface items={items} storageKey="utt.play.table.freeform.v2" resetToken={resetToken} overlay className="play-hud-freeform" />
        <div className="play-mobile-hud">
          <div className="play-mobile-widget">{widgets[mobileWidget]}</div>
          <nav className="play-mobile-dock" aria-label="Live HUD widgets">
            {(["character", "dice", "actions", "initiative", "events"] as MobileWidget[]).map((id) => <button type="button" className={mobileWidget === id ? "active" : ""} key={id} onClick={() => setMobileWidget(id)}>{id === "character" ? "Character" : id === "dice" ? "Checks" : id === "actions" ? "Actions" : id === "initiative" ? "Combat" : "Log"}</button>)}
          </nav>
        </div>
      </> : null}
    </section>
  );
}

export function PlayWorkspace({ campaignState, clientName, connectionStatus, connectionError, onRoll, onAdjustHp, onCreateCharacter, onUpdateCharacter, onRollInitiative, onAdvanceInitiative, onClearInitiative, onPerformBasicAttack, onMoveToken, onReconnect, onImmersiveChange }: PlayWorkspaceProps) {
  const [selectedCharacterId, setSelectedCharacterIdState] = useState<string | null>(() => window.localStorage.getItem("utt.play.character.v1"));
  const offline = useOfflineCompanion(campaignState, selectedCharacterId);
  const [mode, setModeState] = useState<PlayMode>(() => loadPlayMode());
  const [companionSource, setCompanionSourceState] = useState<CompanionSource>(() => loadCompanionSource());
  const [showHud, setShowHud] = useState(true);
  const [resetToken, setResetToken] = useState(0);
  const [fullscreenActive, setFullscreenActive] = useState(() => document.fullscreenElement !== null);
  const [utilityTrayOpen, setUtilityTrayOpen] = useState(false);
  const [characterLibraryOpen, setCharacterLibraryOpen] = useState(false);
  const fullscreenSupported = document.fullscreenEnabled;

  useEffect(() => {
    if (!campaignState?.characters.length) return;
    if (selectedCharacterId && campaignState.characters.some((character) => character.id === selectedCharacterId)) return;
    const next = campaignState.characters[0]?.id ?? null;
    setSelectedCharacterIdState(next);
    if (next) window.localStorage.setItem("utt.play.character.v1", next);
  }, [campaignState, selectedCharacterId]);

  const selectCharacter = (characterId: string) => {
    setSelectedCharacterIdState(characterId);
    window.localStorage.setItem("utt.play.character.v1", characterId);
  };
  useEffect(() => {
    onImmersiveChange(mode === "table" && !!campaignState);
    return () => onImmersiveChange(false);
  }, [campaignState, mode, onImmersiveChange]);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreenActive(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (companionSource !== "campaign" || campaignState || connectionStatus !== "disconnected") return;
    setCompanionSourceState("offline");
    window.localStorage.setItem("utt.play.companion-source.v1", "offline");
  }, [campaignState, companionSource, connectionStatus]);

  const effectiveSource: CompanionSource = companionSource === "campaign" && campaignState ? "campaign" : "offline";
  const companionState = effectiveSource === "campaign" && campaignState ? campaignState : offline.state;

  const setMode = (next: PlayMode) => { setModeState(next); window.localStorage.setItem("utt.play.mode.v1", next); };
  const setCompanionSource = (next: CompanionSource) => { setCompanionSourceState(next); window.localStorage.setItem("utt.play.companion-source.v1", next); };
  const toggleFullscreen = async () => {
    if (!fullscreenSupported) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  };
  const leaveVirtualTable = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    setMode("companion");
  };

  return (
    <main className={`play-workspace ${mode === "table" && campaignState ? "immersive-table" : ""}`}>
      {mode === "table" && campaignState ? <>
        <button type="button" className="play-bubble play-back-bubble" onClick={() => void leaveVirtualTable()} aria-label="Back to Play" title="Back to Play">←</button>
        <div className={`play-utility-bubble ${utilityTrayOpen ? "open" : ""}`}>
          {utilityTrayOpen ? <div className="play-bubble-tray" role="group" aria-label="Virtual Table tools">
            <button type="button" onClick={() => setCharacterLibraryOpen(true)}>Characters</button>
            <button type="button" onClick={() => setShowHud((value) => !value)} aria-pressed={!showHud}>{showHud ? "Hide HUD" : "Show HUD"}</button>
            <button type="button" disabled={!fullscreenSupported} onClick={() => void toggleFullscreen()} aria-pressed={fullscreenActive} title={fullscreenSupported ? "Toggle browser fullscreen" : "Fullscreen is not supported by this browser"}>{fullscreenActive ? "Exit fullscreen" : "Fullscreen"}</button>
          </div> : null}
          <button type="button" className="play-bubble play-tools-bubble" onClick={() => setUtilityTrayOpen((value) => !value)} aria-expanded={utilityTrayOpen} aria-label="Virtual Table tools">•••</button>
        </div>
      </> : <header className="play-toolbar">
        <div className="play-mode-switch" role="group" aria-label="Play surface">
          <button type="button" className={mode === "table" ? "active" : ""} disabled={!campaignState} onClick={() => setMode("table")}>Virtual Table</button>
          <button type="button" className={mode === "companion" ? "active" : ""} onClick={() => setMode("companion")}>Companion</button>
        </div>
        <div className="play-toolbar-status"><span className={`status-pip ${connectionStatus}`} /><span>{campaignState ? "Campaign connected" : "No live campaign"}</span></div>
        <div className="play-toolbar-actions">
          {campaignState ? <button type="button" className="ghost-button" onClick={() => setCharacterLibraryOpen(true)}>Characters</button> : null}
          {mode === "table" ? <><button type="button" className="ghost-button" onClick={() => setShowHud((value) => !value)}>{showHud ? "Hide HUD" : "Show HUD"}</button>{showHud ? <button type="button" className="ghost-button" onClick={() => setResetToken((value) => value + 1)}>Reset HUD</button> : null}</> : <>
            <div className="companion-source-switch" role="group" aria-label="Companion data source">
              <button type="button" className={effectiveSource === "campaign" ? "active" : ""} disabled={!campaignState} onClick={() => setCompanionSource("campaign")}>Campaign</button>
              <button type="button" className={effectiveSource === "offline" ? "active" : ""} onClick={() => setCompanionSource("offline")}>Offline local</button>
            </div>
            {effectiveSource === "offline" && campaignState ? <button type="button" className="ghost-button" onClick={() => offline.adoptCampaign(campaignState, selectedCharacterId)}>Copy campaign state</button> : null}
            <button type="button" className="ghost-button" onClick={() => setResetToken((value) => value + 1)}>Reset HUD</button>
          </>}
        </div>
      </header>}

      {characterLibraryOpen && campaignState ? <CharacterLibrary characters={campaignState.characters} selectedCharacterId={selectedCharacterId} onSelect={selectCharacter} onCreate={onCreateCharacter} onUpdate={onUpdateCharacter} onClose={() => setCharacterLibraryOpen(false)} /> : null}

      {connectionError && !campaignState ? <div className="play-connection-note"><span>{connectionError}</span><button type="button" onClick={onReconnect}>Retry campaign</button></div> : null}

      {mode === "table" ? (
        campaignState ? <VirtualTable state={campaignState} selectedCharacterId={selectedCharacterId} onSelectCharacter={selectCharacter} clientName={clientName} onRoll={onRoll} onAdjustHp={onAdjustHp} onMoveToken={onMoveToken} onRollInitiative={onRollInitiative} onAdvanceInitiative={onAdvanceInitiative} onClearInitiative={onClearInitiative} onPerformBasicAttack={onPerformBasicAttack} showHud={showHud} resetToken={resetToken} /> : <section className="play-unavailable"><div className="sigil">UTT</div><h1>Virtual Table needs a live campaign</h1><p>Companion can keep running from local state while the campaign is unavailable.</p><button type="button" className="game-button primary" onClick={() => setMode("companion")}>Open Companion</button></section>
      ) : (
        <HudGrid
          state={companionState}
          selectedCharacterId={selectedCharacterId}
          onSelectCharacter={selectCharacter}
          onRoll={effectiveSource === "campaign" ? onRoll : offline.roll}
          onAdjustHp={effectiveSource === "campaign" ? onAdjustHp : offline.adjustHp}
          onRollInitiative={effectiveSource === "campaign" ? onRollInitiative : undefined}
          onAdvanceInitiative={effectiveSource === "campaign" ? onAdvanceInitiative : undefined}
          onClearInitiative={effectiveSource === "campaign" ? onClearInitiative : undefined}
          onPerformBasicAttack={effectiveSource === "campaign" ? onPerformBasicAttack : undefined}
          layoutResetToken={resetToken}
          authority={effectiveSource}
        />
      )}
    </main>
  );
}
