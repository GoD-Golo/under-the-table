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

export const DND2024_SKILLS = [
  { id: "acrobatics", ability: "dexterity" }, { id: "animal-handling", ability: "wisdom" },
  { id: "arcana", ability: "intelligence" }, { id: "athletics", ability: "strength" },
  { id: "deception", ability: "charisma" }, { id: "history", ability: "intelligence" },
  { id: "insight", ability: "wisdom" }, { id: "intimidation", ability: "charisma" },
  { id: "investigation", ability: "intelligence" }, { id: "medicine", ability: "wisdom" },
  { id: "nature", ability: "intelligence" }, { id: "perception", ability: "wisdom" },
  { id: "performance", ability: "charisma" }, { id: "persuasion", ability: "charisma" },
  { id: "religion", ability: "intelligence" }, { id: "sleight-of-hand", ability: "dexterity" },
  { id: "stealth", ability: "dexterity" }, { id: "survival", ability: "wisdom" }
] as const satisfies readonly { id: string; ability: Dnd2024Ability }[];
export type Dnd2024Skill = (typeof DND2024_SKILLS)[number]["id"];

export const DND2024_CLASS_SAVES: Record<Dnd2024Class, readonly [Dnd2024Ability, Dnd2024Ability]> = {
  barbarian: ["strength", "constitution"], bard: ["dexterity", "charisma"], cleric: ["wisdom", "charisma"],
  druid: ["intelligence", "wisdom"], fighter: ["strength", "constitution"], monk: ["strength", "dexterity"],
  paladin: ["wisdom", "charisma"], ranger: ["strength", "dexterity"], rogue: ["dexterity", "intelligence"],
  sorcerer: ["constitution", "charisma"], warlock: ["wisdom", "charisma"], wizard: ["intelligence", "wisdom"]
};

export interface Dnd2024AbilityScores {
  strength: number; dexterity: number; constitution: number; intelligence: number; wisdom: number; charisma: number;
}

export type Dnd2024DamageDie = 4 | 6 | 8 | 10 | 12;
export interface Dnd2024Attack {
  id: string; name: string; ability: Dnd2024Ability; proficient: boolean;
  damageDiceCount: number; damageDie: Dnd2024DamageDie; damageType: string; addAbilityModifier: boolean; range: string;
}

export interface Dnd2024CharacterData {
  version: 2; classId: Dnd2024Class; species: string; background: string; level: number;
  abilities: Dnd2024AbilityScores; armorClass: number; speed: number; notes: string;
  skillProficiencies: Dnd2024Skill[]; attacks: Dnd2024Attack[];
}

export type Dnd2024WeaponTemplate = Omit<Dnd2024Attack, "id" | "proficient">;
export const DND2024_WEAPON_TEMPLATES: readonly Dnd2024WeaponTemplate[] = [
  { name: "Club", ability: "strength", damageDiceCount: 1, damageDie: 4, damageType: "bludgeoning", addAbilityModifier: true, range: "Melee 5 ft." },
  { name: "Dagger", ability: "dexterity", damageDiceCount: 1, damageDie: 4, damageType: "piercing", addAbilityModifier: true, range: "Melee / Thrown 20/60" },
  { name: "Handaxe", ability: "strength", damageDiceCount: 1, damageDie: 6, damageType: "slashing", addAbilityModifier: true, range: "Melee / Thrown 20/60" },
  { name: "Javelin", ability: "strength", damageDiceCount: 1, damageDie: 6, damageType: "piercing", addAbilityModifier: true, range: "Melee / Thrown 30/120" },
  { name: "Mace", ability: "strength", damageDiceCount: 1, damageDie: 6, damageType: "bludgeoning", addAbilityModifier: true, range: "Melee 5 ft." },
  { name: "Quarterstaff", ability: "strength", damageDiceCount: 1, damageDie: 6, damageType: "bludgeoning", addAbilityModifier: true, range: "Melee 5 ft." },
  { name: "Spear", ability: "strength", damageDiceCount: 1, damageDie: 6, damageType: "piercing", addAbilityModifier: true, range: "Melee / Thrown 20/60" },
  { name: "Light Crossbow", ability: "dexterity", damageDiceCount: 1, damageDie: 8, damageType: "piercing", addAbilityModifier: true, range: "Ranged 80/320" },
  { name: "Shortbow", ability: "dexterity", damageDiceCount: 1, damageDie: 6, damageType: "piercing", addAbilityModifier: true, range: "Ranged 80/320" },
  { name: "Rapier", ability: "dexterity", damageDiceCount: 1, damageDie: 8, damageType: "piercing", addAbilityModifier: true, range: "Melee 5 ft." },
  { name: "Longsword", ability: "strength", damageDiceCount: 1, damageDie: 8, damageType: "slashing", addAbilityModifier: true, range: "Melee 5 ft." },
  { name: "Greatsword", ability: "strength", damageDiceCount: 2, damageDie: 6, damageType: "slashing", addAbilityModifier: true, range: "Melee 5 ft." },
  { name: "Longbow", ability: "dexterity", damageDiceCount: 1, damageDie: 8, damageType: "piercing", addAbilityModifier: true, range: "Ranged 150/600" },
  { name: "Warhammer", ability: "strength", damageDiceCount: 1, damageDie: 8, damageType: "bludgeoning", addAbilityModifier: true, range: "Melee 5 ft." }
];

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
  const con = abilityModifier(constitutionScore); const hp = CLASS_HP[classId]; proficiencyBonus(level);
  const levelOne = Math.max(1, hp.levelOne + con);
  return level === 1 ? levelOne : levelOne + (level - 1) * Math.max(1, hp.fixedPerLevel + con);
}
export function defaultArmorClass(dexterityScore: number): number { return 10 + abilityModifier(dexterityScore); }
export function saveModifier(data: Dnd2024CharacterData, ability: Dnd2024Ability): number {
  return abilityModifier(data.abilities[ability]) + (DND2024_CLASS_SAVES[data.classId].includes(ability) ? proficiencyBonus(data.level) : 0);
}
export function skillModifier(data: Dnd2024CharacterData, skill: Dnd2024Skill): number {
  const definition = DND2024_SKILLS.find((item) => item.id === skill);
  if (!definition) throw new Error("unknown skill");
  return abilityModifier(data.abilities[definition.ability]) + (data.skillProficiencies.includes(skill) ? proficiencyBonus(data.level) : 0);
}
export function passivePerception(data: Dnd2024CharacterData): number { return 10 + skillModifier(data, "perception"); }
export function attackModifier(data: Dnd2024CharacterData, attack: Dnd2024Attack): number {
  return abilityModifier(data.abilities[attack.ability]) + (attack.proficient ? proficiencyBonus(data.level) : 0);
}

function normalizeChoice(value: unknown, label: string, options?: readonly string[]): string {
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const clean = value.trim().toLowerCase();
  if (!clean || clean.length > 80) throw new Error(`${label} must be 1-80 characters`);
  if (options && !options.includes(clean)) throw new Error(`${label} is not supported`);
  return clean;
}
function normalizeDisplayText(value: unknown, label: string, maxLength = 80): string {
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const clean = value.trim().replace(/\s+/g, " ");
  if (!clean || clean.length > maxLength) throw new Error(`${label} must be 1-${maxLength} characters`);
  return clean;
}
function normalizeScore(value: unknown, ability: Dnd2024Ability): number {
  const score = Number(value);
  if (!Number.isInteger(score) || score < 1 || score > 30) throw new Error(`${ability} must be an integer between 1 and 30`);
  return score;
}
function normalizeSkills(value: unknown): Dnd2024Skill[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("skill proficiencies must be an array");
  const allowed = new Set(DND2024_SKILLS.map((item) => item.id));
  const clean = value.map((item) => normalizeChoice(item, "skill"));
  if (clean.some((item) => !allowed.has(item as Dnd2024Skill))) throw new Error("skill proficiency is not supported");
  return [...new Set(clean)] as Dnd2024Skill[];
}
function normalizeAttack(value: unknown, index: number): Dnd2024Attack {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("attack must be an object");
  const input = value as Record<string, unknown>;
  const id = typeof input.id === "string" && input.id.trim() ? input.id.trim().slice(0, 100) : `attack-${index + 1}`;
  const ability = normalizeChoice(input.ability, "attack ability", DND2024_ABILITIES) as Dnd2024Ability;
  const damageDiceCount = Number(input.damageDiceCount);
  if (!Number.isInteger(damageDiceCount) || damageDiceCount < 1 || damageDiceCount > 10) throw new Error("damage dice count must be 1-10");
  const damageDie = Number(input.damageDie);
  if (![4, 6, 8, 10, 12].includes(damageDie)) throw new Error("unsupported damage die");
  return {
    id, name: normalizeDisplayText(input.name, "attack name"), ability, proficient: input.proficient === true,
    damageDiceCount, damageDie: damageDie as Dnd2024DamageDie, damageType: normalizeChoice(input.damageType, "damage type"),
    addAbilityModifier: input.addAbilityModifier !== false,
    range: typeof input.range === "string" ? input.range.trim().slice(0, 80) : ""
  };
}

export function normalizeDnd2024Data(value: unknown): Dnd2024CharacterData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("D&D 2024 data must be an object");
  const input = value as Record<string, unknown>;
  const abilityInput = typeof input.abilities === "object" && input.abilities !== null && !Array.isArray(input.abilities) ? input.abilities as Record<string, unknown> : {};
  const abilities = Object.fromEntries(DND2024_ABILITIES.map((ability) => [ability, normalizeScore(abilityInput[ability], ability)])) as unknown as Dnd2024AbilityScores;
  const level = Number(input.level); proficiencyBonus(level);
  const armorClass = Number(input.armorClass);
  if (!Number.isInteger(armorClass) || armorClass < 1 || armorClass > 99) throw new Error("armor class must be an integer between 1 and 99");
  const speed = Number(input.speed);
  if (!Number.isInteger(speed) || speed < 0 || speed > 999) throw new Error("speed must be an integer between 0 and 999");
  const attacks = input.attacks === undefined ? [] : Array.isArray(input.attacks) ? input.attacks.map(normalizeAttack) : (() => { throw new Error("attacks must be an array"); })();
  return {
    version: 2, classId: normalizeChoice(input.classId, "class", DND2024_CLASSES) as Dnd2024Class,
    species: normalizeChoice(input.species, "species"), background: normalizeChoice(input.background, "background"),
    level, abilities, armorClass, speed, notes: typeof input.notes === "string" ? input.notes.trim().slice(0, 4000) : "",
    skillProficiencies: normalizeSkills(input.skillProficiencies), attacks
  };
}
export function readDnd2024Data(value: unknown): Dnd2024CharacterData | null { try { return normalizeDnd2024Data(value); } catch { return null; } }
export function isDnd2024Data(value: unknown): boolean { return readDnd2024Data(value) !== null; }
