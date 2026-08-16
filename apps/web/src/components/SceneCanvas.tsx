import { useCallback, useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { AtlasHotspotDto, AtlasSceneDto, AtlasTokenDto } from "@utt/protocol";

interface CameraState { x: number; y: number; scale: number }

interface SceneCanvasProps {
  scene: AtlasSceneDto;
  hotspots: AtlasHotspotDto[];
  tokens: AtlasTokenDto[];
  clientName: string;
  selectedHotspotId: string | null;
  selectedHotspotLore: string | null;
  selectedHotspotLinkedSceneName: string | null;
  addPinMode: boolean;
  addTokenMode: boolean;
  onToggleAddPin: () => void;
  onToggleAddToken: () => void;
  onCanvasPoint: (point: { x: number; y: number }) => void;
  onTokenPoint: (point: { x: number; y: number }) => void;
  onHotspotSelect: (hotspot: AtlasHotspotDto) => void;
  onHotspotEnter: (hotspot: AtlasHotspotDto) => void;
  onTokenMove: (tokenId: string, x: number, y: number) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function GridOverlay({ scene }: { scene: AtlasSceneDto }) {
  const id = useId().replace(/:/g, "");
  if (!scene.grid.visible || scene.grid.kind === "none") return null;
  const size = scene.grid.size;
  if (scene.grid.kind === "square") {
    return (
      <svg className="map-grid-overlay" width={scene.backgroundWidth} height={scene.backgroundHeight} aria-hidden="true">
        <defs><pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse"><path d={`M ${size} 0 L 0 0 0 ${size}`} fill="none" stroke="currentColor" strokeWidth="1" /></pattern></defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    );
  }
  const radius = size / 2;
  const hexWidth = Math.sqrt(3) * radius;
  const patternHeight = 3 * radius;
  const path = `M ${hexWidth / 2} 0 L ${hexWidth} ${radius / 2} L ${hexWidth} ${radius * 1.5} L ${hexWidth / 2} ${radius * 2} L 0 ${radius * 1.5} L 0 ${radius / 2} Z M ${hexWidth / 2} ${radius * 2} L ${hexWidth / 2} ${patternHeight}`;
  return (
    <svg className="map-grid-overlay" width={scene.backgroundWidth} height={scene.backgroundHeight} aria-hidden="true">
      <defs><pattern id={id} width={hexWidth} height={patternHeight} patternUnits="userSpaceOnUse"><path d={path} fill="none" stroke="currentColor" strokeWidth="1" /></pattern></defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

export function SceneCanvas({
  scene, hotspots, tokens, clientName, selectedHotspotId, selectedHotspotLore, selectedHotspotLinkedSceneName,
  addPinMode, addTokenMode, onToggleAddPin, onToggleAddToken, onCanvasPoint, onTokenPoint, onHotspotSelect, onHotspotEnter, onTokenMove
}: SceneCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; cameraX: number; cameraY: number } | null>(null);
  const tokenDragRef = useRef<{ pointerId: number; tokenId: string; clientX: number; clientY: number; x: number; y: number } | null>(null);
  const [draggedToken, setDraggedToken] = useState<{ id: string; x: number; y: number; pending: boolean } | null>(null);
  const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, scale: 0.5 });

  const fit = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const scale = clamp(Math.min((rect.width - 64) / scene.backgroundWidth, (rect.height - 64) / scene.backgroundHeight), 0.12, 2.5);
    setCamera({
      scale,
      x: (rect.width - scene.backgroundWidth * scale) / 2,
      y: (rect.height - scene.backgroundHeight * scale) / 2
    });
  }, [scene.backgroundHeight, scene.backgroundWidth]);

  useEffect(() => {
    const frame = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(frame);
  }, [fit, scene.id]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const handleWheel = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      setCamera((current) => {
        const nextScale = clamp(current.scale * (event.deltaY > 0 ? 0.9 : 1.1), 0.12, 4);
        const worldX = (pointerX - current.x) / current.scale;
        const worldY = (pointerY - current.y) / current.scale;
        return { scale: nextScale, x: pointerX - worldX * nextScale, y: pointerY - worldY * nextScale };
      });
    };
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (addPinMode || addTokenMode) {
      const worldX = (event.clientX - rect.left - camera.x) / camera.scale;
      const worldY = (event.clientY - rect.top - camera.y) / camera.scale;
      const point = {
        x: clamp(worldX / scene.backgroundWidth, 0, 1),
        y: clamp(worldY / scene.backgroundHeight, 0, 1)
      };
      if (addTokenMode) onTokenPoint(point);
      else onCanvasPoint(point);
      return;
    }
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, cameraX: camera.x, cameraY: camera.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setCamera((current) => ({ ...current, x: drag.cameraX + event.clientX - drag.x, y: drag.cameraY + event.clientY - drag.y }));
  };

  const stopDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  useEffect(() => {
    if (!draggedToken?.pending) return;
    const authoritative = tokens.find((token) => token.id === draggedToken.id);
    if (!authoritative) return;
    const converged = Math.abs(authoritative.x - draggedToken.x) < 0.0005 && Math.abs(authoritative.y - draggedToken.y) < 0.0005;
    if (converged) setDraggedToken(null);
  }, [draggedToken, tokens]);

  useEffect(() => {
    if (!draggedToken?.pending) return;
    const timer = window.setTimeout(() => setDraggedToken((current) => current?.id === draggedToken.id && current.pending ? null : current), 1600);
    return () => window.clearTimeout(timer);
  }, [draggedToken]);

  const canControlToken = (token: AtlasTokenDto) => !token.controllerName || token.controllerName === clientName;

  const startTokenDrag = (event: ReactPointerEvent<HTMLButtonElement>, token: AtlasTokenDto) => {
    event.stopPropagation();
    if (event.button !== 0 || !canControlToken(token)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    tokenDragRef.current = { pointerId: event.pointerId, tokenId: token.id, clientX: event.clientX, clientY: event.clientY, x: token.x, y: token.y };
    setDraggedToken({ id: token.id, x: token.x, y: token.y, pending: false });
  };

  const moveTokenDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = tokenDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const x = clamp(drag.x + (event.clientX - drag.clientX) / (camera.scale * scene.backgroundWidth), 0, 1);
    const y = clamp(drag.y + (event.clientY - drag.clientY) / (camera.scale * scene.backgroundHeight), 0, 1);
    setDraggedToken({ id: drag.tokenId, x, y, pending: false });
  };

  const finishTokenDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = tokenDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const finalPosition = draggedToken?.id === drag.tokenId ? draggedToken : { id: drag.tokenId, x: drag.x, y: drag.y, pending: false };
    tokenDragRef.current = null;
    setDraggedToken({ id: drag.tokenId, x: finalPosition.x, y: finalPosition.y, pending: true });
    onTokenMove(drag.tokenId, finalPosition.x, finalPosition.y);
  };

  return (
    <section className={`scene-viewport ${addPinMode ? "placing-pin" : ""} ${addTokenMode ? "placing-token" : ""}`} ref={viewportRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
      <div className="scene-toolbar" onPointerDown={(event) => event.stopPropagation()}>
        <button type="button" className="map-tool" onClick={fit}>Fit</button>
        <span>{Math.round(camera.scale * 100)}%</span>
        <button type="button" className={`map-tool ${addPinMode ? "active" : ""}`} onClick={onToggleAddPin}>{addPinMode ? "Cancel pin" : "+ Pin"}</button>
        <button type="button" className={`map-tool ${addTokenMode ? "active" : ""}`} onClick={onToggleAddToken}>{addTokenMode ? "Cancel token" : "+ Token"}</button>
      </div>
      {addPinMode ? <div className="placement-hint">Click anywhere on the scene to place a hotspot</div> : null}
      {addTokenMode ? <div className="placement-hint">Click anywhere on the scene to place a token</div> : null}
      <div className="scene-surface" style={{ width: scene.backgroundWidth, height: scene.backgroundHeight, transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})` }}>
        {scene.backgroundAssetKey ? <img className="scene-background" src={`/game/assets/${scene.backgroundAssetKey}`} alt="" draggable={false} /> : <div className="blank-scene-art"><span>UTT</span><p>{scene.name}</p></div>}
        <GridOverlay scene={scene} />
        <div className="token-layer">
          {tokens.map((token) => {
            const position = draggedToken?.id === token.id ? draggedToken : token;
            const controlled = canControlToken(token);
            const size = scene.grid.visible && scene.grid.kind !== "none" ? scene.grid.size * 0.78 : 56;
            return (
              <button
                type="button" key={token.id}
                className={`scene-token ${token.kind} ${controlled ? "controllable" : "locked"} ${draggedToken?.id === token.id ? "dragging" : ""}`}
                style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%`, width: size, height: size }}
                title={token.controllerName ? `${token.label} · ${token.controllerName}` : token.label}
                onPointerDown={(event) => startTokenDrag(event, token)}
                onPointerMove={moveTokenDrag}
                onPointerUp={finishTokenDrag}
                onPointerCancel={finishTokenDrag}
              >
                <span>{token.kind === "object" ? "◇" : token.label.slice(0, 2).toUpperCase()}</span>
                <small>{token.label}</small>
              </button>
            );
          })}
        </div>
        <div className="hotspot-layer">
          {hotspots.map((hotspot) => {
            const selected = selectedHotspotId === hotspot.id;
            return (
              <div
                key={hotspot.id}
                className={`scene-hotspot-anchor ${selected ? "selected" : ""}`}
                style={{ left: `${hotspot.x * 100}%`, top: `${hotspot.y * 100}%`, transform: `translate(-50%, -100%) scale(${1 / camera.scale})` }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className={`scene-hotspot ${selected ? "selected" : ""}`}
                  aria-label={`Open ${hotspot.label} hotspot`}
                  onClick={(event) => { event.stopPropagation(); onHotspotSelect(hotspot); }}
                  onDoubleClick={(event) => { event.stopPropagation(); if (hotspot.linkedSceneId) onHotspotEnter(hotspot); }}
                >
                  <span className="hotspot-dot"><i>◆</i></span><span className="hotspot-label">{hotspot.label}</span>
                </button>
                {selected ? (
                  <div className="hotspot-popover">
                    <strong>{hotspot.label}</strong>
                    <p>{selectedHotspotLore || "No lore summary attached yet."}</p>
                    {hotspot.linkedSceneId ? <button type="button" className="game-button primary" onClick={() => onHotspotEnter(hotspot)}>Open {selectedHotspotLinkedSceneName || "linked scene"}</button> : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
