import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

export interface FreeformPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
}

export interface FreeformItem {
  id: string;
  initial: FreeformPlacement;
  minWidth?: number;
  minHeight?: number;
  node: ReactNode;
}

interface FreeformSurfaceProps {
  items: FreeformItem[];
  storageKey: string;
  resetToken?: number;
  snap?: number;
  overlay?: boolean;
  className?: string;
}

type PlacementMap = Record<string, FreeformPlacement>;
type Gesture = {
  id: string;
  pointerId: number;
  mode: "move" | "resize";
  clientX: number;
  clientY: number;
  start: FreeformPlacement;
};

const roundTo = (value: number, snap: number) => snap > 0 ? Math.round(value / snap) * snap : value;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function defaults(items: FreeformItem[]): PlacementMap {
  return Object.fromEntries(items.map((item) => [item.id, { ...item.initial }]));
}

function load(items: FreeformItem[], storageKey: string): PlacementMap {
  const fallback = defaults(items);
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, Partial<FreeformPlacement>>;
    for (const item of items) {
      const saved = parsed[item.id];
      if (!saved) continue;
      const values = [saved.x, saved.y, saved.width, saved.height, saved.z];
      if (values.every((value) => typeof value === "number" && Number.isFinite(value))) {
        fallback[item.id] = saved as FreeformPlacement;
      }
    }
  } catch {
    return fallback;
  }
  return fallback;
}

export function FreeformSurface({ items, storageKey, resetToken = 0, snap = 0, overlay = false, className = "" }: FreeformSurfaceProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const [placements, setPlacements] = useState<PlacementMap>(() => load(items, storageKey));
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  useEffect(() => {
    setPlacements((current) => {
      const next = { ...current };
      let changed = false;
      for (const item of items) {
        if (!next[item.id]) {
          next[item.id] = { ...item.initial };
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [items]);

  useEffect(() => {
    if (resetToken <= 0) return;
    const next = defaults(items);
    setPlacements(next);
    window.localStorage.removeItem(storageKey);
  }, [items, resetToken, storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(placements));
  }, [placements, storageKey]);

  const bringToFront = (id: string) => {
    setPlacements((current) => {
      const placement = current[id];
      if (!placement) return current;
      const top = Math.max(0, ...Object.values(current).map((value) => value.z));
      if (placement.z === top) return current;
      return { ...current, [id]: { ...placement, z: top + 1 } };
    });
  };

  const beginMove = (event: ReactPointerEvent<HTMLDivElement>, id: string) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (!target.closest(".widget-handle") || target.closest("button, input, select, textarea, a")) return;
    const start = placements[id];
    if (!start) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    bringToFront(id);
    gestureRef.current = { id, pointerId: event.pointerId, mode: "move", clientX: event.clientX, clientY: event.clientY, start };
    event.preventDefault();
  };

  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    if (event.button !== 0) return;
    const start = placements[id];
    if (!start) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    bringToFront(id);
    gestureRef.current = { id, pointerId: event.pointerId, mode: "resize", clientX: event.clientX, clientY: event.clientY, start };
  };

  const updateGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const item = itemsById.get(gesture.id);
    const surface = surfaceRef.current;
    if (!item || !surface) return;
    const dx = event.clientX - gesture.clientX;
    const dy = event.clientY - gesture.clientY;
    const bounds = surface.getBoundingClientRect();
    const minWidth = item.minWidth ?? 220;
    const minHeight = item.minHeight ?? 150;

    setPlacements((current) => {
      const active = current[gesture.id];
      if (!active) return current;
      if (gesture.mode === "move") {
        const maxX = Math.max(0, bounds.width - gesture.start.width);
        const maxY = Math.max(0, bounds.height - gesture.start.height);
        return {
          ...current,
          [gesture.id]: {
            ...active,
            x: roundTo(clamp(gesture.start.x + dx, 0, maxX), snap),
            y: roundTo(clamp(gesture.start.y + dy, 0, maxY), snap)
          }
        };
      }
      const maxWidth = Math.max(minWidth, bounds.width - gesture.start.x);
      const maxHeight = Math.max(minHeight, bounds.height - gesture.start.y);
      return {
        ...current,
        [gesture.id]: {
          ...active,
          width: roundTo(clamp(gesture.start.width + dx, minWidth, maxWidth), snap),
          height: roundTo(clamp(gesture.start.height + dy, minHeight, maxHeight), snap)
        }
      };
    });
  };

  const endGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (gestureRef.current?.pointerId === event.pointerId) gestureRef.current = null;
  };

  return (
    <div
      ref={surfaceRef}
      className={`freeform-surface ${overlay ? "overlay" : ""} ${className}`.trim()}
      onPointerMove={updateGesture}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
    >
      {items.map((item) => {
        const placement = placements[item.id] ?? item.initial;
        return (
          <div
            key={item.id}
            data-freeform-widget={item.id}
            className="freeform-item"
            style={{ left: placement.x, top: placement.y, width: placement.width, height: placement.height, zIndex: placement.z }}
            onPointerDown={(event) => beginMove(event, item.id)}
          >
            {item.node}
            <button
              type="button"
              className="freeform-resize-handle"
              aria-label={`Resize ${item.id} widget`}
              onPointerDown={(event) => beginResize(event, item.id)}
            />
          </div>
        );
      })}
    </div>
  );
}
