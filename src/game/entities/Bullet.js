import * as THREE from "three";
import { getGlowTexture } from "../models/planes.js";

const friendlyGeometry = new THREE.CapsuleGeometry(0.24, 1.35, 3, 8);
const hostileGeometry = new THREE.SphereGeometry(0.42, 10, 8);
const glowQuad = new THREE.PlaneGeometry(1, 1);

const friendlyMaterial = new THREE.MeshBasicMaterial({ color: 0xbdfaff });
const hostileMaterial = new THREE.MeshBasicMaterial({ color: 0xff5d9a });

function glowMaterial(color) {
  return new THREE.MeshBasicMaterial({
    map: getGlowTexture(),
    color,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

const friendlyGlow = glowMaterial(0x58e8ff);
const hostileGlow = glowMaterial(0xff2d72);

let nextId = 1;

export class Bullet {
  constructor(scene, { x, y, vx, vy, radius, damage, friendly }) {
    this.id = nextId++;
    this.scene = scene;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.damage = damage;
    this.friendly = friendly;
    this.dead = false;

    const group = new THREE.Group();
    group.position.set(x, y, friendly ? 2 : 1);

    const mesh = new THREE.Mesh(
      friendly ? friendlyGeometry : hostileGeometry,
      friendly ? friendlyMaterial : hostileMaterial,
    );
    group.add(mesh);

    const glow = new THREE.Mesh(glowQuad, friendly ? friendlyGlow : hostileGlow);
    if (friendly) {
      glow.scale.set(2.1, 4.6, 1);
      group.rotation.z = Math.atan2(vy, vx) - Math.PI / 2;
    } else {
      glow.scale.set(2.6, 2.6, 1);
    }
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

  update(dt) {
    this.group.position.x += this.vx * dt;
    this.group.position.y += this.vy * dt;
  }

  isOutside(halfWidth, halfHeight) {
    return (
      Math.abs(this.group.position.x) > halfWidth + 8 ||
      this.group.position.y > halfHeight + 12 ||
      this.group.position.y < -halfHeight - 12
    );
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.scene.remove(this.group);
  }
}
