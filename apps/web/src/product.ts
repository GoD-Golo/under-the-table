import { useCallback, useEffect, useState } from "react";
import type { ProductSnapshotDto } from "@utt/protocol";

async function readProduct(): Promise<ProductSnapshotDto> {
  const response = await fetch("/game/api/product", { cache: "no-store" });
  const body = await response.json() as ProductSnapshotDto & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `Product request failed (${response.status})`);
  return body;
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
