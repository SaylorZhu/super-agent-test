import * as THREE from "three";
import { createPlane, getFlames, animateFlames } from "../models/planes.js";
import { BULLET, ENEMY_TYPES } from "../constants.js";
import { normalize3D, rotateAroundY } from "../core/combat.js";

const MODELS = {
  scout: { scale: 1.5, name: "侦察机" },
  fighter: { scale: 1.72, name: "截击机" },
  heavy: { scale: 2.1, name: "重炮机" },
};

const LOCAL_NOSE = new THREE.Vector3(0, 1, 0);
const TOWARD_CAMERA = new THREE.Vector3(0, 0, 1);
const ROLL = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

/** Enemy planes face the camera: nose toward +z, canopy toward +y. */
function faceCamera(model) {
  const arc = new THREE.Quaternion().setFromUnitVectors(LOCAL_NOSE, TOWARD_CAMERA);
  model.quaternion.copy(arc).multiply(ROLL);
}

export class Enemy {
  constructor(game, kind, { x, y, z, targetY, phase = Math.random() * Math.PI * 2 }) {
    this.game = game;
    this.kind = kind;
    this.config = ENEMY_TYPES[kind];
    this.model = MODELS[kind];
    this.radius = this.config.radius;
    this.hp = this.config.hp;
    this.phase = phase;
    this.age = Math.random() * 4;
    this.baseX = x;
    this.spawnY = y;
    this.targetY = targetY;
    this.spawnZ = z;
    this.scale = this.model.scale;
    this.dead = false;
    this.hitFlash = 0;
    this.fireTimer = this.config.fireInterval
      ? this.config.fireInterval * (0.7 + Math.random() * 0.7)
      : Infinity;

    this.group = new THREE.Group();
    this.plane = createPlane(kind);
    faceCamera(this.plane);
    this.plane.scale.setScalar(this.scale);
    this.group.add(this.plane);
    this.flames = getFlames(this.plane);
    this.group.position.set(x, y, z);
    this.scene = game.scene;
    this.scene.add(this.group);
  }

  get x() {
    return this.group.position.x;
  }

  get y() {
    return this.group.position.y;
  }

  get z() {
    return this.group.position.z;
  }

  update(dt, game) {
    const config = this.config;
    this.age += dt;

    const z = this.group.position.z + config.speed * dt;
    this.group.position.z = z;

    const travelled = Math.max(0, (this.spawnZ - z) / Math.max(1, -this.spawnZ));
    const depth = Math.min(1, travelled);
    this.group.position.y = this.spawnY + (this.targetY - this.spawnY) * depth;
    this.group.position.x = this.baseX + Math.sin(this.age * config.swaySpeed + this.phase) * config.sway;

    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - dt);
    }
    const flashScale = this.scale * (1 + this.hitFlash * 2.4);
    this.plane.scale.setScalar(flashScale);
    this.group.rotation.z = Math.cos(this.age * config.swaySpeed + this.phase) * 0.18;
    this.group.rotation.y = Math.sin(this.age * config.swaySpeed * 0.7 + this.phase) * 0.12;

    animateFlames(this.flames, this.age, 0.8);

    if (config.fireInterval && z < -55 && z > -170) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        this.fire(game);
        this.fireTimer = config.fireInterval * (0.85 + Math.random() * 0.35);
      }
    }
  }

  fire(game) {
    const aim = normalize3D(game.player.x - this.x, game.player.y - this.y, game.player.z - this.z);
    const speed = BULLET.enemySpeed;
    const originY = this.y;
    const originZ = this.z + 3;

    if (this.kind === "heavy") {
      for (const offset of [-0.16, 0, 0.16]) {
        const direction = rotateAroundY(aim.x, aim.y, aim.z, offset);
        game.spawnEnemyBullet(this.x, originY, originZ, direction.x * speed, direction.y * speed, direction.z * speed);
      }
    } else {
      game.spawnEnemyBullet(this.x, originY, originZ, aim.x * speed, aim.y * speed, aim.z * speed);
    }
    game.audio.enemyShoot();
  }

  takeDamage(damage) {
    this.hp -= damage;
    this.hitFlash = 0.08;
    return this.hp <= 0;
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.scene.remove(this.group);
  }
}
