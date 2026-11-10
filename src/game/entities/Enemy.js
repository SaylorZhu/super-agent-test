import * as THREE from "three";
import { createPlane, getFlames, animateFlames } from "../models/planes.js";
import { ENEMY_TYPES } from "../constants.js";
import { normalize, rotate } from "../core/combat.js";

const MODELS = {
  scout: { scale: 0.82, name: "侦察机" },
  fighter: { scale: 0.95, name: "截击机" },
  heavy: { scale: 1.08, name: "重炮机" },
};

export class Enemy {
  constructor(game, kind, { x, y, phase = Math.random() * Math.PI * 2 }) {
    this.game = game;
    this.kind = kind;
    this.config = ENEMY_TYPES[kind];
    this.model = MODELS[kind];
    this.radius = this.config.radius;
    this.hp = this.config.hp;
    this.phase = phase;
    this.age = Math.random() * 4;
    this.baseX = x;
    this.scale = this.model.scale;
    this.dead = false;
    this.hitFlash = 0;
    this.fireTimer = this.config.fireInterval
      ? this.config.fireInterval * (0.7 + Math.random() * 0.7)
      : Infinity;

    this.group = createPlane(kind);
    this.group.scale.setScalar(this.scale);
    this.group.position.set(x, y, 0);
    this.group.rotation.z = Math.PI;
    this.flames = getFlames(this.group);
    this.scene = game.scene;
    this.scene.add(this.group);
  }

  get x() {
    return this.group.position.x;
  }

  get y() {
    return this.group.position.y;
  }

  update(dt, game) {
    const config = this.config;
    this.age += dt;

    this.group.position.y -= config.speed * dt;
    const sway = Math.sin(this.age * config.swaySpeed + this.phase) * config.sway;
    this.group.position.x = this.baseX + sway;

    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - dt);
    }
    const flashScale = this.scale * (1 + this.hitFlash * 2.4);
    this.group.scale.setScalar(flashScale);
    this.group.rotation.z = Math.PI + Math.cos(this.age * config.swaySpeed + this.phase) * 0.14;

    animateFlames(this.flames, this.age, 0.8);

    if (config.fireInterval && this.group.position.y < game.halfHeight - 8) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        this.fire(game);
        this.fireTimer = config.fireInterval * (0.85 + Math.random() * 0.35);
      }
    }
  }

  fire(game) {
    const dx = game.player.x - this.x;
    const dy = game.player.y - this.y;
    const aim = normalize(dx, dy);
    const speed = 27;

    if (this.kind === "heavy") {
      for (const offset of [-0.22, 0, 0.22]) {
        const direction = rotate(aim.x, aim.y, offset);
        game.spawnEnemyBullet(this.x, this.y - 2.4, direction.x * speed, direction.y * speed);
      }
    } else {
      game.spawnEnemyBullet(this.x, this.y - 2.2, aim.x * speed, aim.y * speed);
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
