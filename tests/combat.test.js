import { describe, expect, it } from "vitest";
import {
  basisFromDirection,
  circlesOverlap,
  difficultyAt,
  normalize,
  normalize3D,
  pointOnCircle,
  rotate,
  rotateAroundY,
  segmentSphereOverlap,
  spheresOverlap,
  weaponPattern,
} from "../src/game/core/combat.js";

describe("circlesOverlap", () => {
  it("detects overlapping and touching circles", () => {
    expect(circlesOverlap({ x: 0, y: 0, radius: 2 }, { x: 3, y: 0, radius: 1 })).toBe(true);
    expect(circlesOverlap({ x: 0, y: 0, radius: 2 }, { x: 3, y: 0, radius: 1.0001 })).toBe(true);
  });

  it("rejects circles that are apart", () => {
    expect(circlesOverlap({ x: 0, y: 0, radius: 1 }, { x: 4, y: 0, radius: 1 })).toBe(false);
  });

  it("is symmetric and handles diagonal distances", () => {
    const a = { x: -1, y: 1, radius: 1 };
    const b = { x: 1, y: -1, radius: 2 };
    expect(circlesOverlap(a, b)).toBe(circlesOverlap(b, a));
    expect(circlesOverlap(a, b)).toBe(true);
  });
});

describe("weaponPattern", () => {
  it("returns one centre shot at level 1", () => {
    expect(weaponPattern(1)).toEqual([{ offsetX: 0, angle: 0 }]);
  });

  it("returns a symmetric twin shot at level 2", () => {
    const pattern = weaponPattern(2);
    expect(pattern).toHaveLength(2);
    expect(pattern[0].offsetX).toBe(-pattern[1].offsetX);
    expect(pattern[0].angle).toBe(0);
  });

  it("returns a three-way spread at level 3", () => {
    const pattern = weaponPattern(3);
    expect(pattern).toHaveLength(3);
    expect(pattern[0].angle).toBe(0);
    expect(pattern[1].angle).toBe(-pattern[2].angle);
  });

  it("clamps unsupported levels instead of throwing", () => {
    expect(weaponPattern(0)).toEqual(weaponPattern(1));
    expect(weaponPattern(99)).toEqual(weaponPattern(3));
    expect(weaponPattern(Number.NaN)).toEqual(weaponPattern(1));
  });
});

describe("difficultyAt", () => {
  it("spawns faster as the run progresses", () => {
    expect(difficultyAt(0).spawnInterval).toBeGreaterThan(
      difficultyAt(30).spawnInterval,
    );
    expect(difficultyAt(300).spawnInterval).toBe(0.4);
  });

  it("unlocks enemy types over time", () => {
    const early = difficultyAt(0);
    const mid = difficultyAt(10);
    const late = difficultyAt(30);
    expect(early.fighterUnlocked).toBe(false);
    expect(mid.fighterUnlocked).toBe(true);
    expect(late.heavyUnlocked).toBe(true);
  });

  it("keeps a sensible formation chance", () => {
    expect(difficultyAt(0).formationChance).toBe(0);
    expect(difficultyAt(40).formationChance).toBeCloseTo(0.23);
    expect(difficultyAt(1000).formationChance).toBe(0.35);
  });

  it("treats negative elapsed time as zero", () => {
    expect(difficultyAt(-5)).toEqual(difficultyAt(0));
  });
});

describe("vector helpers", () => {
  it("normalizes vectors", () => {
    expect(normalize(3, 4)).toEqual({ x: 0.6, y: 0.8 });
  });

  it("falls back to pointing down for a zero vector", () => {
    expect(normalize(0, 0)).toEqual({ x: 0, y: -1 });
  });

  it("rotates by 90 degrees", () => {
    const rotated = rotate(1, 0, Math.PI / 2);
    expect(rotated.x).toBeCloseTo(0);
    expect(rotated.y).toBeCloseTo(1);
  });

  it("places points on a circle", () => {
    const point = pointOnCircle(0, 5);
    expect(point.x).toBeCloseTo(5);
    expect(point.y).toBeCloseTo(0);
  });
});

describe("3D hit detection", () => {
  it("separates spheres that are apart on the depth axis", () => {
    const a = { x: 0, y: 0, z: 0, radius: 2 };
    expect(spheresOverlap(a, { x: 0, y: 0, z: 4, radius: 1 })).toBe(false);
    expect(spheresOverlap(a, { x: 0, y: 0, z: 2.9, radius: 1 })).toBe(true);
  });

  it("treats a missing z as the flat plane", () => {
    expect(spheresOverlap({ x: 0, y: 0, radius: 2 }, { x: 3, y: 0, radius: 1 })).toBe(true);
  });

  it("catches fast projectiles that sweep through a target", () => {
    const from = { x: 0, y: 0, z: 20 };
    const to = { x: 0, y: 0, z: -20 };
    expect(segmentSphereOverlap(from, to, { x: 0, y: 0, z: 0 }, 1)).toBe(true);
    expect(segmentSphereOverlap(from, to, { x: 3, y: 0, z: 0 }, 1)).toBe(false);
  });

  it("only checks the travelled part of the segment", () => {
    const from = { x: 0, y: 0, z: 20 };
    const to = { x: 0, y: 0, z: 10 };
    expect(segmentSphereOverlap(from, to, { x: 0, y: 0, z: 0 }, 2)).toBe(false);
    expect(segmentSphereOverlap(from, to, { x: 0, y: 0, z: 10 }, 2)).toBe(true);
  });

  it("handles zero-length segments", () => {
    expect(segmentSphereOverlap({ x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 2)).toBe(true);
    expect(segmentSphereOverlap({ x: 5, y: 0, z: 0 }, { x: 5, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 2)).toBe(false);
  });
});

describe("3D vector helpers", () => {
  it("normalizes 3D vectors", () => {
    const vector = normalize3D(0, 3, 4);
    expect(vector.x).toBeCloseTo(0);
    expect(vector.y).toBeCloseTo(0.6);
    expect(vector.z).toBeCloseTo(0.8);
  });

  it("falls back to forward for an empty 3D vector", () => {
    expect(normalize3D(0, 0, 0)).toEqual({ x: 0, y: 0, z: -1 });
  });

  it("rotates a direction around the vertical axis", () => {
    const rotated = rotateAroundY(1, 0, 0, Math.PI / 2);
    expect(rotated.x).toBeCloseTo(0);
    expect(rotated.z).toBeCloseTo(-1);
  });

  it("builds an orthonormal firing basis", () => {
    const { forward, right, up } = basisFromDirection(0, 0, -1);
    expect(forward).toEqual({ x: 0, y: 0, z: -1 });
    expect(right.x).toBeCloseTo(1);
    expect(right.y).toBeCloseTo(0);
    expect(up.y).toBeCloseTo(1);
    expect(forward.x * right.x + forward.y * right.y + forward.z * right.z).toBeCloseTo(0);
    expect(forward.x * up.x + forward.y * up.y + forward.z * up.z).toBeCloseTo(0);
  });
});
