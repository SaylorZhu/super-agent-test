import * as THREE from "three";
import {
  WORLD,
  CAMERA,
  PLAYER,
  BOSS,
  STORAGE_KEYS,
  BULLET,
  ENEMY_TYPES,
} from "./constants.js";
import {
  weaponPattern,
  difficultyAt,
  spheresOverlap,
  segmentSphereOverlap,
} from "./core/combat.js";
import { Input } from "./core/Input.js";
import { AudioEngine } from "./core/Audio.js";
import { Background } from "./world/Background.js";
import { Explosions } from "./world/Explosions.js";
import { Player } from "./entities/Player.js";
import { Enemy } from "./entities/Enemy.js";
import { Boss } from "./entities/Boss.js";
import { Bullet } from "./entities/Bullet.js";
import { PowerUp } from "./entities/PowerUp.js";
import { UI } from "./UI.js";

const ENEMY_BURST_COLORS = {
  scout: 0xff7a7a,
  fighter: 0xd86bff,
  heavy: 0xffb454,
};

const clamp = THREE.MathUtils.clamp;

function readBest() {
  try {
    const value = Number.parseInt(localStorage.getItem(STORAGE_KEYS.best) ?? "0", 10);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function readMuted() {
  try {
    return localStorage.getItem(STORAGE_KEYS.muted) === "true";
  } catch {
    return false;
  }
}

function persist(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Storage can be unavailable in private mode; the game still works.
  }
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.best = readBest();
    this.muted = readMuted();
    this.state = "menu";
    this.time = 0;
    this.score = 0;
    this.elapsed = 0;
    this.spawnTimer = 0;
    this.nextBossAt = BOSS.firstSpawnAt;
    this.boss = null;
    this.deathTimer = 0;
    this.deathBurstTimer = 0;
    this.shake = 0;
    this.enemies = [];
    this.bullets = [];
    this.powerUps = [];

    this.ui = new UI({
      onStart: () => this.startRun(),
      onResume: () => this.resume(),
      onQuit: () => this.toMenu(),
      onMenu: () => this.toMenu(),
      onPause: () => this.togglePause(),
      onMute: () => this.toggleMute(),
    });

    this.audio = new AudioEngine();
    this.audio.muted = this.muted;
    this.ui.setMuted(this.muted);

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch (error) {
      console.error("WebGL initialisation failed", error);
      this.ui.showError();
      this.failed = true;
      return;
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x03040b);
    this.scene.fog = new THREE.FogExp2(0x03040b, 0.00075);

    this.camera = new THREE.PerspectiveCamera(
      CAMERA.fov,
      window.innerWidth / Math.max(window.innerHeight, 1),
      CAMERA.near,
      CAMERA.far,
    );
    this.camera.position.set(CAMERA.position.x, CAMERA.position.y, CAMERA.position.z);

    this.createLights();
    this.background = new Background(this.scene);
    this.explosions = new Explosions(this.scene, this.camera);
    this.player = new Player(this.scene);

    this.input = new Input(canvas, {
      onPause: () => this.togglePause(),
      onMute: () => this.toggleMute(),
      onConfirm: () => this.handleConfirm(),
      onPointerDown: () => this.anchorTouchDrag(),
    });

    this.resize();
    this.player.reset(0, -9);
    this.ui.showMenu(this.best);

    this.handleResize = () => this.resize();
    this.handleVisibility = () => {
      if (document.hidden && this.state === "playing") this.togglePause();
    };
    window.addEventListener("resize", this.handleResize);
    document.addEventListener("visibilitychange", this.handleVisibility);

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    if (import.meta.env.DEV) {
      window.__planeGame = this;
    }
  }

  createLights() {
    this.scene.add(new THREE.AmbientLight(0x9fb8ff, 1.7));

    const key = new THREE.DirectionalLight(0xffffff, 2.9);
    key.position.set(40, 70, 90);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0xff5c96, 1.7);
    rim.position.set(-70, -20, 50);
    this.scene.add(rim);

    const fill = new THREE.DirectionalLight(0x58e8ff, 1.2);
    fill.position.set(0, -60, 80);
    this.scene.add(fill);
  }

  resize() {
    if (!this.renderer) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height, false);

    const aspect = width / Math.max(height, 1);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    // Visible extents on the player's plane (z = 0), used for input mapping
    // and to keep the ship and enemy lanes inside the frame.
    const distance = CAMERA.position.z - WORLD.playerZ;
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(CAMERA.fov * 0.5)) * distance;
    const halfWidth = halfHeight * aspect;
    this.halfHeight = halfHeight;
    this.halfWidth = halfWidth;

    this.bounds = {
      minX: -halfWidth * 0.64,
      maxX: halfWidth * 0.64,
      minY: WORLD.playerMinY,
      maxY: WORLD.playerMaxY,
    };
    this.spawnHalfWidth = Math.max(7, halfWidth * 0.62);

    this.background.resize(halfWidth, halfHeight);

    if (this.state === "menu") {
      this.player.group.position.y = this.bounds.minY + 3;
    }
  }

  animate() {
    requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;

    if (this.state !== "paused") {
      this.background.update(dt, this.state === "playing" ? 1.35 : 0.55);
      this.explosions.update(dt);
    }

    if (this.state === "playing") {
      this.updatePlaying(dt);
    } else if (this.state === "dying") {
      this.updateDying(dt);
    } else if (this.state === "menu") {
      this.updateMenu(dt);
    }

    this.updateShake(dt);
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }

  updateMenu(dt) {
    const player = this.player;
    const sway = Math.min(this.halfWidth * 0.55, 18);
    player.group.visible = true;
    player.group.position.x = Math.sin(this.time * 0.55) * sway;
    player.group.position.y = this.bounds.minY + 3.4 + Math.sin(this.time * 0.9) * 1.1;
    player.group.rotation.z = Math.sin(this.time * 0.55) * 0.12;
    player.group.rotation.x = Math.sin(this.time * 0.7) * 0.05;
    player.idle(dt);
  }

  updatePlaying(dt) {
    this.elapsed += dt;

    if (this.player.update(dt, this.bounds, this.buildControls())) {
      this.firePlayerWeapon();
    }

    this.updateSpawning(dt);
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateBullets(dt);
    this.updatePowerUps(dt);
    this.handleCollisions();

    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    this.bullets = this.bullets.filter((bullet) => !bullet.dead);
    this.powerUps = this.powerUps.filter((powerUp) => !powerUp.dead);
  }

  updateDying(dt) {
    this.deathTimer -= dt;
    this.deathBurstTimer -= dt;

    if (this.deathBurstTimer <= 0) {
      this.deathBurstTimer = 0.22;
      this.explosions.spawn(
        this.player.x + (Math.random() - 0.5) * 6,
        this.player.y + (Math.random() - 0.5) * 4,
        this.player.z + (Math.random() - 0.5) * 4,
        {
          color: 0xffc46b,
          count: 18,
          speed: 42,
          size: 5.5,
          life: 0.8,
          ring: Math.random() < 0.3,
          spread: 1.4,
        },
      );
    }

    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateBullets(dt);
    this.updatePowerUps(dt);

    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    this.bullets = this.bullets.filter((bullet) => !bullet.dead);
    this.powerUps = this.powerUps.filter((powerUp) => !powerUp.dead);

    if (this.deathTimer <= 0) this.finishRun();
  }

  anchorTouchDrag() {
    if (this.state !== "playing") return;
    this.pointerAnchor = { x: this.player.x, y: this.player.y };
  }

  /** Map normalised device coordinates onto the player's plane. */
  pointerToWorld(nx, ny) {
    const point = new THREE.Vector3(nx, ny, 0.5).unproject(this.camera);
    const direction = point.sub(this.camera.position).normalize();
    const dz = direction.z;
    if (Math.abs(dz) < 1e-4) return { x: this.player.x, y: this.player.y };
    const distance = (WORLD.playerZ - this.camera.position.z) / dz;
    return {
      x: this.camera.position.x + direction.x * distance,
      y: this.camera.position.y + direction.y * distance,
    };
  }

  buildControls() {
    const pointer = this.input.pointer;
    const pointerActive = pointer.active;
    let pointerWorld = null;

    if (pointerActive) {
      if (pointer.type === "mouse") {
        pointerWorld = this.pointerToWorld(pointer.x, pointer.y);
      } else if (pointer.down) {
        // Relative drag: the ship follows the finger's travel, so the finger
        // never has to sit on top of the ship.
        pointerWorld = {
          x: this.pointerAnchor.x + pointer.deltaX * this.halfWidth * 1.3,
          y: this.pointerAnchor.y + pointer.deltaY * this.halfHeight * 1.3,
        };
      }
    }

    return {
      axis: this.input.axis,
      pointerActive: Boolean(pointerWorld),
      pointerWorld,
    };
  }

  firePlayerWeapon() {
    const pattern = weaponPattern(this.player.weaponLevel);
    for (const shot of pattern) {
      const origin = this.player.glowMuzzle(shot.offsetX, shot.angle);
      const speed = BULLET.playerSpeed;
      this.bullets.push(
        new Bullet(this.scene, {
          x: origin.x,
          y: origin.y,
          z: origin.z,
          vx: Math.sin(shot.angle) * speed,
          vy: 0,
          vz: -Math.cos(shot.angle) * speed,
          radius: BULLET.playerRadius,
          damage: 1,
          friendly: true,
        }),
      );
    }
    this.audio.shoot();
  }

  updateSpawning(dt) {
    if (!this.boss && this.elapsed >= this.nextBossAt) {
      this.summonBoss();
      return;
    }

    if (this.boss) return;

    const difficulty = difficultyAt(this.elapsed);
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;

    this.spawnTimer = difficulty.spawnInterval * (0.78 + Math.random() * 0.44);

    if (this.enemies.length >= 24) return;

    if (Math.random() < difficulty.formationChance) {
      this.spawnFormation(difficulty);
    } else {
      this.spawnSingle(difficulty);
    }
  }

  spawnSingle(difficulty) {
    const roll = Math.random();
    let kind = "scout";
    if (difficulty.heavyUnlocked && roll < 0.16) {
      kind = "heavy";
    } else if (difficulty.fighterUnlocked && roll < 0.52) {
      kind = "fighter";
    }

    const x = (Math.random() * 2 - 1) * this.spawnHalfWidth;
    const z = WORLD.enemySpawnZ - Math.random() * 30;
    const y = this.player.y + (Math.random() - 0.5) * 22;
    const targetY = this.player.y + (Math.random() - 0.5) * 6;
    this.enemies.push(new Enemy(this, kind, { x, y, z, targetY }));

    // Early waves arrive as loose wing pairs so the opening minute stays lively.
    if (kind === "scout" && this.enemies.length < 22 && Math.random() < 0.34) {
      const wingX = clamp(x + (Math.random() < 0.5 ? -8 : 8), -this.spawnHalfWidth, this.spawnHalfWidth);
      this.enemies.push(
        new Enemy(this, "scout", {
          x: wingX,
          y: y + 3,
          z: z - 10,
          targetY,
          phase: Math.random() * Math.PI,
        }),
      );
    }
  }

  spawnFormation(difficulty) {
    const center = (Math.random() * 2 - 1) * Math.max(0, this.spawnHalfWidth - 6);
    const top = this.player.y + 4;
    const offsets = [
      { x: -8, y: -2, z: -6 },
      { x: 0, y: 3, z: 0 },
      { x: 8, y: -2, z: -6 },
    ];

    for (let i = 0; i < offsets.length; i += 1) {
      this.enemies.push(
        new Enemy(this, "scout", {
          x: clamp(center + offsets[i].x, -this.spawnHalfWidth, this.spawnHalfWidth),
          y: top + offsets[i].y,
          z: WORLD.enemySpawnZ + offsets[i].z,
          targetY: this.player.y,
          phase: i * 0.9,
        }),
      );
    }

    if (difficulty.fighterUnlocked && Math.random() < 0.22) {
      this.enemies.push(
        new Enemy(this, "fighter", {
          x: center,
          y: top + 8,
          z: WORLD.enemySpawnZ - 12,
          targetY: this.player.y,
          phase: Math.random() * Math.PI,
        }),
      );
    }
  }

  updateEnemies(dt) {
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.update(dt, this);
      if (enemy.z > WORLD.enemyDespawnZ) {
        enemy.destroy();
      }
    }
  }

  updateBoss(dt) {
    if (!this.boss || this.boss.dead) return;
    this.boss.update(dt, this);
    this.ui.updateBoss(this.boss.hp, this.boss.maxHp);
  }

  updateBullets(dt) {
    for (const bullet of this.bullets) {
      if (bullet.dead) continue;
      bullet.update(dt);
      if (bullet.isOutside()) {
        bullet.destroy();
      }
    }
  }

  updatePowerUps(dt) {
    for (const powerUp of this.powerUps) {
      if (powerUp.dead) continue;
      powerUp.update(dt, this.player);
      if (powerUp.isOutside) powerUp.destroy();
    }
  }

  handleCollisions() {
    const player = this.player;
    const playerHitbox = {
      x: player.x,
      y: player.y,
      z: player.z,
      radius: PLAYER.radius,
    };

    // Power-ups can be picked up even while the respawn shield is active.
    if (player.alive) {
      for (const powerUp of this.powerUps) {
        if (powerUp.dead) continue;
        if (!spheresOverlap(powerUp, playerHitbox)) continue;
        this.collectPowerUp(powerUp);
      }
    }

    // Player bullets vs enemies and boss, swept so fast shots do not tunnel.
    for (const bullet of this.bullets) {
      if (!bullet.friendly || bullet.dead) continue;

      if (
        this.boss &&
        !this.boss.dead &&
        segmentSphereOverlap(
          bullet.prev,
          bullet.position,
          this.boss,
          this.boss.radius + bullet.radius,
        )
      ) {
        bullet.destroy();
        if (this.boss.takeDamage(bullet.damage)) {
          this.defeatBoss();
        } else {
          this.explosions.spark(bullet.x, bullet.y, bullet.z, 0xff9ab0);
          this.ui.updateBoss(this.boss.hp, this.boss.maxHp);
        }
        continue;
      }

      for (const enemy of this.enemies) {
        if (enemy.dead) continue;
        if (
          !segmentSphereOverlap(
            bullet.prev,
            bullet.position,
            enemy,
            enemy.radius + bullet.radius,
          )
        ) {
          continue;
        }

        bullet.destroy();
        if (enemy.takeDamage(bullet.damage)) {
          this.destroyEnemy(enemy);
        } else {
          this.explosions.spark(bullet.x, bullet.y, bullet.z);
        }
        break;
      }
    }

    if (!player.alive || player.invulnerable > 0) return;

    // Hostile bullets vs player.
    for (const bullet of this.bullets) {
      if (bullet.friendly || bullet.dead) continue;
      if (
        !segmentSphereOverlap(
          bullet.prev,
          bullet.position,
          playerHitbox,
          PLAYER.radius + bullet.radius,
        )
      ) {
        continue;
      }

      bullet.destroy();
      this.hitPlayer();
      if (!player.alive) return;
    }

    if (!player.alive || player.invulnerable > 0) return;

    // Ramming enemies.
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      if (!spheresOverlap(enemy, playerHitbox)) continue;

      this.destroyEnemy(enemy, { reward: false });
      this.hitPlayer();
      return;
    }
  }

  destroyEnemy(enemy, { reward = true } = {}) {
    if (enemy.dead) return;
    const { x, y, z } = enemy;
    const kind = enemy.kind;
    enemy.destroy();

    this.explosions.spawn(x, y, z, {
      color: ENEMY_BURST_COLORS[kind] ?? 0xffa64d,
      count: kind === "heavy" ? 44 : kind === "fighter" ? 32 : 22,
      speed: kind === "heavy" ? 62 : 48,
      size: kind === "heavy" ? 8 : 6,
      life: 0.75,
      ring: true,
      spread: kind === "heavy" ? 1.6 : 1,
    });
    this.audio.explosion(kind === "heavy" ? 1.3 : 0.7);
    this.addShake(kind === "heavy" ? 0.9 : 0.35);

    if (reward) {
      this.addScore(ENEMY_TYPES[kind].score);
      if (this.player.alive) {
        const dropChance = enemy.config.dropChance;
        if (Math.random() < dropChance) {
          this.powerUps.push(new PowerUp(this.scene, x, y, z));
        }
      }
    }
  }

  hitPlayer() {
    const player = this.player;
    if (!player.hit()) return;

    this.ui.setLives(player.lives);
    this.ui.setPower(player.weaponLevel);
    this.explosions.spawn(player.x, player.y, player.z, {
      color: 0x7df9ff,
      count: 38,
      speed: 55,
      size: 6.5,
      life: 0.9,
      ring: true,
      spread: 1.2,
    });
    this.addShake(2);
    this.audio.playerHit();

    if (!player.alive) this.beginDeath();
  }

  beginDeath() {
    this.state = "dying";
    this.deathTimer = 1.6;
    this.deathBurstTimer = 0;
    this.player.group.visible = false;
    this.explosions.spawn(this.player.x, this.player.y, this.player.z, {
      color: 0xffc46b,
      count: 70,
      speed: 78,
      size: 8,
      life: 1.2,
      ring: true,
      spread: 2,
    });
    this.addShake(3.2);
    this.audio.explosion(1.6);
    this.ui.hideWarning();
  }

  finishRun() {
    this.state = "gameover";
    const record = this.score > this.best;
    this.best = Math.max(this.best, this.score);
    persist(STORAGE_KEYS.best, this.best);
    this.ui.hideBoss();
    this.ui.hideHud();
    this.ui.showGameOver({ score: this.score, best: this.best, record });
    this.audio.gameOver();
  }

  collectPowerUp(powerUp) {
    powerUp.destroy();
    const upgraded = this.player.addPower();
    this.ui.setPower(this.player.weaponLevel);

    if (upgraded) {
      this.addScore(50);
      this.ui.toast(`火力提升 · Lv.${this.player.weaponLevel}`);
    } else {
      this.addScore(150);
      this.ui.toast("火力已满 · +150");
    }

    this.audio.powerUp();
    this.explosions.spawn(powerUp.x, powerUp.y, powerUp.z, {
      color: 0x46ffc2,
      count: 20,
      speed: 32,
      size: 4.5,
      life: 0.55,
      ring: false,
      spread: 0.6,
    });
  }

  summonBoss() {
    this.boss = new Boss(this);
    this.ui.showBoss(BOSS.name, BOSS.hp);
    this.ui.showWarning();
    this.audio.bossWarning();
    this.addShake(0.8);
  }

  defeatBoss() {
    if (!this.boss) return;
    const { x, y, z } = this.boss;
    this.boss.destroy();
    this.boss = null;
    this.ui.hideBoss();
    this.addScore(BOSS.score);
    this.addShake(3.4);
    this.audio.explosion(1.6);

    for (let i = 0; i < 10; i += 1) {
      this.explosions.spawn(
        x + (Math.random() - 0.5) * 42,
        y + (Math.random() - 0.5) * 28,
        z + (Math.random() - 0.5) * 20,
        {
          color: i % 3 === 0 ? 0xffe9a8 : 0xff5d86,
          count: 30,
          speed: 58,
          size: 7,
          life: 1,
          ring: i % 2 === 0,
          spread: 1.8,
        },
      );
    }

    for (let i = 0; i < 2; i += 1) {
      this.powerUps.push(
        new PowerUp(this.scene, x + (i === 0 ? -5 : 5), y, z),
      );
    }

    for (const bullet of this.bullets) {
      if (!bullet.friendly) bullet.destroy();
    }

    this.nextBossAt = this.elapsed + BOSS.respawnDelay;
    this.ui.toast(`母舰击破 · +${BOSS.score}`);
  }

  addScore(points) {
    this.score += points;
    this.ui.setScore(this.score);
  }

  spawnEnemyBullet(x, y, z, vx, vy, vz, radius = BULLET.enemyRadius) {
    this.bullets.push(
      new Bullet(this.scene, {
        x,
        y,
        z,
        vx,
        vy,
        vz,
        radius,
        damage: 1,
        friendly: false,
      }),
    );
  }

  addShake(amount) {
    this.shake = Math.max(this.shake, amount);
  }

  updateShake(dt) {
    if (this.shake > 0.01) {
      this.shake *= Math.exp(-7 * dt);
    } else {
      this.shake = 0;
    }
  }

  updateCamera() {
    const base = CAMERA.position;
    const player = this.player;
    const menu = this.state === "menu";
    const follow = menu ? 0.26 : CAMERA.followX;
    const followY = menu ? 0.26 : CAMERA.followY;
    const drift = menu ? Math.sin(this.time * 0.25) * 1.6 : 0;
    const shakeX = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const shakeY = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const px = player.group.position.x;
    const py = player.group.position.y;

    this.camera.position.set(
      base.x + px * follow + drift + shakeX,
      base.y + (py + 11) * followY + shakeY,
      base.z,
    );

    this.camera.lookAt(
      px * follow * 0.3 + shakeX * 0.6,
      CAMERA.target.y + (py + 11) * 0.12 + shakeY * 0.6,
      CAMERA.target.z,
    );
    this.camera.rotateZ(clamp(-player.velocityX * 0.00055, -0.06, 0.06));
  }

  startRun() {
    if (this.failed) return;
    this.audio.resume();
    this.audio.uiClick();
    this.clearRun();

    this.state = "playing";
    this.score = 0;
    this.elapsed = 0;
    this.spawnTimer = 0.9;
    this.nextBossAt = BOSS.firstSpawnAt;
    this.shake = 0;

    this.player.reset(0, -9);
    this.player.group.rotation.set(0, 0, 0);
    this.input.clearPointer();
    this.ui.hideWarning();

    this.ui.startRun(0);
    this.ui.setLives(this.player.lives);
    this.ui.setPower(this.player.weaponLevel);
  }

  clearRun() {
    for (const enemy of this.enemies) enemy.destroy();
    this.enemies = [];

    for (const bullet of this.bullets) bullet.destroy();
    this.bullets = [];

    for (const powerUp of this.powerUps) powerUp.destroy();
    this.powerUps = [];

    this.boss?.destroy();
    this.boss = null;
    this.explosions.clear();
  }

  toMenu() {
    if (this.state === "menu") return;
    this.audio.uiClick();
    this.clearRun();
    this.state = "menu";
    this.player.reset(0, this.bounds.minY + 3);
    this.player.group.rotation.set(0, 0, 0);
    this.ui.showMenu(this.best);
  }

  resume() {
    if (this.state !== "paused") return;
    this.state = "playing";
    this.ui.hidePause();
    this.clock.getDelta();
  }

  togglePause() {
    if (this.state === "playing") {
      this.state = "paused";
      // Avoid drifting toward a stale pointer position when play resumes.
      this.input.clearPointer();
      this.ui.showPause();
    } else if (this.state === "paused") {
      this.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    this.audio.init();
    this.audio.setMuted(this.muted);
    this.ui.setMuted(this.muted);
    persist(STORAGE_KEYS.muted, this.muted);
  }

  handleConfirm() {
    if (this.state === "menu" || this.state === "gameover") {
      this.startRun();
    } else if (this.state === "paused") {
      this.resume();
    }
  }
}
