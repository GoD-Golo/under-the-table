import { describe, expect, it } from "vitest";
import { normalizeGrid, normalizeHotspotCoordinate, normalizeLoreSummary, normalizeSceneKind, normalizeSceneName } from "./scene.js";

describe("scene primitives", () => {
  it("normalizes compact scene names", () => {
    expect(normalizeSceneName("  Greyhaven   Market  ")).toBe("Greyhaven Market");
  });

  it("accepts the three foundation scene kinds", () => {
    expect(normalizeSceneKind("combat_test")).toBe("combat_test");
    expect(() => normalizeSceneKind("dungeon")).toThrow();
  });

  it("validates grid configuration", () => {
    expect(normalizeGrid("square", 48.4, true)).toEqual({ kind: "square", size: 48, visible: true });
    expect(() => normalizeGrid("square", 4, true)).toThrow();
  });

  it("keeps hotspot positions normalized", () => {
    expect(normalizeHotspotCoordinate(0.375)).toBe(0.375);
    expect(() => normalizeHotspotCoordinate(1.1)).toThrow();
  });

  it("bounds lore summaries without requiring lore", () => {
    expect(normalizeLoreSummary(undefined)).toBe("");
    expect(normalizeLoreSummary("  Old city gates.  ")).toBe("Old city gates.");
    expect(normalizeLoreSummary("x".repeat(2200))).toHaveLength(2000);
  });
});
