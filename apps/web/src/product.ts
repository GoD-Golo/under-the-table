import { useCallback, useEffect, useState } from "react";
import type { ProductSnapshotDto } from "@utt/protocol";

async function readProduct(): Promise<ProductSnapshotDto> {
  const response = await fetch("/game/api/product", { cache: "no-store" });
  const body = await response.json() as ProductSnapshotDto & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `Product request failed (${response.status})`);
  return body;
}

export async function mutateProduct<T>(path: string, method: "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown): Promise<T> {
  const init: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) init.body = JSON.stringify(body);
  const response = await fetch(`/game/api/product${path}`, init);
  if (response.status === 204) {
    if (!response.ok) throw new Error(`Product mutation failed (${response.status})`);
    return undefined as T;
  }
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Product mutation failed (${response.status})`);
  return payload;
}

export async function readProductPrivateState<T>(characterId: string): Promise<T> {
  const response = await fetch(`/game/api/product/campaign-characters/${encodeURIComponent(characterId)}/private`, { cache: "no-store" });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Private state request failed (${response.status})`);
  return payload;
}

export function useProductSnapshot() {
  const [data, setData] = useState<ProductSnapshotDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setData(await readProduct());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load product home");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { data, error, loading, refresh };
}
