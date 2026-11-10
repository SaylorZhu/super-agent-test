/**
 * Pure combat and pacing helpers. Kept free of three.js so the rules can be
 * unit tested without a WebGL context.
 */

/**
 * Circle-vs-circle hit test on the play plane.
 * @param {{x:number,y:number,radius:number}} a
 * @param {{x:number,y:number,radius:number}} b
 */
export function circlesOverlap(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const radius = a.radius + b.radius;
  return dx * dx + dy * dy <= radius * radius;
}

const WEAPON_PATTERNS = {
  1: [{ offsetX: 0, angle: 0 }],
  2: [
    { offsetX: -1.15, angle: 0 },
    { offsetX: 1.15, angle: 0 },
  ],
  3: [
    { offsetX: 0, angle: 0 },
    { offsetX: -1.35, angle: -0.14 },
    { offsetX: 1.35, angle: 0.14 },
  ],
};

/**
 * Horizontal offsets and firing angles for a weapon level. Levels are clamped
 * to the supported range so a stray value can never break shooting.
 */
export function weaponPattern(level) {
  const clamped = Math.min(3, Math.max(1, Math.round(level) || 1));
  return WEAPON_PATTERNS[clamped];
}

/**
 * Difficulty curve: spawns get faster and heavier ships unlock over time.
 * @param {number} elapsed seconds since the run started
 */
export function difficultyAt(elapsed) {
  const t = Math.max(0, elapsed);
  return {
    spawnInterval: Math.max(0.4, 0.95 - t * 0.012),
    fighterUnlocked: t >= 8,
    heavyUnlocked: t >= 24,
    formationChance: t >= 12 ? Math.min(0.35, 0.15 + t * 0.002) : 0,
    scrollSpeed: Math.min(2.4, 1 + t * 0.01),
  };
}

/**
 * Normalize a vector, returning a safe fallback when it has no length.
 */
export function normalize(x, y) {
  const length = Math.hypot(x, y);
  if (length < 1e-6) return { x: 0, y: -1 };
  return { x: x / length, y: y / length };
}

/**
 * Rotate a vector by an angle in radians.
 */
export function rotate(x, y, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

/**
 * Point on a circle of `radius` around the origin, at `angle` radians.
 */
export function pointOnCircle(angle, radius) {
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}
