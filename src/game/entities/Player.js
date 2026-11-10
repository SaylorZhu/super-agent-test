import * as THREE from "three";
import { createPlane, getFlames, animateFlames } from "../models/planes.js";
import { PLAYER } from "../constants.js";

const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.group = createPlane("player");
    this.group.position.set(0, -30, 0);
    this.flames = getFlames(this.group);
    this.velocityX = 0;
    this.time = 0;
    scene.add(this.group);
    this.reset(0, -30);
  }

  reset(x, y) {
    this.group.position.set(x, y, 0);
    this.group.rotation.z = 0;
    this.group.visible = true;
    this.lives = PLAYER.maxLives;
    this.weaponLevel = 1;
    this.invulnerable = 0;
    this.fireCooldown = 0;
    this.alive = true;
    this.velocityX = 0;
  }

  get x() {
    return this.group.position.x;
  }

  get y() {
    return this.group.position.y;
  }

  get position() {
    return this.group.position;
  }

  /** Menu / attract-mode animation; does not read input or fire. */
  idle(dt) {
    this.time += dt;
    animateFlames(this.flames, this.time, 0.9);
  }

  update(dt, bounds, controls) {
    if (!this.alive) return false;

    this.time += dt;
    if (this.invulnerable > 0) this.invulnerable = Math.max(0, this.invulnerable - dt);

    const position = this.group.position;
    const previousX = position.x;
    const axis = controls.axis;
    let dx = 0;
    let dy = 0;

    if (axis.x !== 0 || axis.y !== 0) {
      dx = axis.x * PLAYER.speed * dt;
      dy = axis.y * PLAYER.speed * dt;
    } else if (controls.pointerActive && controls.pointerWorld) {
      const follow = 1 - Math.exp(-15 * dt);
      dx = (controls.pointerWorld.x - position.x) * follow;
      dy = (controls.pointerWorld.y - position.y) * follow;
    }

    position.x = clamp(position.x + dx, bounds.minX, bounds.maxX);
    position.y = clamp(position.y + dy, bounds.minY, bounds.maxY);

    const actualDx = position.x - previousX;
    const speed = actualDx / Math.max(dt, 1e-4);
    this.velocityX = lerp(this.velocityX, speed, 0.18);
    this.group.rotation.z = lerp(
      this.group.rotation.z,
      clamp(-this.velocityX * 0.0045, -0.42, 0.42),
      0.16,
    );

    const flameBoost = 0.85 + Math.min(0.5, Math.abs(this.velocityX) / 220);
    animateFlames(this.flames, this.time, flameBoost);

    if (this.invulnerable > 0) {
      this.group.visible = Math.floor(this.time * 14) % 2 === 0;
    } else {
      this.group.visible = true;
    }

    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0) {
      this.fireCooldown = PLAYER.fireInterval;
      return true;
    }
    return false;
  }

  glowMuzzle(offsetX, angle) {
    return {
      x: this.group.position.x + offsetX * Math.cos(angle),
      y: this.group.position.y + 3.4,
    };
  }

  hit() {
    if (!this.alive || this.invulnerable > 0) return false;
    this.lives -= 1;
    this.invulnerable = PLAYER.respawnShield;
    this.weaponLevel = 1;
    this.fireCooldown = 0.35;

    if (this.lives <= 0) {
      this.alive = false;
      this.group.visible = false;
    }
    return true;
  }

  addPower() {
    if (this.weaponLevel >= PLAYER.maxWeaponLevel) return false;
    this.weaponLevel += 1;
    return true;
  }

  destroy() {
    this.scene.remove(this.group);
  }
}
