import * as THREE from "three";

import type {
  BrainScale,
} from "./BrainStructureRegistry";

export interface NanobotObservationEnvironment {
  root: THREE.Group;
  scale: BrainScale;
}

const SCALE_ENVIRONMENT: Record<
  BrainScale,
  {
    color: number;
    accent: number;
    gridSize: number;
    ringRadius: number;
    detail: number;
  }
> = {
  macro: {
    color: 0x000000,
    accent: 0xff3333,
    gridSize: 0,
    ringRadius: 0,
    detail: 0,
  },
  tissue: {
    color: 0x2a1116,
    accent: 0xff6b6b,
    gridSize: 0.11,
    ringRadius: 0.055,
    detail: 10,
  },
  cellular: {
    color: 0x1e1028,
    accent: 0xff9f5cff,
    gridSize: 0.085,
    ringRadius: 0.042,
    detail: 16,
  },
  subcellular: {
    color: 0x102536,
    accent: 0x58c7ff,
    gridSize: 0.06,
    ringRadius: 0.03,
    detail: 22,
  },
  molecular: {
    color: 0x172211,
    accent: 0xb5ff70,
    gridSize: 0.042,
    ringRadius: 0.021,
    detail: 30,
  },
};

function disposeObject(
  object: THREE.Object3D,
): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.LineSegments)) {
      return;
    }

    child.geometry.dispose();
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    materials.forEach((material) => material.dispose());
  });
}

function createSimulationGeometry(
  scale: BrainScale,
): THREE.Group {
  const configuration = SCALE_ENVIRONMENT[scale];
  const root = new THREE.Group();

  if (scale === "macro") {
    return root;
  }

  const grid = new THREE.GridHelper(
    configuration.gridSize,
    Math.max(4, configuration.detail),
    configuration.accent,
    configuration.color,
  );
  grid.position.y = -configuration.gridSize * 0.25;
  grid.material.transparent = true;
  grid.material.opacity = 0.38;
  root.add(grid);

  const ringGeometry = new THREE.TorusGeometry(
    configuration.ringRadius,
    configuration.ringRadius * 0.035,
    8,
    42,
  );
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: configuration.accent,
    transparent: true,
    opacity: 0.32,
  });
  const outerRing = new THREE.Mesh(ringGeometry, ringMaterial);
  outerRing.rotation.x = Math.PI / 2;
  root.add(outerRing);

  const innerRing = outerRing.clone();
  innerRing.scale.setScalar(0.62);
  innerRing.rotation.z = Math.PI / 3;
  root.add(innerRing);

  const markerGeometry = new THREE.SphereGeometry(
    configuration.ringRadius * 0.025,
    8,
    8,
  );
  const markerMaterial = new THREE.MeshBasicMaterial({
    color: configuration.accent,
    transparent: true,
    opacity: 0.55,
  });

  for (let index = 0; index < configuration.detail; index += 1) {
    const angle = (index / configuration.detail) * Math.PI * 2;
    const marker = new THREE.Mesh(
      markerGeometry,
      markerMaterial,
    );
    marker.position.set(
      Math.cos(angle) * configuration.ringRadius * 0.82,
      Math.sin(angle * 2) * configuration.ringRadius * 0.08,
      Math.sin(angle) * configuration.ringRadius * 0.82,
    );
    root.add(marker);
  }

  root.userData.simulationOnly = true;
  root.userData.scale = scale;
  return root;
}

export function createNanobotObservationEnvironment(): NanobotObservationEnvironment {
  return {
    root: new THREE.Group(),
    scale: "macro",
  };
}

export function setNanobotObservationEnvironmentScale(
  environment: NanobotObservationEnvironment,
  scale: BrainScale,
): void {
  while (environment.root.children.length) {
    const child = environment.root.children[0];
    environment.root.remove(child);
    disposeObject(child);
  }

  const content = createSimulationGeometry(scale);
  environment.root.add(content);
  environment.scale = scale;
  environment.root.visible = scale !== "macro";
}

export function updateNanobotObservationEnvironment(
  environment: NanobotObservationEnvironment,
  elapsedSeconds: number,
): void {
  if (!environment.root.visible) return;

  environment.root.rotation.y = elapsedSeconds * 0.08;
  environment.root.children.forEach((child, index) => {
    child.rotation.y += 0.0015 * (index + 1);
  });
}

export function disposeNanobotObservationEnvironment(
  environment: NanobotObservationEnvironment,
): void {
  while (environment.root.children.length) {
    const child = environment.root.children[0];
    environment.root.remove(child);
    disposeObject(child);
  }
}
