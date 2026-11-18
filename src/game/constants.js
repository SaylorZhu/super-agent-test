export const WORLD = {
  /** The player flies on the plane z = 0, near the bottom of the frame. */
  playerZ: 0,
  playerMinY: -12,
  playerMaxY: -2,
  /** Enemies spawn deep in the star field and dive toward the camera. */
  enemySpawnZ: -180,
  enemyDespawnZ: 18,
};

export const CAMERA = {
  fov: 60,
  near: 0.5,
  far: 5000,
  position: { x: 0, y: 14, z: 44 },
  target: { x: 0, y: -2, z: -56 },
  followX: 0.16,
  followY: 0.08,
};

export const PLAYER = {
  speed: 46,
  fireInterval: 0.135,
  maxLives: 3,
  radius: 2.1,
  respawnShield: 2.5,
  maxWeaponLevel: 3,
  scale: 1.4,
};

export const BOSS = {
  firstSpawnAt: 32,
  respawnDelay: 48,
  hp: 84,
  score: 500,
  radius: 18,
  scale: 4.2,
  name: "赤鸢母舰",
  z: -95,
  entryZ: -240,
};

export const STORAGE_KEYS = {
  best: "threejs-plane-game.best",
  muted: "threejs-plane-game.muted",
};

export const BULLET = {
  playerSpeed: 260,
  enemySpeed: 64,
  playerRadius: 1.2,
  enemyRadius: 1.1,
  /** Friendly shots recycle once they pass every spawnable target. */
  range: 360,
};

export const ENEMY_TYPES = {
  scout: {
    hp: 1,
    speed: 46,
    score: 10,
    radius: 2.8,
    sway: 5.5,
    swaySpeed: 1.9,
    fireInterval: 0,
    dropChance: 0.02,
  },
  fighter: {
    hp: 3,
    speed: 33,
    score: 30,
    radius: 4,
    sway: 7,
    swaySpeed: 1.3,
    fireInterval: 1.9,
    dropChance: 0.2,
  },
  heavy: {
    hp: 8,
    speed: 25,
    score: 80,
    radius: 5.4,
    sway: 4,
    swaySpeed: 0.8,
    fireInterval: 2.4,
    dropChance: 0.38,
  },
};
