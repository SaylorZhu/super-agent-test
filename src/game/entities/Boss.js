import * as THREE from "three";
import { createPlane, getFlames, animateFlames } from "../models/planes.js";
import { BOSS } from "../constants.js";
import { normalize, rotate } from "../core/combat.js";

const FIGHT_Y = 33;

export class Boss {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;

    this.scale = Math.min(2, Math.max(1.35, game.halfWidth / 45));
    this.group = createPlane("boss");
    this.group.scale.setScalar(this.scale);
    this.group.position.set(0, 78, 0);
    this.group.rotation.z = Math.PI;
    this.flames = getFlames(this.group);
    this.core = this.group.getObjectByName("core");
    this.radius = 4.75 * this.scale;
    this.maxHp = BOSS.hp;
    this.hp = BOSS.hp;
    this.time = 0;
    this.phase = "enter";
    this.attackTimer = 1.6;
    this.attackIndex = 0;
    this.dead = false;

    this.scene.add(this.group);
  }

  get x() {
    return this.group.position.x;
  }

  get y() {
    return this.group.position.y;
  }

  update(dt, game) {
    this.time += dt;
    animateFlames(this.flames, this.time, 1.15);

    if (this.phase === "enter") {
      this.group.position.y -= 22 * dt;
      if (this.group.position.y <= FIGHT_Y) {
        this.group.position.y = FIGHT_Y;
        this.phase = "fight";
      }
      return;
    }

    const swayRange = Math.min(game.halfWidth * 0.5, 34);
    this.group.position.x = Math.sin(this.time * 0.55) * swayRange;
    this.group.position.y = FIGHT_Y + Math.sin(this.time * 1.2) * 1.6;
    this.group.rotation.z = Math.PI + Math.cos(this.time * 0.55) * 0.08;

    if (this.core) {
      const pulse = 1 + Math.sin(this.time * 6) * 0.12;
      this.core.scale.setScalar(pulse);
      this.core.rotation.y += dt * 2.5;
    }

    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      this.attack(game);
      this.attackTimer = 1.45 + Math.random() * 0.4;
    }
  }

  attack(game) {
    const pattern = this.attackIndex % 3;
    this.attackIndex += 1;
    const originY = this.y - 3;

    if (pattern === 0) {
      // Aimed three-shot burst.
      const aim = normalize(game.player.x - this.x, game.player.y - this.y);
      for (const offset of [-0.18, 0, 0.18]) {
        const direction = rotate(aim.x, aim.y, offset);
        game.spawnEnemyBullet(
          this.x,
          originY,
          direction.x * 28,
          direction.y * 28,
          0.55,
        );
      }
    } else if (pattern === 1) {
      // Radial bloom.
      const count = 14;
      const twist = this.time * 0.5;
      for (let i = 0; i < count; i += 1) {
        const angle = twist + (i / count) * Math.PI * 2;
        game.spawnEnemyBullet(
          this.x,
          originY,
          Math.cos(angle) * 21,
          Math.sin(angle) * 21,
          0.5,
        );
      }
    } else {
      // Downward fan.
      for (let i = 0; i < 5; i += 1) {
        const angle = -Math.PI / 2 + (i - 2) * 0.23;
        game.spawnEnemyBullet(
          this.x,
          originY,
          Math.cos(angle) * 25,
          Math.sin(angle) * 25,
          0.5,
        );
      }
    }

    game.audio.enemyShoot();
  }

  takeDamage(damage) {
    this.hp -= damage;
    return this.hp <= 0;
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.scene.remove(this.group);
  }
}
