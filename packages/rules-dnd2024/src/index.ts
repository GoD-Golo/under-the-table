export const DND2024_RULESET_ID = "dnd2024";

export const DND2024_ABILITIES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;
export type Dnd2024Ability = (typeof DND2024_ABILITIES)[number];

export const DND2024_CLASSES = [
  "barbarian", "bard", "cleric", "druid", "fighter", "monk",
  "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard"
] as const;
export type Dnd2024Class = (typeof DND2024_CLASSES)[number];

export const DND2024_SPECIES = [
  "aasimar", "dragonborn", "dwarf", "elf", "gnome",
  "goliath", "halfling", "human", "orc", "tiefling"
] as const;

export const DND2024_BACKGROUNDS = [
  "acolyte", "artisan", "charlatan", "criminal", "entertainer", "farmer", "guard", "guide",
  "hermit", "merchant", "noble", "sage", "sailor", "scribe", "soldier", "wayfarer"
] as const;

export interface Dnd2024AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface Dnd2024CharacterData {
  version: 1;
  classId: Dnd2024Class;
  species: string;
  background: string;
  level: number;
  abilities: Dnd2024AbilityScores;
  armorClass: number;
  speed: number;
  notes: string;
}

const CLASS_HP: Record<Dnd2024Class, { levelOne: number; fixedPerLevel: number }> = {
  barbarian: { levelOne: 12, fixedPerLevel: 7 },
  fighter: { levelOne: 10, fixedPerLevel: 6 }, paladin: { levelOne: 10, fixedPerLevel: 6 }, ranger: { levelOne: 10, fixedPerLevel: 6 },
  bard: { levelOne: 8, fixedPerLevel: 5 }, cleric: { levelOne: 8, fixedPerLevel: 5 }, druid: { levelOne: 8, fixedPerLevel: 5 },
  monk: { levelOne: 8, fixedPerLevel: 5 }, rogue: { levelOne: 8, fixedPerLevel: 5 }, warlock: { levelOne: 8, fixedPerLevel: 5 },
  sorcerer: { levelOne: 6, fixedPerLevel: 4 }, wizard: { levelOne: 6, fixedPerLevel: 4 }
};

export const DND2024_STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

export function abilityModifier(score: number): number {
  if (!Number.isInteger(score) || score < 1 || score > 30) throw new Error("ability score must be an integer between 1 and 30");
  return Math.floor((score - 10) / 2);
}

export function proficiencyBonus(level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > 20) throw new Error("level must be an integer between 1 and 20");
  return 2 + Math.floor((level - 1) / 4);
}

export function suggestedMaxHp(classId: Dnd2024Class, level: number, constitutionScore: number): number {
  const con = abilityModifier(constitutionScore);
  const hp = CLASS_HP[classId];
  proficiencyBonus(level);
  const levelOne = Math.max(1, hp.levelOne + con);
  if (level === 1) return levelOne;
  return levelOne + (level - 1) * Math.max(1, hp.fixedPerLevel + con);
}

export function defaultArmorClass(dexterityScore: number): number {
  return 10 + abilityModifier(dexterityScore);
}

function normalizeChoice(value: unknown, label: string, options?: readonly string[]): string {
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const clean = value.trim().toLowerCase();
  if (!clean || clean.length > 80) throw new Error(`${label} must be 1-80 characters`);
  if (options && !options.includes(clean)) throw new Error(`${label} is not supported`);
  return clean;
}

function normalizeScore(value: unknown, ability: Dnd2024Ability): number {
  const score = Number(value);
  if (!Number.isInteger(score) || score < 1 || score > 30) throw new Error(`${ability} must be an integer between 1 and 30`);
  return score;
}

export function normalizeDnd2024Data(value: unknown): Dnd2024CharacterData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("D&D 2024 data must be an object");
  const input = value as Record<string, unknown>;
  const abilityInput = typeof input.abilities === "object" && input.abilities !== null && !Array.isArray(input.abilities)
    ? input.abilities as Record<string, unknown> : {};
  const abilities = Object.fromEntries(DND2024_ABILITIES.map((ability) => [ability, normalizeScore(abilityInput[ability], ability)])) as unknown as Dnd2024AbilityScores;
  const level = Number(input.level);
  proficiencyBonus(level);
  const armorClass = Number(input.armorClass);
  if (!Number.isInteger(armorClass) || armorClass < 1 || armorClass > 99) throw new Error("armor class must be an integer between 1 and 99");
  const speed = Number(input.speed);
  if (!Number.isInteger(speed) || speed < 0 || speed > 999) throw new Error("speed must be an integer between 0 and 999");
  const notes = typeof input.notes === "string" ? input.notes.trim().slice(0, 4000) : "";
  return {
    version: 1,
    classId: normalizeChoice(input.classId, "class", DND2024_CLASSES) as Dnd2024Class,
    species: normalizeChoice(input.species, "species"),
    background: normalizeChoice(input.background, "background"),
    level,
    abilities,
    armorClass,
    speed,
    notes
  };
}

export function isDnd2024Data(value: unknown): value is Dnd2024CharacterData {
  try {
    normalizeDnd2024Data(value);
    return true;
  } catch {
    return false;
  }
}
