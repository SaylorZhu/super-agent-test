import * as THREE from "three";
import { getGlowTexture } from "../models/planes.js";

const STAR_LAYERS = [
  { count: 520, size: 1.25, speed: 16, color: 0x8fb4ff, opacity: 0.55 },
  { count: 300, size: 1.7, speed: 30, color: 0xcfe9ff, opacity: 0.8 },
  { count: 160, size: 2.3, speed: 52, color: 0xffffff, opacity: 0.95 },
];

const STREAK_COUNT = 200;

function makeBackdrop() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x050a1c) },
      middleColor: { value: new THREE.Color(0x0a0a20) },
      bottomColor: { value: new THREE.Color(0x02030a) },
      glowColor: { value: new THREE.Color(0x2c3f8f) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPosition = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 middleColor;
      uniform vec3 bottomColor;
      uniform vec3 glowColor;
      varying vec3 vWorldPosition;

      void main() {
        vec3 dir = normalize(vWorldPosition);
        float h = dir.y;
        vec3 color = mix(bottomColor, middleColor, smoothstep(-0.7, 0.08, h));
        color = mix(color, topColor, smoothstep(0.0, 0.95, h));

        // Soft galactic band just above the flight path.
        float band = exp(-pow((h - 0.02) * 5.5, 2.0));
        color += glowColor * band * 0.28;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });

  return new THREE.Mesh(new THREE.SphereGeometry(2400, 32, 24), material);
}

function spriteMaterial(color, opacity) {
  return new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
}

export class Background {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;

    this.backdrop = makeBackdrop();
    scene.add(this.backdrop);

    this.createNebulas();
    this.createSun();
    this.planet = this.createPlanet();
    scene.add(this.planet);
    this.createAsteroids();
    this.createEnergyRings();

    this.layers = STAR_LAYERS.map((config) => this.createStarLayer(config));
    this.createStreaks();
  }

  createNebulas() {
    const configs = [
      { color: 0x5432a8, x: -420, y: 160, z: -900, size: 780, opacity: 0.2 },
      { color: 0x0d6a8f, x: 560, y: -170, z: -1100, size: 680, opacity: 0.15 },
      { color: 0x7a1d58, x: 60, y: 420, z: -1250, size: 620, opacity: 0.11 },
      { color: 0x2748c8, x: -660, y: -260, z: -1450, size: 900, opacity: 0.1 },
    ];

    this.nebulas = configs.map((config) => {
      const sprite = new THREE.Sprite(spriteMaterial(config.color, config.opacity));
      sprite.position.set(config.x, config.y, config.z);
      sprite.scale.setScalar(config.size);
      this.scene.add(sprite);
      return { sprite, baseX: config.x, baseY: config.y, phase: Math.random() * Math.PI * 2 };
    });
  }

  createSun() {
    const glow = new THREE.Sprite(spriteMaterial(0xffb36b, 0.32));
    glow.position.set(520, 340, -1700);
    glow.scale.setScalar(360);
    this.scene.add(glow);

    const core = new THREE.Sprite(spriteMaterial(0xfff1c8, 0.75));
    core.position.copy(glow.position);
    core.scale.setScalar(95);
    this.scene.add(core);
    this.sun = { glow, core };
  }

  createPlanet() {
    const group = new THREE.Group();
    group.position.set(-370, 240, -1250);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(150, 48, 32),
      new THREE.MeshStandardMaterial({
        color: 0x1d2e57,
        emissive: 0x07152f,
        emissiveIntensity: 0.8,
        roughness: 0.95,
        metalness: 0.05,
        fog: false,
      }),
    );
    group.add(sphere);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(190, 300, 96),
      new THREE.MeshBasicMaterial({
        color: 0x7f8cff,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    ring.rotation.x = Math.PI / 2.4;
    ring.rotation.z = -0.3;
    group.add(ring);

    const halo = new THREE.Sprite(spriteMaterial(0x4f6cff, 0.18));
    halo.position.set(0, 0, -120);
    halo.scale.setScalar(520);
    group.add(halo);

    return group;
  }

  createAsteroids() {
    this.asteroids = [];
    const geometry = new THREE.DodecahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({
      color: 0x2d3856,
      roughness: 0.92,
      metalness: 0.08,
      flatShading: true,
    });

    for (let i = 0; i < 16; i += 1) {
      const mesh = new THREE.Mesh(geometry, material);
      const scale = 4 + Math.random() * 8;
      mesh.scale.setScalar(scale);
      this.placeAsteroid(mesh, true);
      mesh.userData.speed = 4 + Math.random() * 9;
      mesh.userData.spin = new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
      );
      this.scene.add(mesh);
      this.asteroids.push(mesh);
    }
  }

  placeAsteroid(mesh, initial) {
    mesh.position.z = initial ? -80 - Math.random() * 900 : -950;
    const side = Math.random() < 0.5 ? -1 : 1;
    if (Math.random() < 0.7) {
      mesh.position.x = side * (90 + Math.random() * 420);
      mesh.position.y = (Math.random() * 2 - 1) * 260;
    } else {
      mesh.position.x = (Math.random() * 2 - 1) * 420;
      mesh.position.y = (Math.random() < 0.5 ? 1 : -1) * (80 + Math.random() * 220);
    }
  }

  createEnergyRings() {
    this.rings = [];
    const geometry = new THREE.TorusGeometry(64, 0.26, 6, 80);
    const material = new THREE.MeshBasicMaterial({
      color: 0x3f7dff,
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });

    for (let i = 0; i < 13; i += 1) {
      const ring = new THREE.Mesh(geometry, material);
      ring.position.set(0, -4, -980 + i * 72);
      ring.rotation.z = Math.random() * Math.PI;
      this.scene.add(ring);
      this.rings.push(ring);
    }
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
      sizeAttenuation: true,
      fog: false,
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    this.scene.add(points);

    const layer = { ...config, positions, speeds, points, geometry };
    this.scatterLayer(layer, true);
    return layer;
  }

  scatterLayer(layer, initial) {
    const { positions, speeds, count } = layer;
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() * 2 - 1) * 1500;
      positions[i * 3 + 1] = (Math.random() * 2 - 1) * 900;
      positions[i * 3 + 2] = initial ? -1800 + Math.random() * 1850 : -1800 - Math.random() * 300;
      speeds[i] = 0.6 + Math.random() * 0.8;
    }
    layer.geometry.attributes.position.needsUpdate = true;
  }

  createStreaks() {
    const positions = new Float32Array(STREAK_COUNT * 6);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color: 0x7fb2ff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const lines = new THREE.LineSegments(geometry, material);
    lines.frustumCulled = false;
    this.scene.add(lines);
    this.streaks = { positions, geometry, count: STREAK_COUNT, lines };

    for (let i = 0; i < STREAK_COUNT; i += 1) {
      this.resetStreak(i, true);
    }
    geometry.attributes.position.needsUpdate = true;
  }

  resetStreak(index, initial) {
    const { positions } = this.streaks;
    const base = index * 6;
    const x = (Math.random() * 2 - 1) * 1100;
    const y = (Math.random() * 2 - 1) * 640;
    const z = initial ? -1700 + Math.random() * 1700 : -1900;
    const length = 10 + Math.random() * 34;
    positions[base] = x;
    positions[base + 1] = y;
    positions[base + 2] = z;
    positions[base + 3] = x;
    positions[base + 4] = y;
    positions[base + 5] = z + length;
  }

  resize() {
    // The backdrop and scenery are sized in world units; only the projection
    // changes, so there is nothing to rescale here.
  }

  update(dt, scrollMultiplier = 1) {
    this.time += dt;
    const scroll = Math.max(0.2, scrollMultiplier);

    for (const layer of this.layers) {
      const { positions, speeds, count, speed } = layer;
      for (let i = 0; i < count; i += 1) {
        positions[i * 3 + 2] += speed * speeds[i] * dt * scroll;
        if (positions[i * 3 + 2] > 40) {
          positions[i * 3 + 2] = -1800 - Math.random() * 200;
          positions[i * 3] = (Math.random() * 2 - 1) * 1500;
          positions[i * 3 + 1] = (Math.random() * 2 - 1) * 900;
        }
      }
      layer.geometry.attributes.position.needsUpdate = true;
    }

    const streak = this.streaks;
    const positions = streak.positions;
    for (let i = 0; i < streak.count; i += 1) {
      const base = i * 6;
      const dz = 190 * dt * scroll;
      positions[base + 2] += dz;
      positions[base + 5] += dz;
      if (positions[base + 5] > 40) {
        this.resetStreak(i, false);
      }
    }
    streak.geometry.attributes.position.needsUpdate = true;

    for (const ring of this.rings) {
      ring.position.z += 34 * dt * scroll;
      if (ring.position.z > 70) {
        ring.position.z = -960;
        ring.rotation.z = Math.random() * Math.PI;
      }
    }

    for (const asteroid of this.asteroids) {
      asteroid.position.z += asteroid.userData.speed * dt * scroll;
      asteroid.rotation.x += asteroid.userData.spin.x * dt;
      asteroid.rotation.y += asteroid.userData.spin.y * dt;
      asteroid.rotation.z += asteroid.userData.spin.z * dt;
      if (asteroid.position.z > 60) {
        this.placeAsteroid(asteroid, false);
      }
    }

    this.planet.rotation.y += dt * 0.02;
    this.sun.glow.material.opacity = 0.3 + Math.sin(this.time * 0.8) * 0.03;

    for (let i = 0; i < this.nebulas.length; i += 1) {
      const nebula = this.nebulas[i];
      nebula.sprite.position.y = nebula.baseY + Math.sin(this.time * 0.08 + nebula.phase) * 14;
      nebula.sprite.position.x = nebula.baseX + Math.cos(this.time * 0.06 + nebula.phase) * 18;
    }
  }
}
