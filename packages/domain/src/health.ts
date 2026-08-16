export function clampHitPoints(current: number, max: number, delta: number): number {
  if (!Number.isInteger(current) || !Number.isInteger(max) || max <= 0) {
    throw new RangeError("hit points must be integer values with max > 0");
  }
  if (!Number.isInteger(delta) || delta < -100 || delta > 100) {
    throw new RangeError("HP delta must be an integer between -100 and 100");
  }
  return Math.min(max, Math.max(0, current + delta));
}
