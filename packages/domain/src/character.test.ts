import { describe, expect, it } from "vitest";
import {
  normalizeCharacterName,
  normalizeResourceBounds,
  normalizeResourceKey,
  normalizeRulesetData,
  normalizeRulesetId
} from "./character.js";

describe("character foundation", () => {
  it("normalizes compact names and generic ruleset identifiers", () => {
    expect(normalizeCharacterName("  Mira   Voss ")).toBe("Mira Voss");
    expect(normalizeRulesetId("DND2024")).toBe("dnd2024");
    expect(normalizeRulesetId("my-system.v2")).toBe("my-system.v2");
  });

  it("keeps resource keys ruleset-neutral", () => {
    expect(normalizeResourceKey("HP")).toBe("hp");
    expect(normalizeResourceKey("class.arcane-recovery")).toBe("class.arcane-recovery");
  });
  it("validates runtime resource bounds", () => {
    expect(normalizeResourceBounds(7, 10)).toEqual({ current: 7, max: 10 });
    expect(() => normalizeResourceBounds(11, 10)).toThrow();
    expect(() => normalizeResourceBounds(1, 0)).toThrow();
  });

  it("accepts opaque ruleset-owned data without teaching core D&D concepts", () => {
    expect(normalizeRulesetData({ ancestry: "human", classChoices: ["fighter"] })).toEqual({ ancestry: "human", classChoices: ["fighter"] });
    expect(normalizeRulesetData(undefined)).toEqual({});
    expect(() => normalizeRulesetData([])).toThrow();
  });
});
