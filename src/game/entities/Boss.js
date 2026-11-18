import * as THREE from "three";
import { createPlane, getFlames, animateFlames } from "../models/planes.js";
import { BOSS } from "../constants.js";
import { basisFromDirection, normalize3D, rotateAroundY } from "../core/combat.js";

const LOCAL_NOSE = new THREE.Vector3(0, 1, 0);
const TOWARD_CAMERA = new THREE.Vector3(0, 0, 1);
const ROLL = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
const FIGHT_Y = 13;

export class Boss {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;

    // Keep the mothership inside the frame on narrow, portrait screens.
    const aspectScale = Math.min(1, Math.max(0.5, game.camera.aspect / 1.6));
    this.scale = BOSS.scale * aspectScale;
    this.aspectScale = aspectScale;
    this.group = new THREE.Group();
    this.plane = createPlane("boss");
    this.plane.quaternion
      .setFromUnitVectors(LOCAL_NOSE, TOWARD_CAMERA)
      .multiply(ROLL);
    this.plane.scale.setScalar(this.scale);
    this.group.add(this.plane);
    this.group.position.set(0, FIGHT_Y, BOSS.entryZ);
    this.flames = getFlames(this.plane);
    this.core = this.plane.getObjectByName("core");
    this.radius = BOSS.radius * aspectScale;
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

  get z() {
    return this.group.position.z;
  }

  update(dt, game) {
    this.time += dt;
    animateFlames(this.flames, this.time, 1.15);

    if (this.phase === "enter") {
      this.group.position.z += 100 * dt;
      if (this.group.position.z >= BOSS.z) {
        this.group.position.z = BOSS.z;
        this.phase = "fight";
      }
      return;
    }

    const swayRange = Math.min(game.halfWidth * 0.95, 36) * this.aspectScale;
    this.group.position.x = Math.sin(this.time * 0.5) * swayRange;
    this.group.position.y = FIGHT_Y + Math.sin(this.time * 1.2) * 1.8;
    this.group.position.z = BOSS.z + Math.sin(this.time * 0.7) * 2.5;
    this.group.rotation.z = Math.cos(this.time * 0.5) * 0.1;
    this.group.rotation.y = Math.sin(this.time * 0.4) * 0.06;

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
    const originX = this.x;
    const originY = this.y - 1.5;
    const originZ = this.z + 8;
    const aim = normalize3D(
      game.player.x - originX,
      game.player.y - originY,
      game.player.z - originZ,
    );

    if (pattern === 0) {
      // Aimed three-shot burst.
      for (const offset of [-0.09, 0, 0.09]) {
        const direction = rotateAroundY(aim.x, aim.y, aim.z, offset);
        game.spawnEnemyBullet(
          originX,
          originY,
          originZ,
          direction.x * 78,
          direction.y * 78,
          direction.z * 78,
          0.9,
        );
      }
    } else if (pattern === 1) {
      // Radial bloom in a cone toward the camera.
      const count = 16;
      const twist = this.time * 0.6;
      const { right, up } = basisFromDirection(aim.x, aim.y, aim.z);
      for (let i = 0; i < count; i += 1) {
        const angle = twist + (i / count) * Math.PI * 2;
        const spread = 0.44;
        const direction = normalize3D(
          aim.x + right.x * Math.cos(angle) * spread + up.x * Math.sin(angle) * spread,
          aim.y + right.y * Math.cos(angle) * spread + up.y * Math.sin(angle) * spread,
          aim.z + right.z * Math.cos(angle) * spread + up.z * Math.sin(angle) * spread,
        );
        game.spawnEnemyBullet(
          originX,
          originY,
          originZ,
          direction.x * 58,
          direction.y * 58,
          direction.z * 58,
          0.8,
        );
      }
    } else {
      // Wide horizontal fan.
      for (let i = 0; i < 5; i += 1) {
        const direction = rotateAroundY(aim.x, aim.y, aim.z, (i - 2) * 0.16);
        game.spawnEnemyBullet(
          originX,
          originY,
          originZ,
          direction.x * 66,
          direction.y * 66,
          direction.z * 66,
          0.8,
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
