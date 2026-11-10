import * as THREE from "three";
import { getGlowTexture } from "../models/planes.js";

const ringGeometry = new THREE.RingGeometry(0.72, 0.92, 56);

const WHITE = new THREE.Color(0xffffff);

/**
 * Lightweight particle system: one Points object per burst plus an optional
 * expanding shockwave ring. Everything is pooled by removal after its life.
 */
export class Explosions {
  constructor(scene) {
    this.scene = scene;
    this.bursts = [];
    this.rings = [];
  }

  spawn(x, y, options = {}) {
    const {
      color = 0xffa64d,
      count = 28,
      speed = 44,
      size = 22,
      life = 0.72,
      ring = true,
      spread = 1,
    } = options;

    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const baseColor = new THREE.Color(color);
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speedFactor = 0.25 + Math.random() * 0.9;
      const distance = Math.random() * 1.2 * spread;

      positions[i * 3] = Math.cos(angle) * distance;
      positions[i * 3 + 1] = Math.sin(angle) * distance;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;

      velocities[i * 3] = Math.cos(angle) * speed * speedFactor;
      velocities[i * 3 + 1] = Math.sin(angle) * speed * speedFactor;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 12;

      tempColor.copy(baseColor).lerp(WHITE, Math.random() * 0.42);
      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size,
      map: getGlowTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false,
    });

    const points = new THREE.Points(geometry, material);
    points.position.set(x, y, 1);
    points.frustumCulled = false;
    this.scene.add(points);

    this.bursts.push({
      points,
      geometry,
      material,
      velocities,
      age: 0,
      life,
      count,
    });

    if (ring) {
      this.spawnRing(x, y, color, spread);
    }
  }

  spawnRing(x, y, color, spread = 1) {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeometry, material);
    ring.position.set(x, y, 0.5);
    ring.scale.setScalar(0.6 * spread);
    this.scene.add(ring);
    this.rings.push({ mesh: ring, material, age: 0, life: 0.5, spread });
  }

  spark(x, y, color = 0x8ff7ff) {
    this.spawn(x, y, {
      color,
      count: 7,
      speed: 22,
      size: 12,
      life: 0.3,
      ring: false,
      spread: 0.3,
    });
  }

  update(dt) {
    for (let i = this.bursts.length - 1; i >= 0; i -= 1) {
      const burst = this.bursts[i];
      burst.age += dt;
      const progress = burst.age / burst.life;

      if (progress >= 1) {
        this.scene.remove(burst.points);
        burst.geometry.dispose();
        burst.material.dispose();
        this.bursts.splice(i, 1);
        continue;
      }

      const positions = burst.geometry.attributes.position.array;
      const drag = Math.exp(-2.8 * dt);
      for (let p = 0; p < burst.count; p += 1) {
        const base = p * 3;
        burst.velocities[base] *= drag;
        burst.velocities[base + 1] *= drag;
        burst.velocities[base + 2] *= drag;
        positions[base] += burst.velocities[base] * dt;
        positions[base + 1] += burst.velocities[base + 1] * dt;
        positions[base + 2] += burst.velocities[base + 2] * dt;
      }
      burst.geometry.attributes.position.needsUpdate = true;
      burst.material.opacity = Math.pow(1 - progress, 1.4);
      burst.material.size = 22 * (1 - progress * 0.55);
    }

    for (let i = this.rings.length - 1; i >= 0; i -= 1) {
      const ring = this.rings[i];
      ring.age += dt;
      const progress = ring.age / ring.life;

      if (progress >= 1) {
        this.scene.remove(ring.mesh);
        ring.material.dispose();
        this.rings.splice(i, 1);
        continue;
      }

      const scale = 0.6 * ring.spread + progress * 11 * ring.spread;
      ring.mesh.scale.setScalar(scale);
      ring.material.opacity = Math.pow(1 - progress, 1.8) * 0.85;
    }
  }

  clear() {
    for (const burst of this.bursts) {
      this.scene.remove(burst.points);
      burst.geometry.dispose();
      burst.material.dispose();
    }
    this.bursts.length = 0;

    for (const ring of this.rings) {
      this.scene.remove(ring.mesh);
      ring.material.dispose();
    }
    this.rings.length = 0;
  }
}
