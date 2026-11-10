import * as THREE from "three";
import { getGlowTexture } from "../models/planes.js";

const STAR_LAYERS = [
  { count: 170, size: 2.4, speed: 15, color: 0x8fb4ff, opacity: 0.55 },
  { count: 120, size: 3.2, speed: 26, color: 0xcfe9ff, opacity: 0.75 },
  { count: 70, size: 4.6, speed: 40, color: 0xffffff, opacity: 0.9 },
];

function makeBackdrop() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x07142b) },
      middleColor: { value: new THREE.Color(0x0a0a20) },
      bottomColor: { value: new THREE.Color(0x03040b) },
      glowColor: { value: new THREE.Color(0x2c3f8f) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 middleColor;
      uniform vec3 bottomColor;
      uniform vec3 glowColor;
      varying vec2 vUv;

      void main() {
        float vertical = smoothstep(0.0, 1.0, vUv.y);
        vec3 color = mix(bottomColor, middleColor, smoothstep(0.0, 0.55, vertical));
        color = mix(color, topColor, smoothstep(0.5, 1.0, vertical));

        vec2 glowCenter = vec2(0.5, 1.05);
        float glow = 1.0 - smoothstep(0.0, 0.9, distance(vUv, glowCenter));
        color += glowColor * pow(glow, 3.0) * 0.75;

        float vignette = 1.0 - 0.5 * smoothstep(0.45, 1.0, distance(vUv, vec2(0.5)));
        gl_FragColor = vec4(color * vignette, 1.0);
      }
    `,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.position.z = -80;
  mesh.renderOrder = -10;
  return mesh;
}

export class Background {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;
    this.halfWidth = 60;
    this.halfHeight = 60;

    this.backdrop = makeBackdrop();
    scene.add(this.backdrop);

    this.nebulas = [];
    this.createNebulas();

    this.planet = this.createPlanet();
    scene.add(this.planet);

    this.layers = STAR_LAYERS.map((config) => this.createStarLayer(config));
  }

  createNebulas() {
    const texture = getGlowTexture();
    const configs = [
      { color: 0x5432a8, x: -0.55, y: 0.35, size: 1.5, opacity: 0.22 },
      { color: 0x0d6a8f, x: 0.62, y: 0.08, size: 1.25, opacity: 0.16 },
      { color: 0x7a1d58, x: 0.1, y: -0.52, size: 1.1, opacity: 0.13 },
    ];

    for (const config of configs) {
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        color: config.color,
        transparent: true,
        opacity: config.opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
      mesh.position.z = -70;
      mesh.userData = { nx: config.x, ny: config.y, size: config.size };
      this.scene.add(mesh);
      this.nebulas.push(mesh);
    }
  }

  createPlanet() {
    const group = new THREE.Group();
    group.position.z = -62;

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(13, 40, 30),
      new THREE.MeshStandardMaterial({
        color: 0x1d2e57,
        emissive: 0x07152f,
        emissiveIntensity: 0.8,
        roughness: 0.95,
        metalness: 0.05,
      }),
    );
    group.add(sphere);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(17, 24, 72),
      new THREE.MeshBasicMaterial({
        color: 0x7f8cff,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    ring.rotation.x = Math.PI / 2.6;
    ring.rotation.z = -0.35;
    group.add(ring);

    return group;
  }

  createStarLayer(config) {
    const positions = new Float32Array(config.count * 3);
    const speeds = new Float32Array(config.count);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: config.color,
      size: config.size,
      map: getGlowTexture(),
      transparent: true,
      opacity: config.opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false,
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.position.z = -30 - config.speed * 0.2;
    this.scene.add(points);

    const layer = { ...config, positions, speeds, points, geometry };
    this.scatterLayer(layer);
    return layer;
  }

  scatterLayer(layer) {
    const { positions, speeds, count } = layer;
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() * 2 - 1) * (this.halfWidth + 20);
      positions[i * 3 + 1] = (Math.random() * 2 - 1) * (this.halfHeight + 10);
      positions[i * 3 + 2] = 0;
      speeds[i] = 0.7 + Math.random() * 0.6;
    }
    layer.geometry.attributes.position.needsUpdate = true;
  }

  resize(halfWidth, halfHeight) {
    this.halfWidth = halfWidth;
    this.halfHeight = halfHeight;

    const backdropWidth = Math.max(halfWidth * 2 + 40, 160);
    const backdropHeight = Math.max(halfHeight * 2 + 40, 140);
    this.backdrop.scale.set(backdropWidth, backdropHeight, 1);

    this.planet.scale.setScalar(Math.min(1.25, Math.max(0.7, halfWidth / 65)));
    this.planet.position.set(-halfWidth * 0.6, halfHeight * 0.62, -62);

    for (const nebula of this.nebulas) {
      const { nx, ny, size } = nebula.userData;
      const width = Math.max(halfWidth * 2, 120) * size;
      nebula.scale.set(width, width * 0.62, 1);
      nebula.position.x = nx * halfWidth;
      nebula.position.y = ny * halfHeight;
    }

    for (const layer of this.layers) {
      this.scatterLayer(layer);
    }
  }

  update(dt, scrollMultiplier = 1) {
    this.time += dt;

    for (const layer of this.layers) {
      const { positions, speeds, count, speed } = layer;
      for (let i = 0; i < count; i += 1) {
        positions[i * 3 + 1] -= speed * speeds[i] * dt * scrollMultiplier;
        if (positions[i * 3 + 1] < -this.halfHeight - 8) {
          positions[i * 3 + 1] = this.halfHeight + 8;
          positions[i * 3] = (Math.random() * 2 - 1) * (this.halfWidth + 20);
        }
      }
      layer.geometry.attributes.position.needsUpdate = true;
    }

    for (let i = 0; i < this.nebulas.length; i += 1) {
      const nebula = this.nebulas[i];
      nebula.position.y += Math.sin(this.time * 0.12 + i * 2) * dt * 0.6;
    }

    this.planet.rotation.y += dt * 0.02;
  }
}
