import { describe, expect, it } from "vitest";
import { rollDie } from "./dice.js";

const fixed = (value: number) => () => value;

describe("rollDie", () => {
  it("returns a server-supplied roll plus modifier", () => {
    expect(rollDie(20, 5, fixed(17))).toEqual({ sides: 20, natural: 17, modifier: 5, total: 22 });
  });

  it("rejects unsupported dice", () => {
    expect(() => rollDie(7, 0, fixed(3))).toThrow(/unsupported die/i);
  });

  it("rejects a broken random source", () => {
    expect(() => rollDie(6, 0, fixed(8))).toThrow(/out-of-range/i);
  });
});
