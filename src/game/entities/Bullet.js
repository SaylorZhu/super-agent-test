import * as THREE from "three";
import { getGlowTexture } from "../models/planes.js";
import { BULLET } from "../constants.js";

const friendlyCore = new THREE.CapsuleGeometry(0.2, 1.5, 3, 8);
const friendlyTrail = new THREE.CapsuleGeometry(0.09, 3.2, 3, 6);
const hostileCore = new THREE.SphereGeometry(0.55, 12, 10);

const friendlyMaterial = new THREE.MeshBasicMaterial({ color: 0xd8fdff });
const friendlyTrailMaterial = new THREE.MeshBasicMaterial({
  color: 0x58e8ff,
  transparent: true,
  opacity: 0.5,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const hostileMaterial = new THREE.MeshBasicMaterial({ color: 0xff7fae });

function spriteMaterial(color, opacity) {
  return new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

const LOCAL_FORWARD = new THREE.Vector3(0, 0, 1);

// Sprites share their materials across every bullet of the same team.
const friendlyGlowMaterial = spriteMaterial(0x58e8ff, 0.9);
const hostileGlowMaterial = spriteMaterial(0xff2d72, 0.95);

let nextId = 1;

export class Bullet {
  constructor(scene, { x, y, z = 0, vx, vy, vz, radius, damage, friendly }) {
    this.id = nextId++;
    this.scene = scene;
    this.vx = vx;
    this.vy = vy;
    this.vz = vz;
    this.radius = radius;
    this.damage = damage;
    this.friendly = friendly;
    this.dead = false;
    this.prev = new THREE.Vector3(x, y, z);

    const group = new THREE.Group();
    group.position.set(x, y, z);

    if (friendly) {
      const orientation = new THREE.Quaternion().setFromUnitVectors(
        LOCAL_FORWARD,
        new THREE.Vector3(vx, vy, vz).normalize(),
      );
      const trail = new THREE.Mesh(friendlyTrail, friendlyTrailMaterial);
      trail.quaternion.copy(orientation);
      group.add(trail);

      const core = new THREE.Mesh(friendlyCore, friendlyMaterial);
      core.quaternion.copy(orientation);
      group.add(core);
    } else {
      group.add(new THREE.Mesh(hostileCore, hostileMaterial));
    }

    const glow = new THREE.Sprite(friendly ? friendlyGlowMaterial : hostileGlowMaterial);
    glow.scale.set(friendly ? 2.6 : 3.4, friendly ? 2.6 : 3.4, 1);
    group.add(glow);

    this.group = group;
    scene.add(group);
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

  get position() {
    return this.group.position;
  }

  update(dt) {
    this.prev.copy(this.group.position);
    this.group.position.x += this.vx * dt;
    this.group.position.y += this.vy * dt;
    this.group.position.z += this.vz * dt;
  }

  isOutside() {
    const { x, y, z } = this.group.position;
    return (
      z > 30 ||
      z < -BULLET.range ||
      Math.abs(x) > 420 ||
      Math.abs(y) > 320
    );
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.scene.remove(this.group);
  }
}
