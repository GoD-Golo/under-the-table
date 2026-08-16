import type { AtlasSceneDto, AtlasTokenDto } from "@utt/protocol";
import { FreeformSurface, type FreeformItem } from "./FreeformSurface.js";
import { WidgetFrame } from "./WidgetFrame.js";

interface DirectorOverlayProps {
  scene: AtlasSceneDto;
  activeScene: AtlasSceneDto | null;
  tokens: AtlasTokenDto[];
  resetToken: number;
  onPresent: () => void;
  onFollowTable: () => void;
}

export function DirectorOverlay({
  scene, activeScene, tokens, resetToken, onPresent, onFollowTable
}: DirectorOverlayProps) {
  const items: FreeformItem[] = [
    {
      id: "director-scene",
      initial: { x: 18, y: 76, width: 270, height: 210, z: 2 },
      minWidth: 230,
      minHeight: 170,
      node: (
        <WidgetFrame eyebrow="Director" title={scene.name} meta={scene.id === activeScene?.id ? "ON TABLE" : "PRIVATE"}>
          <div className="director-widget-copy">
            <span>{scene.grid.visible ? `${scene.grid.kind} grid · ${scene.grid.size}` : "No grid"}</span>
            <p>{scene.id === activeScene?.id ? "This is the scene players are currently following." : "You are browsing this scene privately."}</p>
          </div>
          <div className="stack-actions">
            {scene.id !== activeScene?.id ? <button className="game-button primary" type="button" onClick={onPresent}>Present to table</button> : null}
            {scene.id !== activeScene?.id && activeScene ? <button className="ghost-button" type="button" onClick={onFollowTable}>Follow {activeScene.name}</button> : null}
          </div>
        </WidgetFrame>
      )
    },
    {
      id: "director-tokens",
      initial: { x: 18, y: 304, width: 270, height: 260, z: 1 },
      minWidth: 230,
      minHeight: 180,
      node: (
        <WidgetFrame eyebrow="Scene" title="Token roster" meta={`${tokens.length} token${tokens.length === 1 ? "" : "s"}`}>
          <div className="token-roster director-token-roster">
            {tokens.map((token) => (
              <span key={token.id} className={`token-roster-item ${token.kind}`}>
                <b>{token.label}</b>
                <small>{token.controllerName ? token.controllerName : token.kind}</small>
              </span>
            ))}
            {tokens.length === 0 ? <p className="empty-state">No tokens on this scene.</p> : null}
          </div>
        </WidgetFrame>
      )
    },
  ];

  return <FreeformSurface items={items} storageKey="utt.director.freeform.v1" resetToken={resetToken} overlay className="director-freeform" />;
}
