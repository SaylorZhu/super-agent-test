import * as THREE from "three";

const PALETTES = {
  player: {
    body: 0xe8f6ff,
    wing: 0x4d7cff,
    dark: 0x101c3a,
    accent: 0x7df9ff,
    cockpit: 0x0a2b46,
    flame: 0x65e7ff,
  },
  scout: {
    body: 0xff9b8a,
    wing: 0x641c33,
    dark: 0x240b15,
    accent: 0xff5470,
    cockpit: 0x2d0d18,
    flame: 0xff6b8a,
  },
  fighter: {
    body: 0xc7a4ff,
    wing: 0x3a1d63,
    dark: 0x170a2b,
    accent: 0xd86bff,
    cockpit: 0x1d0b33,
    flame: 0xc084ff,
  },
  heavy: {
    body: 0xffc47d,
    wing: 0x54270d,
    dark: 0x231004,
    accent: 0xff8a2b,
    cockpit: 0x2a1405,
    flame: 0xffa04d,
  },
  boss: {
    body: 0x7c89a1,
    wing: 0x341126,
    dark: 0x120610,
    accent: 0xff3b6b,
    cockpit: 0x2b0713,
    flame: 0xff5d86,
  },
};

const SHAPES = {
  player: { bodyRadius: 0.8, bodyLength: 4.2, noseLength: 2.6, wingSpan: 4.2, thickness: 0.34 },
  scout: { bodyRadius: 0.6, bodyLength: 2.9, noseLength: 1.9, wingSpan: 3.0, thickness: 0.26 },
  fighter: { bodyRadius: 0.72, bodyLength: 3.6, noseLength: 2.2, wingSpan: 3.9, thickness: 0.3 },
  heavy: { bodyRadius: 0.95, bodyLength: 4.4, noseLength: 2.2, wingSpan: 4.9, thickness: 0.4 },
  boss: { bodyRadius: 1.5, bodyLength: 6.4, noseLength: 3.2, wingSpan: 9.2, thickness: 0.72 },
};

let glowTexture = null;

/** Soft radial sprite used by engine flames, bullets and particles. */
export function getGlowTexture() {
  if (glowTexture) return glowTexture;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.18, "rgba(255,255,255,0.92)");
  gradient.addColorStop(0.42, "rgba(255,255,255,0.36)");
  gradient.addColorStop(0.72, "rgba(255,255,255,0.08)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  glowTexture.needsUpdate = true;
  return glowTexture;
}

const glowQuad = new THREE.PlaneGeometry(1, 1);
const glowMaterials = new Map();

function getGlowMaterial(color) {
  if (!glowMaterials.has(color)) {
    glowMaterials.set(
      color,
      new THREE.MeshBasicMaterial({
        map: getGlowTexture(),
        color,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
  }
  return glowMaterials.get(color);
}

function addGlow(parent, { name, x = 0, y = 0, z = 0, width = 1, height = 1, color, opacity = 1 }) {
  const material = getGlowMaterial(color).clone();
  material.opacity = opacity;
  const mesh = new THREE.Mesh(glowQuad, material);
  mesh.name = name ?? "glow";
  mesh.position.set(x, y, z);
  mesh.scale.set(width, height, 1);
  mesh.renderOrder = 2;
  parent.add(mesh);
  return mesh;
}

function wingGeometry(span, thickness) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.9);
  shape.lineTo(span * 0.24, 1.15);
  shape.lineTo(span, 0.15);
  shape.lineTo(span, -0.55);
  shape.lineTo(span * 0.2, -0.42);
  shape.lineTo(span * 0.12, -1.55);
  shape.lineTo(-span * 0.12, -1.55);
  shape.lineTo(-span * 0.2, -0.42);
  shape.lineTo(-span, -0.55);
  shape.lineTo(-span, 0.15);
  shape.lineTo(-span * 0.24, 1.15);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.08,
    bevelSegments: 1,
  });
  geometry.translate(0, 0, -thickness / 2);
  return geometry;
}

function buildPlane(kind) {
  const palette = PALETTES[kind];
  const shape = SHAPES[kind];
  const group = new THREE.Group();
  group.name = `plane-${kind}`;

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: palette.body,
    metalness: 0.55,
    roughness: 0.38,
    flatShading: true,
  });
  const wingMaterial = new THREE.MeshStandardMaterial({
    color: palette.wing,
    metalness: 0.45,
    roughness: 0.5,
    flatShading: true,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: palette.dark,
    metalness: 0.7,
    roughness: 0.42,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: palette.accent,
    emissive: palette.accent,
    emissiveIntensity: 1.4,
    metalness: 0.2,
    roughness: 0.3,
  });
  const cockpitMaterial = new THREE.MeshStandardMaterial({
    color: palette.cockpit,
    emissive: palette.accent,
    emissiveIntensity: 0.55,
    metalness: 0.85,
    roughness: 0.12,
  });

  // Fuselage.
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(shape.bodyRadius * 0.72, shape.bodyRadius, shape.bodyLength, 7),
    bodyMaterial,
  );
  body.position.y = -shape.bodyLength * 0.1;
  group.add(body);

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(shape.bodyRadius * 0.72, shape.noseLength, 7),
    bodyMaterial,
  );
  nose.position.y = shape.bodyLength * 0.4 + shape.noseLength / 2 - 0.1;
  group.add(nose);

  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(shape.bodyRadius * 0.92, shape.bodyLength * 0.26, 7),
    darkMaterial,
  );
  tail.position.y = -shape.bodyLength * 0.64;
  tail.rotation.x = Math.PI;
  group.add(tail);

  // Main delta wing.
  const wing = new THREE.Mesh(wingGeometry(shape.wingSpan, shape.thickness), wingMaterial);
  wing.position.y = -0.3;
  group.add(wing);

  // Wing leading-edge accents.
  const edgeGeometry = new THREE.BoxGeometry(shape.wingSpan * 0.62, 0.1, shape.thickness + 0.05);
  for (const side of [-1, 1]) {
    const edge = new THREE.Mesh(edgeGeometry, accentMaterial);
    edge.position.set(side * shape.wingSpan * 0.55, 0.42, 0);
    edge.rotation.z = side * -0.11;
    group.add(edge);
  }

  // Cockpit canopy.
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(shape.bodyRadius * 0.72, 14, 10), cockpitMaterial);
  cockpit.scale.set(0.9, 1.55, 0.7);
  cockpit.position.set(0, shape.bodyLength * 0.16, shape.bodyRadius * 0.62);
  group.add(cockpit);

  // Engine nozzles and exhaust.
  const flameY = -shape.bodyLength * 0.66;
  const nozzleGeometry = new THREE.CylinderGeometry(
    shape.bodyRadius * 0.34,
    shape.bodyRadius * 0.42,
    shape.bodyLength * 0.22,
    8,
  );
  const engineCount = kind === "heavy" || kind === "boss" ? 2 : 1;
  for (let i = 0; i < engineCount; i += 1) {
    const offset = engineCount === 1 ? 0 : (i === 0 ? -1 : 1) * shape.bodyRadius * 0.55;
    const nozzle = new THREE.Mesh(nozzleGeometry, darkMaterial);
    nozzle.position.set(offset, flameY, 0);
    group.add(nozzle);
  }

  const flame = addGlow(group, {
    name: "flame",
    y: flameY - shape.bodyLength * 0.28,
    z: 0,
    width: shape.bodyRadius * 2.2,
    height: shape.bodyLength * 0.6,
    color: palette.flame,
    opacity: 0.95,
  });
  flame.userData.baseScaleY = flame.scale.y;

  // Wingtip lights.
  const lightGeometry = new THREE.SphereGeometry(shape.bodyRadius * 0.13, 8, 6);
  for (const side of [-1, 1]) {
    const light = new THREE.Mesh(lightGeometry, accentMaterial);
    light.position.set(side * shape.wingSpan * 0.98, 0.1, 0);
    group.add(light);
  }

  if (kind === "boss") {
    buildBossDetails(group, shape, accentMaterial, darkMaterial, palette);
  }

  return group;
}

function buildBossDetails(group, shape, accentMaterial, darkMaterial, palette) {
  // Armored side pods.
  const podGeometry = new THREE.CapsuleGeometry(shape.bodyRadius * 0.5, shape.bodyLength * 0.4, 4, 10);
  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(podGeometry, darkMaterial);
    pod.position.set(side * shape.wingSpan * 0.42, -shape.bodyLength * 0.18, 0);
    group.add(pod);

    const podGlow = addGlow(group, {
      name: "flame",
      x: side * shape.wingSpan * 0.42,
      y: -shape.bodyLength * 0.62,
      z: 0,
      width: shape.bodyRadius * 1.4,
      height: shape.bodyLength * 0.45,
      color: palette.flame,
      opacity: 0.85,
    });
    podGlow.userData.baseScaleY = podGlow.scale.y;
  }

  // Exposed reactor core.
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(shape.bodyRadius * 0.48, 1), accentMaterial);
  core.name = "core";
  core.position.set(0, shape.bodyLength * 0.06, shape.bodyRadius * 0.9);
  group.add(core);

  addGlow(group, {
    name: "coreGlow",
    y: shape.bodyLength * 0.06,
    z: shape.bodyRadius * 0.95,
    width: shape.bodyRadius * 2.4,
    height: shape.bodyRadius * 2.4,
    color: palette.accent,
    opacity: 0.65,
  });

  // Heavy chin cannons.
  const cannonGeometry = new THREE.CylinderGeometry(0.18, 0.24, 2.4, 6);
  for (const side of [-1, 1]) {
    const cannon = new THREE.Mesh(cannonGeometry, darkMaterial);
    cannon.position.set(side * shape.bodyRadius * 0.68, shape.bodyLength * 0.52, 0);
    group.add(cannon);
  }
}

const templates = new Map();

function getTemplate(kind) {
  if (!templates.has(kind)) {
    templates.set(kind, buildPlane(kind));
  }
  return templates.get(kind);
}

/**
 * Returns a fresh plane group. Geometry and materials are shared between
 * instances, so entities are cheap to spawn and remove.
 */
export function createPlane(kind) {
  return getTemplate(kind).clone(true);
}

/** Engine flames are named meshes so an entity can animate them each frame. */
export function getFlames(group) {
  if (!group.userData.flames) {
    group.userData.flames = group.children.filter(
      (child) => child.name === "flame" && child.isMesh,
    );
  }
  return group.userData.flames;
}

export function animateFlames(flames, time, intensity = 1) {
  for (let i = 0; i < flames.length; i += 1) {
    const flame = flames[i];
    const base = flame.userData.baseScaleY ?? flame.scale.y;
    const pulse = 1 + Math.sin(time * 34 + i * 1.7) * 0.16 + Math.sin(time * 11 + i) * 0.06;
    flame.scale.y = base * pulse * intensity;
  }
}
