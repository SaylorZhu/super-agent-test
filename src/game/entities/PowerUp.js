import * as THREE from "three";
import { getGlowTexture } from "../models/planes.js";

const coreGeometry = new THREE.OctahedronGeometry(0.95, 0);
const ringGeometry = new THREE.TorusGeometry(1.45, 0.07, 8, 40);

const coreMaterial = new THREE.MeshStandardMaterial({
  color: 0x5fffce,
  emissive: 0x24ffa8,
  emissiveIntensity: 1.6,
  metalness: 0.3,
  roughness: 0.25,
  flatShading: true,
});

const ringMaterial = new THREE.MeshBasicMaterial({
  color: 0x8dffd8,
  transparent: true,
  opacity: 0.65,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

let glyphTexture = null;

function getGlyphTexture() {
  if (glyphTexture) return glyphTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 128, 128);

  // Dark badge so the glyph reads on top of the bright reactor core.
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(4, 20, 17, 0.88)";
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(70, 255, 194, 0.9)";
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 88px 'Avenir Next', 'PingFang SC', sans-serif";
  ctx.shadowColor = "rgba(70, 255, 194, 0.9)";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#f2fff9";
  ctx.fillText("P", 64, 68);
  glyphTexture = new THREE.CanvasTexture(canvas);
  glyphTexture.colorSpace = THREE.SRGBColorSpace;
  return glyphTexture;
}

export class PowerUp {
  constructor(scene, x, y, z = 0) {
    this.scene = scene;
    this.age = 0;
    this.radius = 2.8;
    this.dead = false;
    this.drift = (Math.random() - 0.5) * 14;

    const group = new THREE.Group();
    group.position.set(x, y, z);

    this.core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(this.core);

    this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
    group.add(this.ring);

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: 0x46ffc2,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    glow.scale.set(7, 7, 1);
    group.add(glow);

    const glyph = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlyphTexture(),
        transparent: true,
        depthWrite: false,
      }),
    );
    glyph.scale.set(2.6, 2.6, 1);
    glyph.position.z = 0.4;
    group.add(glyph);
    this.glyph = glyph;

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

  get isOutside() {
    const { x, y, z } = this.group.position;
    return z > 20 || z < -350 || Math.abs(x) > 160 || Math.abs(y) > 160;
  }

  update(dt, player) {
    this.age += dt;
    const group = this.group;
    const dx = player.x - group.position.x;
    const dy = player.y - group.position.y;
    const dz = player.z - group.position.z;
    const distance = Math.hypot(dx, dy, dz);
    const pull = distance < 45 ? 42 : 0;

    if (distance > 1e-3 && pull > 0) {
      group.position.x += (dx / distance) * pull * dt;
      group.position.y += (dy / distance) * pull * dt;
      group.position.z += (dz / distance) * pull * dt;
    }

    // Slow forward drift plus a gentle lateral wobble so it reads in 3D.
    group.position.z += 24 * dt;
    group.position.x += Math.sin(this.age * 2.2) * this.drift * dt;

    this.core.rotation.y += dt * 3.2;
    this.core.rotation.z += dt * 1.6;
    this.ring.rotation.x += dt * 1.3;
    this.ring.rotation.z += dt * 1.1;
    const pulse = 1 + Math.sin(this.age * 8) * 0.09;
    this.ring.scale.setScalar(pulse);
    this.glyph.scale.setScalar(2.6 * pulse);
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.scene.remove(this.group);
  }
}
