import { describe, expect, it } from "vitest";
import { normalizeTokenCoordinate, normalizeTokenKind, normalizeTokenLabel } from "./token.js";

describe("scene token primitives", () => {
  it("accepts the three foundation token kinds", () => {
    expect(normalizeTokenKind("player")).toBe("player");
    expect(normalizeTokenKind("npc")).toBe("npc");
    expect(normalizeTokenKind("object")).toBe("object");
    expect(() => normalizeTokenKind("monster")) .toThrow();
  });

  it("normalizes compact labels", () => {
    expect(normalizeTokenLabel("  Mira   Voss  ")).toBe("Mira Voss");
  });

  it("keeps token positions normalized to the scene", () => {
    expect(normalizeTokenCoordinate(0.625)).toBe(0.625);
    expect(() => normalizeTokenCoordinate(-0.01)).toThrow();
    expect(() => normalizeTokenCoordinate(1.01)).toThrow();
  });
});
