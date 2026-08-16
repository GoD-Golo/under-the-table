import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { AtlasSceneDto, AtlasTokenDto } from "@utt/protocol";
import { useAtlas, type CreateHotspotDraft, type CreateSceneDraft } from "../atlas.js";
import { SceneCanvas } from "./SceneCanvas.js";

interface AtlasWorkspaceProps {
  activeSceneId: string;
  liveTokens: AtlasTokenDto[];
  clientName: string;
  tokenRevision: number;
  onPresentScene: (sceneId: string) => void;
  onCreateToken: (command: { sceneId: string; kind: "player" | "npc" | "object"; label: string; x: number; y: number; claim?: boolean }) => void;
  onMoveToken: (tokenId: string, x: number, y: number) => void;
}

function kindLabel(kind: AtlasSceneDto["kind"]): string {
  if (kind === "combat_test") return "Combat test";
  if (kind === "image") return "Image scene";
  return "Blank scene";
}

function CreateSceneSheet({ initialKind, onClose, onCreate }: {
  initialKind: AtlasSceneDto["kind"];
  onClose: () => void;
  onCreate: (draft: CreateSceneDraft) => Promise<AtlasSceneDto>;
}) {
  const [kind, setKind] = useState(initialKind);
  const [name, setName] = useState(initialKind === "combat_test" ? "Combat Test" : "New Scene");
  const [loreSummary, setLoreSummary] = useState("");
  const [gridKind, setGridKind] = useState<"none" | "square" | "hex">(initialKind === "combat_test" ? "square" : "none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onCreate({
        name,
        kind,
        loreSummary,
        gridKind,
        gridSize: 64,
        gridVisible: gridKind !== "none"
      });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create scene");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="atlas-sheet" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-kicker">Start anywhere</div>
        <h2>Create a scene</h2>
        <label><span>Name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={80} /></label>
        <label><span>Scene preset</span><select value={kind} onChange={(event) => { const next = event.target.value as AtlasSceneDto["kind"]; setKind(next); if (next === "combat_test" && gridKind === "none") setGridKind("square"); }}><option value="blank">Blank</option><option value="image">Image</option><option value="combat_test">Combat test</option></select></label>
        <label><span>Grid</span><select value={gridKind} onChange={(event) => setGridKind(event.target.value as "none" | "square" | "hex")}><option value="none">None</option><option value="square">Square</option><option value="hex">Hex</option></select></label>
        <label><span>Lore summary <small>optional</small></span><textarea value={loreSummary} onChange={(event) => setLoreSummary(event.target.value)} placeholder="A sentence is enough. You can grow it later." rows={4} /></label>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="sheet-actions"><button type="button" className="ghost-button" onClick={onClose}>Cancel</button><button type="submit" className="game-button primary" disabled={busy}>{busy ? "Creating…" : "Create scene"}</button></div>
      </form>
    </div>
  );
}

function CreatePinSheet({ point, scene, scenes, onClose, onCreate }: {
  point: { x: number; y: number };
  scene: AtlasSceneDto;
  scenes: AtlasSceneDto[];
  onClose: () => void;
  onCreate: (draft: CreateHotspotDraft) => Promise<void>;
}) {
  const [label, setLabel] = useState("New place");
  const [targetMode, setTargetMode] = useState<"none" | "existing" | "new">("new");
  const [existingSceneId, setExistingSceneId] = useState("");
  const [newKind, setNewKind] = useState<AtlasSceneDto["kind"]>("blank");
  const [loreSummary, setLoreSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidates = scenes.filter((candidate) => candidate.id !== scene.id);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (targetMode === "existing" && !existingSceneId) throw new Error("Choose a linked scene");
      await onCreate({
        sceneId: scene.id,
        label,
        x: point.x,
        y: point.y,
        loreSummary,
        ...(targetMode === "existing" ? { linkedSceneId: existingSceneId } : {}),
        createLinkedScene: targetMode === "new" ? { name: label, kind: newKind } : null
      });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create hotspot");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="atlas-sheet pin-sheet" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-kicker">Hotspot · {Math.round(point.x * 100)}%, {Math.round(point.y * 100)}%</div>
        <h2>Link this place</h2>
        <label><span>Label</span><input autoFocus value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} /></label>
        <fieldset className="mode-choice"><legend>When clicked</legend><label><input type="radio" checked={targetMode === "new"} onChange={() => setTargetMode("new")} /> Create linked scene</label><label><input type="radio" checked={targetMode === "existing"} onChange={() => setTargetMode("existing")} /> Open existing scene</label><label><input type="radio" checked={targetMode === "none"} onChange={() => setTargetMode("none")} /> Lore only / pin only</label></fieldset>
        {targetMode === "existing" ? <label><span>Linked scene</span><select value={existingSceneId} onChange={(event) => setExistingSceneId(event.target.value)}><option value="">Choose…</option>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label> : null}
        {targetMode === "new" ? <label><span>New scene preset</span><select value={newKind} onChange={(event) => setNewKind(event.target.value as AtlasSceneDto["kind"])}><option value="blank">Blank</option><option value="image">Image</option><option value="combat_test">Combat test</option></select></label> : null}
        <label><span>Lore summary <small>optional</small></span><textarea value={loreSummary} onChange={(event) => setLoreSummary(event.target.value)} placeholder="What should this place mean right now?" rows={4} /></label>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="sheet-actions"><button type="button" className="ghost-button" onClick={onClose}>Cancel</button><button type="submit" className="game-button primary" disabled={busy}>{busy ? "Linking…" : "Place hotspot"}</button></div>
      </form>
    </div>
  );
}

function CreateTokenSheet({ point, scene, clientName, onClose, onCreate }: {
  point: { x: number; y: number }; scene: AtlasSceneDto; clientName: string; onClose: () => void;
  onCreate: (command: { sceneId: string; kind: "player" | "npc" | "object"; label: string; x: number; y: number; claim?: boolean }) => void;
}) {
  const [kind, setKind] = useState<"player" | "npc" | "object">("player");
  const [label, setLabel] = useState("New Token");
  const [claim, setClaim] = useState(true);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!label.trim()) return;
    onCreate({ sceneId: scene.id, kind, label, x: point.x, y: point.y, ...(kind === "player" ? { claim } : {}) });
    onClose();
  };
  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="atlas-sheet token-sheet" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-kicker">Token · {Math.round(point.x * 100)}%, {Math.round(point.y * 100)}%</div>
        <h2>Place a token</h2>
        <label><span>Label</span><input autoFocus value={label} onChange={(event) => setLabel(event.target.value)} maxLength={60} /></label>
        <label><span>Kind</span><select value={kind} onChange={(event) => setKind(event.target.value as "player" | "npc" | "object")}><option value="player">Player</option><option value="npc">NPC</option><option value="object">Object</option></select></label>
        {kind === "player" ? <label className="claim-control"><input type="checkbox" checked={claim} onChange={(event) => setClaim(event.target.checked)} /><span>Claim as {clientName}</span></label> : null}
        <p className="sheet-note">Claiming is a development ownership proof, not authentication. Real identity remains deferred.</p>
        <div className="sheet-actions"><button type="button" className="ghost-button" onClick={onClose}>Cancel</button><button type="submit" className="game-button primary">Place token</button></div>
      </form>
    </div>
  );
}

export function AtlasWorkspace({ activeSceneId, liveTokens, clientName, tokenRevision, onPresentScene, onCreateToken, onMoveToken }: AtlasWorkspaceProps) {
  const atlas = useAtlas();
  const uploadRef = useRef<HTMLInputElement>(null);
  const [browseSceneId, setBrowseSceneId] = useState<string | null>(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [followTable, setFollowTable] = useState(true);
  const [addPinMode, setAddPinMode] = useState(false);
  const [addTokenMode, setAddTokenMode] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);
  const [pendingTokenPoint, setPendingTokenPoint] = useState<{ x: number; y: number } | null>(null);
  const [createKind, setCreateKind] = useState<AtlasSceneDto["kind"] | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const scenes = atlas.data?.scenes ?? [];
  useEffect(() => {
    if (!scenes.length) return;
    const currentExists = browseSceneId && scenes.some((scene) => scene.id === browseSceneId);
    if (!currentExists) setBrowseSceneId(scenes.some((scene) => scene.id === activeSceneId) ? activeSceneId : scenes[0]?.id ?? null);
  }, [activeSceneId, browseSceneId, scenes]);
  useEffect(() => {
    if (activeSceneId && scenes.length > 0 && !scenes.some((scene) => scene.id === activeSceneId)) {
      void atlas.refresh();
    }
  }, [activeSceneId, atlas.refresh, scenes]);
  useEffect(() => {
    if (tokenRevision > 0) void atlas.refresh();
  }, [tokenRevision, atlas.refresh]);
  useEffect(() => {
    if (followTable && activeSceneId && scenes.some((scene) => scene.id === activeSceneId)) {
      setBrowseSceneId(activeSceneId);
      setSelectedHotspotId(null);
    }
  }, [activeSceneId, followTable, scenes]);

  const scene = scenes.find((item) => item.id === browseSceneId) ?? null;
  const hotspots = useMemo(() => (atlas.data?.hotspots ?? []).filter((item) => item.sceneId === scene?.id), [atlas.data?.hotspots, scene?.id]);
  const selectedHotspot = hotspots.find((item) => item.id === selectedHotspotId) ?? null;
  const sceneEntity = atlas.data?.entities.find((item) => item.id === scene?.entityId) ?? null;
  const hotspotEntity = atlas.data?.entities.find((item) => item.id === selectedHotspot?.linkedEntityId) ?? null;
  const linkedScene = scenes.find((item) => item.id === selectedHotspot?.linkedSceneId) ?? null;
  const activeScene = scenes.find((item) => item.id === activeSceneId) ?? null;
  const durableTokens = (atlas.data?.tokens ?? []).filter((item) => item.sceneId === scene?.id);
  const sceneTokens = scene?.id === activeSceneId ? liveTokens : durableTokens;

  const browse = (sceneId: string) => {
    setBrowseSceneId(sceneId);
    setSelectedHotspotId(null);
    setAddPinMode(false);
    setAddTokenMode(false);
    setFollowTable(sceneId === activeSceneId);
  };

  const createScene = async (draft: CreateSceneDraft) => {
    const created = await atlas.createScene(draft);
    browse(created.id);
    return created;
  };

  const upload = async (file: File) => {
    if (!scene) return;
    setActionError(null);
    try { await atlas.uploadBackground(scene.id, file); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : "Upload failed"); }
  };

  const createPin = async (draft: CreateHotspotDraft) => {
    const result = await atlas.createHotspot(draft);
    setAddPinMode(false);
    setPendingPoint(null);
    setSelectedHotspotId(result.hotspot.id);
  };

  if (atlas.loading || !atlas.data || !scene) return <main className="atlas-loading"><span>Loading atlas…</span>{atlas.error ? <p>{atlas.error}</p> : null}</main>;

  return (
    <main className="atlas-workspace">
      <aside className="scene-rail">
        <div className="rail-heading"><div><span>World surface</span><h1>Atlas</h1></div><button className="rail-add" type="button" onClick={() => setCreateKind("blank")}>+</button></div>
        <div className="quick-actions"><button type="button" onClick={() => setCreateKind("blank")}>New scene</button><button type="button" onClick={() => setCreateKind("combat_test")}>Quick combat</button></div>
        <div className="scene-list">
          {scenes.map((item) => <button type="button" key={item.id} className={`scene-list-item ${item.id === scene.id ? "selected" : ""}`} onClick={() => browse(item.id)}><span className={`scene-kind-dot ${item.kind}`} /><span><strong>{item.name}</strong><small>{kindLabel(item.kind)}</small></span>{item.id === activeSceneId ? <em>LIVE</em> : null}</button>)}
        </div>
        <div className="rail-foot"><span>{scenes.length} scene{scenes.length === 1 ? "" : "s"}</span><span>{atlas.data.hotspots.length} links</span></div>
      </aside>

      <div className="scene-column">
        <div className="scene-context-bar"><div><span>{scene.id === activeSceneId ? "Live scene" : "Browsing privately"}</span><strong>{scene.name}</strong></div><div className="context-actions">{!followTable && activeScene ? <button className="ghost-button" type="button" onClick={() => { setFollowTable(true); browse(activeScene.id); }}>Follow table</button> : null}<button className="game-button primary" type="button" disabled={scene.id === activeSceneId} onClick={() => { onPresentScene(scene.id); setFollowTable(true); }}>{scene.id === activeSceneId ? "On table" : "Present to table"}</button></div></div>
        <SceneCanvas
          scene={scene} hotspots={hotspots} tokens={sceneTokens} clientName={clientName}
          selectedHotspotId={selectedHotspotId} addPinMode={addPinMode} addTokenMode={addTokenMode}
          onToggleAddPin={() => { setAddTokenMode(false); setAddPinMode((value) => !value); }}
          onToggleAddToken={() => { setAddPinMode(false); setAddTokenMode((value) => !value); }}
          onCanvasPoint={(point) => { setPendingPoint(point); setAddPinMode(false); }}
          onTokenPoint={(point) => { setPendingTokenPoint(point); setAddTokenMode(false); }}
          onHotspotSelect={(hotspot) => setSelectedHotspotId(hotspot.id)} onTokenMove={onMoveToken}
        />
      </div>

      <aside className="scene-inspector">
        <section><span className="inspector-kicker">Scene</span><h2>{scene.name}</h2><div className="tag-row"><span>{kindLabel(scene.kind)}</span><span>{scene.grid.visible ? `${scene.grid.kind} ${scene.grid.size}` : "No grid"}</span></div></section>
        <section className="inspector-section"><h3>Visual</h3><input ref={uploadRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ""; }} /><button type="button" className="inspector-action" onClick={() => uploadRef.current?.click()}>{scene.backgroundAssetKey ? "Replace background" : "Upload background"}<small>PNG, JPEG or WebP · 12 MB max</small></button></section>
        {sceneEntity ? <section className="lore-card"><span className="inspector-kicker">Lore</span><h3>{sceneEntity.name}</h3><p>{sceneEntity.summary || "No summary yet."}</p></section> : null}
        <section className="inspector-section token-inspector"><div className="section-title-row"><h3>Tokens</h3><button type="button" onClick={() => { setAddPinMode(false); setAddTokenMode(true); }}>+ Add</button></div><p>{sceneTokens.length ? `${sceneTokens.length} token${sceneTokens.length === 1 ? "" : "s"} on this scene.` : "No tokens yet. Drop one directly onto the scene."}</p>{sceneTokens.length ? <div className="token-roster">{sceneTokens.map((token) => <span key={token.id} className={`token-roster-item ${token.kind}`}><b>{token.label}</b><small>{token.controllerName ? `controlled by ${token.controllerName}` : token.kind}</small></span>)}</div> : null}</section>
        <section className="inspector-section"><div className="section-title-row"><h3>Hotspots</h3><button type="button" onClick={() => setAddPinMode(true)}>+ Add</button></div>{hotspots.length ? <p>{hotspots.length} linked point{hotspots.length === 1 ? "" : "s"} on this scene.</p> : <p>Place a pin to connect this scene to another place, scene or lore entry.</p>}</section>
        {selectedHotspot ? <section className="hotspot-inspector"><span className="inspector-kicker">Selected hotspot</span><h3>{selectedHotspot.label}</h3>{hotspotEntity ? <p>{hotspotEntity.summary}</p> : <p className="muted-copy">No lore summary attached.</p>}<div className="stack-actions">{linkedScene ? <button className="game-button primary" type="button" onClick={() => browse(linkedScene.id)}>Enter {linkedScene.name}</button> : null}<button className="ghost-button" type="button" onClick={() => setSelectedHotspotId(null)}>Close</button></div></section> : null}
        {actionError || atlas.error ? <p className="form-error">{actionError ?? atlas.error}</p> : null}
        <p className="inspector-note">Director controls are intentionally unpermissioned in this private development slice. Auth/roles remain deferred.</p>
      </aside>

      {createKind ? <CreateSceneSheet initialKind={createKind} onClose={() => setCreateKind(null)} onCreate={createScene} /> : null}
      {pendingPoint ? <CreatePinSheet point={pendingPoint} scene={scene} scenes={scenes} onClose={() => setPendingPoint(null)} onCreate={createPin} /> : null}
      {pendingTokenPoint ? <CreateTokenSheet point={pendingTokenPoint} scene={scene} clientName={clientName} onClose={() => setPendingTokenPoint(null)} onCreate={onCreateToken} /> : null}
    </main>
  );
}
