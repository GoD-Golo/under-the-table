import { describe, expect, it } from "vitest";
import { normalizeChangeMessage, normalizePrivateCharacterState } from "./character-lifecycle.js";

describe("character lifecycle primitives", () => {
  it("normalizes optional change-request messages", () => {
    expect(normalizeChangeMessage("  Level   up after Greyhaven. ")).toBe("Level up after Greyhaven.");
    expect(normalizeChangeMessage(undefined)).toBe("");
  });

  it("keeps private state object-shaped and bounded", () => {
    expect(normalizePrivateCharacterState({ note: "cursed" })).toEqual({ note: "cursed" });
    expect(() => normalizePrivateCharacterState([])).toThrow();
    expect(() => normalizePrivateCharacterState({ note: "x".repeat(17_000) })).toThrow();
  });
});