import * as THREE from "three";

import type {
  Nanobot,
} from "./NanobotTypes";

export interface NanobotVisual {
  root: THREE.Group;
  body: THREE.Mesh;
  glow: THREE.Mesh;
  ring: THREE.Mesh;
}

const NANOBOT_BODY_RADIUS = 0.0018;

export function createNanobotVisual(
  nanobot: Nanobot,
): NanobotVisual {
  const root =
    new THREE.Group();

  root.name =
    `nanobot-${nanobot.id}`;

  const bodyGeometry =
    new THREE.SphereGeometry(
      NANOBOT_BODY_RADIUS,
      16,
      16,
    );

  const bodyMaterial =
    new THREE.MeshStandardMaterial({
      color: 0x0088ff,
      emissive: 0x0066ff,
      emissiveIntensity: 2,
      metalness: 0.35,
      roughness: 0.25,
    });

  const body =
    new THREE.Mesh(
      bodyGeometry,
      bodyMaterial,
    );

  body.name =
    `${nanobot.id}-body`;

  root.add(body);

  const glowGeometry =
    new THREE.SphereGeometry(
      NANOBOT_BODY_RADIUS * 2.2,
      12,
      12,
    );

  const glowMaterial =
    new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending:
        THREE.AdditiveBlending,
    });

  const glow =
    new THREE.Mesh(
      glowGeometry,
      glowMaterial,
    );

  glow.name =
    `${nanobot.id}-glow`;

  root.add(glow);

  const ringGeometry =
    new THREE.TorusGeometry(
      NANOBOT_BODY_RADIUS * 1.8,
      NANOBOT_BODY_RADIUS * 0.22,
      8,
      24,
    );

  const ringMaterial =
    new THREE.MeshBasicMaterial({
      color: 0x33aaff,
      transparent: true,
      opacity: 0.8,
    });

  const ring =
    new THREE.Mesh(
      ringGeometry,
      ringMaterial,
    );

  ring.name =
    `${nanobot.id}-ring`;

  ring.rotation.x =
    Math.PI / 2;

  root.add(ring);

  root.userData.nanobotId =
    nanobot.id;

  return {
    root,
    body,
    glow,
    ring,
  };
}

export function updateNanobotVisual(
  visual: NanobotVisual,
  nanobot: Nanobot,
  elapsedTime: number,
): void {
  visual.root.position.set(
    nanobot.position.x,
    nanobot.position.y,
    nanobot.position.z,
  );

  const pulse =
    1 +
    Math.sin(
      elapsedTime * 4,
    ) *
      0.12;

  visual.glow.scale.setScalar(
    pulse,
  );

  visual.ring.rotation.z =
    elapsedTime * 2;

  const stateIntensity =
    nanobot.state ===
    "error"
      ? 0.2
      : nanobot.state ===
          "working"
        ? 2.5
        : nanobot.state ===
            "arrived"
          ? 2
          : 1.5;

  if (
    visual.body.material instanceof
    THREE.MeshStandardMaterial
  ) {
    visual.body.material.emissiveIntensity =
      stateIntensity;
  }

  if (
    visual.glow.material instanceof
    THREE.MeshBasicMaterial
  ) {
    visual.glow.material.opacity =
      nanobot.state ===
      "completed"
        ? 0.05
        : 0.12;
  }
}

export function disposeNanobotVisual(
  visual: NanobotVisual,
): void {
  visual.body.geometry.dispose();
  visual.glow.geometry.dispose();
  visual.ring.geometry.dispose();

  if (
    Array.isArray(
      visual.body.material,
    )
  ) {
    visual.body.material.forEach(
      (material) =>
        material.dispose(),
    );
  } else {
    visual.body.material.dispose();
  }

  if (
    Array.isArray(
      visual.glow.material,
    )
  ) {
    visual.glow.material.forEach(
      (material) =>
        material.dispose(),
    );
  } else {
    visual.glow.material.dispose();
  }

  if (
    Array.isArray(
      visual.ring.material,
    )
  ) {
    visual.ring.material.forEach(
      (material) =>
        material.dispose(),
    );
  } else {
    visual.ring.material.dispose();
  }
}