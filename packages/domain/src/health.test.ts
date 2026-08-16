import { describe, expect, it } from "vitest";
import { clampHitPoints } from "./health.js";

describe("clampHitPoints", () => {
  it("clamps damage at zero", () => expect(clampHitPoints(3, 20, -8)).toBe(0));
  it("clamps healing at max", () => expect(clampHitPoints(18, 20, 8)).toBe(20));
  it("rejects implausible client deltas", () => expect(() => clampHitPoints(10, 20, 101)).toThrow());
});
