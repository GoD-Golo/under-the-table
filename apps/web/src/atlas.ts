import { useCallback, useEffect, useState } from "react";
import type { AtlasHotspotDto, AtlasSceneDto, AtlasSnapshotDto } from "@utt/protocol";

const api = (path: string) => `/game/api${path}`;

async function json<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
  return body;
}

async function imageDimensions(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface CreateSceneDraft {
  name: string;
  kind: "blank" | "image" | "combat_test";
  loreSummary?: string;
  gridKind?: "none" | "square" | "hex";
  gridSize?: number;
  gridVisible?: boolean;
}

export interface CreateHotspotDraft {
  sceneId: string;
  label: string;
  x: number;
  y: number;
  linkedSceneId?: string;
  loreSummary?: string;
  createLinkedScene?: { name: string; kind: "blank" | "image" | "combat_test" } | null;
}

export function useAtlas() {
  const [data, setData] = useState<AtlasSnapshotDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const next = await json<AtlasSnapshotDto>(await fetch(api("/atlas"), { cache: "no-store" }));
      setData(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load atlas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const createScene = useCallback(async (draft: CreateSceneDraft): Promise<AtlasSceneDto> => {
    const result = await json<{ scene: AtlasSceneDto }>(await fetch(api("/scenes"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    }));
    await refresh();
    return result.scene;
  }, [refresh]);

  const createHotspot = useCallback(async (draft: CreateHotspotDraft): Promise<{ hotspot: AtlasHotspotDto; linkedScene: AtlasSceneDto | null }> => {
    const result = await json<{ hotspot: AtlasHotspotDto; linkedScene: AtlasSceneDto | null }>(await fetch(api(`/scenes/${draft.sceneId}/hotspots`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    }));
    await refresh();
    return result;
  }, [refresh]);

  const uploadBackground = useCallback(async (sceneId: string, file: File): Promise<AtlasSceneDto> => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Choose a PNG, JPEG, or WebP image");
    const dimensions = await imageDimensions(file);
    const result = await json<{ scene: AtlasSceneDto }>(await fetch(api(`/scenes/${sceneId}/background`), {
      method: "POST",
      headers: {
        "Content-Type": file.type,
        "X-Image-Width": String(dimensions.width),
        "X-Image-Height": String(dimensions.height)
      },
      body: file
    }));
    await refresh();
    return result.scene;
  }, [refresh]);

  return { data, error, loading, refresh, createScene, createHotspot, uploadBackground };
}
