/**
 * Pure combat and pacing helpers. Kept free of three.js so the rules can be
 * unit tested without a WebGL context.
 */

/**
 * Sphere-vs-sphere hit test. Positions may omit z, which is treated as 0 so
 * the same helper works for the old flat-plane rules.
 * @param {{x:number,y:number,z?:number,radius:number}} a
 * @param {{x:number,y:number,z?:number,radius:number}} b
 */
export function circlesOverlap(a, b) {
  return spheresOverlap(a, b);
}

export function spheresOverlap(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  const radius = a.radius + b.radius;
  return dx * dx + dy * dy + dz * dz <= radius * radius;
}

/**
 * Swept hit test for fast projectiles: does the segment from `from` to `to`
 * come within `radius` of `center`? This avoids tunnelling when a bullet
 * crosses an enemy between two frames.
 * @param {{x:number,y:number,z:number}} from
 * @param {{x:number,y:number,z:number}} to
 * @param {{x:number,y:number,z?:number}} center
 * @param {number} radius combined radius of the projectile and the target
 */
export function segmentSphereOverlap(from, to, center, radius) {
  const dzCenter = center.z ?? 0;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const fx = from.x - center.x;
  const fy = from.y - center.y;
  const fz = from.z - dzCenter;
  const lengthSq = dx * dx + dy * dy + dz * dz;

  let t = 0;
  if (lengthSq > 1e-9) {
    t = -(fx * dx + fy * dy + fz * dz) / lengthSq;
    t = Math.min(1, Math.max(0, t));
  }

  const px = fx + dx * t;
  const py = fy + dy * t;
  const pz = fz + dz * t;
  return px * px + py * py + pz * pz <= radius * radius;
}

const WEAPON_PATTERNS = {
  1: [{ offsetX: 0, angle: 0 }],
  2: [
    { offsetX: -1.15, angle: 0 },
    { offsetX: 1.15, angle: 0 },
  ],
  3: [
    { offsetX: 0, angle: 0 },
    { offsetX: -1.35, angle: -0.05 },
    { offsetX: 1.35, angle: 0.05 },
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
 * Normalize a 2D vector, returning a safe fallback when it has no length.
 */
export function normalize(x, y) {
  const length = Math.hypot(x, y);
  if (length < 1e-6) return { x: 0, y: -1 };
  return { x: x / length, y: y / length };
}

/**
 * Normalize a 3D vector, returning a safe forward fallback when empty.
 */
export function normalize3D(x, y, z) {
  const length = Math.hypot(x, y, z);
  if (length < 1e-6) return { x: 0, y: 0, z: -1 };
  return { x: x / length, y: y / length, z: z / length };
}

/**
 * Rotate a 2D vector by an angle in radians.
 */
export function rotate(x, y, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

/**
 * Rotate a 3D direction around the Y axis, used to fan shots horizontally.
 */
export function rotateAroundY(x, y, z, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: x * cos + z * sin, y, z: -x * sin + z * cos };
}

/**
 * Build an orthonormal basis around a forward direction. `right` and `up` are
 * useful for cone-shaped bullet spreads.
 */
export function basisFromDirection(dx, dy, dz) {
  const forward = normalize3D(dx, dy, dz);
  let right = { x: -forward.z, y: 0, z: forward.x };
  let rightLength = Math.hypot(right.x, right.z);
  if (rightLength < 1e-4) {
    right = { x: 1, y: 0, z: 0 };
    rightLength = 1;
  }
  right = { x: right.x / rightLength, y: 0, z: right.z / rightLength };
  const up = {
    x: right.y * forward.z - right.z * forward.y,
    y: right.z * forward.x - right.x * forward.z,
    z: right.x * forward.y - right.y * forward.x,
  };
  return { forward, right, up };
}

/**
 * Point on a circle of `radius` around the origin, at `angle` radians.
 */
export function pointOnCircle(angle, radius) {
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}
