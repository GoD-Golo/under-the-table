export const ALLOWED_DICE = [4, 6, 8, 10, 12, 20, 100] as const;
export type DieSides = (typeof ALLOWED_DICE)[number];
export type RandomInt = (minInclusive: number, maxExclusive: number) => number;

export interface DiceRoll {
  sides: DieSides;
  natural: number;
  modifier: number;
  total: number;
}

export function isDieSides(value: number): value is DieSides {
  return (ALLOWED_DICE as readonly number[]).includes(value);
}

export function validateModifier(value: number): number {
  if (!Number.isInteger(value) || value < -20 || value > 20) {
    throw new RangeError("modifier must be an integer between -20 and 20");
  }
  return value;
}

export function rollDie(sides: number, modifier: number, randomInt: RandomInt): DiceRoll {
  if (!isDieSides(sides)) throw new RangeError("unsupported die size");
  validateModifier(modifier);
  const natural = randomInt(1, sides + 1);
  if (!Number.isInteger(natural) || natural < 1 || natural > sides) {
    throw new RangeError("random source returned an out-of-range value");
  }
  return { sides, natural, modifier, total: natural + modifier };
}
