import { describe, expect, it } from "vitest";
import {
  circlesOverlap,
  difficultyAt,
  normalize,
  pointOnCircle,
  rotate,
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
