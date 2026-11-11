import * as THREE from "three";
import { getGlowTexture } from "../models/planes.js";

const coreGeometry = new THREE.OctahedronGeometry(0.95, 0);
const ringGeometry = new THREE.TorusGeometry(1.45, 0.07, 6, 40);
const glowQuad = new THREE.PlaneGeometry(1, 1);
const glyphGeometry = new THREE.PlaneGeometry(2.4, 2.4);

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

const glowMaterial = new THREE.MeshBasicMaterial({
  map: getGlowTexture(),
  color: 0x46ffc2,
  transparent: true,
  opacity: 0.55,
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

const glyphMaterial = new THREE.MeshBasicMaterial({
  map: getGlyphTexture(),
  transparent: true,
  depthWrite: false,
});

export class PowerUp {
  constructor(scene, x, y) {
    this.scene = scene;
    this.age = 0;
    this.radius = 2.1;
    this.dead = false;
    this.drift = (Math.random() - 0.5) * 8;

    const group = new THREE.Group();
    group.position.set(x, y, 1);

    this.core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(this.core);

    this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
    group.add(this.ring);

    const glow = new THREE.Mesh(glowQuad, glowMaterial);
    glow.scale.set(6, 6, 1);
    group.add(glow);

    this.glyph = new THREE.Mesh(glyphGeometry, glyphMaterial);
    this.glyph.position.z = 1.6;
    group.add(this.glyph);

    this.group = group;
    scene.add(group);
  }

  get x() {
    return this.group.position.x;
  }

  get y() {
    return this.group.position.y;
  }

  get isOutside() {
    return this.group.position.y < -70;
  }

  update(dt) {
    this.age += dt;
    const group = this.group;
    group.position.y -= 15 * dt;
    group.position.x += Math.sin(this.age * 2.2) * this.drift * dt;
    this.core.rotation.y += dt * 3.2;
    this.core.rotation.z += dt * 1.6;
    this.ring.rotation.z += dt * 1.1;
    const pulse = 1 + Math.sin(this.age * 8) * 0.09;
    this.ring.scale.setScalar(pulse);
    this.glyph.scale.setScalar(pulse);
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.scene.remove(this.group);
  }
}
