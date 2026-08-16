import { describe, expect, it } from "vitest";
import {
  DND2024_CLASS_SAVES, abilityModifier, attackModifier, defaultArmorClass, normalizeDnd2024Data,
  passivePerception, proficiencyBonus, readDnd2024Data, saveModifier, skillModifier, suggestedMaxHp
} from "./index.js";

const fighter = normalizeDnd2024Data({
  version: 1, classId: "fighter", species: "human", background: "soldier", level: 3,
  abilities: { strength: 16, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
  armorClass: 16, speed: 30, notes: "", skillProficiencies: ["athletics", "perception"],
  attacks: [{ id: "sword", name: "Longsword", ability: "strength", proficient: true, damageDiceCount: 1, damageDie: 8, damageType: "slashing", addAbilityModifier: true, range: "Melee 5 ft." }]
});

describe("D&D 2024 character math", () => {
  it("calculates ability modifiers and proficiency bonus", () => {
    expect(abilityModifier(8)).toBe(-1); expect(abilityModifier(15)).toBe(2);
    expect(proficiencyBonus(1)).toBe(2); expect(proficiencyBonus(5)).toBe(3); expect(proficiencyBonus(17)).toBe(6);
  });
  it("calculates suggested HP and baseline AC", () => {
    expect(suggestedMaxHp("fighter", 1, 14)).toBe(12); expect(suggestedMaxHp("fighter", 3, 14)).toBe(28);
    expect(suggestedMaxHp("wizard", 1, 8)).toBe(5); expect(defaultArmorClass(14)).toBe(12);
  });
  it("normalizes legacy data into the current schema", () => {
    const legacy = normalizeDnd2024Data({ ...fighter, version: 1, skillProficiencies: undefined, attacks: undefined });
    expect(legacy.version).toBe(2); expect(legacy.skillProficiencies).toEqual([]); expect(legacy.attacks).toEqual([]);
  });
  it("derives saves, skills and passive perception", () => {
    expect(DND2024_CLASS_SAVES.fighter).toEqual(["strength", "constitution"]);
    expect(saveModifier(fighter, "strength")).toBe(5); expect(saveModifier(fighter, "wisdom")).toBe(1);
    expect(skillModifier(fighter, "athletics")).toBe(5); expect(skillModifier(fighter, "stealth")).toBe(2);
    expect(passivePerception(fighter)).toBe(13);
  });
  it("derives attack modifiers from proficiency and preserves display names", () => { expect(attackModifier(fighter, fighter.attacks[0]!)).toBe(5); expect(fighter.attacks[0]?.name).toBe("Longsword"); });
  it("rejects malformed skill and attack data", () => {
    expect(readDnd2024Data({ ...fighter, skillProficiencies: ["not-a-skill"] })).toBeNull();
    expect(readDnd2024Data({ ...fighter, attacks: [{ ...fighter.attacks[0], damageDie: 3 }] })).toBeNull();
  });
});
