import { describe, expect, it } from "vitest";
import {
  abilityModifier,
  defaultArmorClass,
  normalizeDnd2024Data,
  proficiencyBonus,
  suggestedMaxHp
} from "./index.js";

describe("D&D 2024 character math", () => {
  it("calculates ability modifiers and proficiency bonus", () => {
    expect(abilityModifier(8)).toBe(-1);
    expect(abilityModifier(15)).toBe(2);
    expect(proficiencyBonus(1)).toBe(2);
    expect(proficiencyBonus(5)).toBe(3);
    expect(proficiencyBonus(17)).toBe(6);
  });

  it("derives baseline AC and fixed-progression HP", () => {
    expect(defaultArmorClass(14)).toBe(12);
    expect(suggestedMaxHp("fighter", 1, 14)).toBe(12);
    expect(suggestedMaxHp("fighter", 3, 14)).toBe(28);
    expect(suggestedMaxHp("wizard", 1, 8)).toBe(5);
  });

  it("normalizes a minimal D&D 2024 sheet", () => {
    const data = normalizeDnd2024Data({
      classId: "fighter", species: "human", background: "soldier", level: 1,
      abilities: { strength: 15, dexterity: 14, constitution: 13, intelligence: 8, wisdom: 10, charisma: 12 },
      armorClass: 12, speed: 30, notes: "  Ready for the road.  "
    });
    expect(data.classId).toBe("fighter");
    expect(data.abilities.strength).toBe(15);
    expect(data.notes).toBe("Ready for the road.");
  });

  it("rejects invalid levels and ability scores", () => {
    expect(() => normalizeDnd2024Data({
      classId: "fighter", species: "human", background: "soldier", level: 0,
      abilities: { strength: 15, dexterity: 14, constitution: 13, intelligence: 8, wisdom: 10, charisma: 12 },
      armorClass: 12, speed: 30
    })).toThrow(/level/);
  });
});
