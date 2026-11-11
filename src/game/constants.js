export const WORLD = {
  height: 120,
  halfHeight: 60,
  playerStartY: -44,
  edgePadding: 5,
};

export const PLAYER = {
  speed: 58,
  fireInterval: 0.135,
  maxLives: 3,
  radius: 1.7,
  respawnShield: 2.5,
  maxWeaponLevel: 3,
};

export const BOSS = {
  firstSpawnAt: 32,
  respawnDelay: 48,
  hp: 72,
  score: 500,
  radius: 9.5,
  name: "赤鸢母舰",
};

export const STORAGE_KEYS = {
  best: "threejs-plane-game.best",
  muted: "threejs-plane-game.muted",
};

export const BULLET = {
  playerSpeed: 92,
  enemySpeed: 27,
  playerRadius: 0.45,
  enemyRadius: 0.55,
};

export const ENEMY_TYPES = {
  scout: {
    hp: 1,
    speed: 31,
    score: 10,
    radius: 1.5,
    sway: 4.5,
    swaySpeed: 2.1,
    fireInterval: 0,
    dropChance: 0.02,
  },
  fighter: {
    hp: 3,
    speed: 19,
    score: 30,
    radius: 2.1,
    sway: 6.5,
    swaySpeed: 1.35,
    fireInterval: 1.85,
    dropChance: 0.2,
  },
  heavy: {
    hp: 8,
    speed: 12,
    score: 80,
    radius: 2.9,
    sway: 3.2,
    swaySpeed: 0.85,
    fireInterval: 2.35,
    dropChance: 0.38,
  },
};
