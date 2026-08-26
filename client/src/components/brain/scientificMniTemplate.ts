import * as THREE from "three";

import type {
  MniScientificTemplateSurface,
} from "@shared/brainScience";

export interface MniScientificTemplateState {
  visible: boolean;
  opacity: number;
  loadState: "idle" | "loading" | "loaded" | "error";
  error: string | null;
}

export const MNI_TEMPLATE_MIN_OPACITY = 0.08;
export const MNI_TEMPLATE_MAX_OPACITY = 0.82;

export function createMniScientificTemplateState(
  surface: MniScientificTemplateSurface,
): MniScientificTemplateState {
  return {
    visible: surface.rendering.defaultVisible,
    opacity: surface.rendering.defaultOpacity,
    loadState: "idle",
    error: null,
  };
}

export function clampMniScientificTemplateOpacity(value: number): number {
  if (!Number.isFinite(value)) return MNI_TEMPLATE_MIN_OPACITY;
  return Math.min(
    MNI_TEMPLATE_MAX_OPACITY,
    Math.max(MNI_TEMPLATE_MIN_OPACITY, value),
  );
}

export function canStreamMniScientificTemplate(
  surface: MniScientificTemplateSurface,
): boolean {
  return surface.status === "PARTIAL" &&
    surface.rendering.deliveryMode === "provider-stream" &&
    surface.fragments.length === 2 &&
    surface.fragments.every((fragment) => fragment.bytes > 0 && fragment.decodedBytes > 0 && fragment.url.startsWith("https://"));
}

interface DecodedLegacyMesh {
  positions: Float32Array;
  indices: Uint32Array;
}

/**
 * Decodes the provider's legacy Neuroglancer mesh payload. Coordinates are
 * transformed only by the declared provider matrix in nanometres then expressed
 * in millimetres. This utility has no Luna/HRA input or transform parameter.
 */
export function decodeLegacyNeuroglancerMesh(
  payload: ArrayBuffer,
  transformMatrixNanometres: number[][],
): DecodedLegacyMesh {
  if (transformMatrixNanometres.length !== 4 || transformMatrixNanometres.some((row) => row.length !== 4)) {
    throw new Error("MNI provider transform must be a 4×4 matrix.");
  }
  if (payload.byteLength < 4) throw new Error("MNI provider mesh payload is too small.");

  const view = new DataView(payload);
  const vertexCount = view.getUint32(0, true);
  const vertexBytes = vertexCount * 3 * Float32Array.BYTES_PER_ELEMENT;
  const faceOffset = Uint32Array.BYTES_PER_ELEMENT + vertexBytes;
  if (faceOffset > payload.byteLength || (payload.byteLength - faceOffset) % (3 * Uint32Array.BYTES_PER_ELEMENT) !== 0) {
    throw new Error("MNI provider mesh payload has an invalid legacy Neuroglancer layout.");
  }

  const positions = new Float32Array(vertexCount * 3);
  const m = transformMatrixNanometres;
  for (let index = 0; index < vertexCount; index += 1) {
    const inputOffset = Uint32Array.BYTES_PER_ELEMENT + index * 3 * Float32Array.BYTES_PER_ELEMENT;
    const x = view.getFloat32(inputOffset, true);
    const y = view.getFloat32(inputOffset + Float32Array.BYTES_PER_ELEMENT, true);
    const z = view.getFloat32(inputOffset + 2 * Float32Array.BYTES_PER_ELEMENT, true);
    const outputOffset = index * 3;
    positions[outputOffset] = (m[0][0] * x + m[0][1] * y + m[0][2] * z + m[0][3]) / 1_000_000;
    positions[outputOffset + 1] = (m[1][0] * x + m[1][1] * y + m[1][2] * z + m[1][3]) / 1_000_000;
    positions[outputOffset + 2] = (m[2][0] * x + m[2][1] * y + m[2][2] * z + m[2][3]) / 1_000_000;
  }

  const triangleValueCount = (payload.byteLength - faceOffset) / Uint32Array.BYTES_PER_ELEMENT;
  const indices = new Uint32Array(triangleValueCount);
  for (let index = 0; index < triangleValueCount; index += 1) {
    const value = view.getUint32(faceOffset + index * Uint32Array.BYTES_PER_ELEMENT, true);
    if (value >= vertexCount) throw new Error("MNI provider mesh references a vertex outside its declared range.");
    indices[index] = value;
  }
  return { positions, indices };
}

function createMesh(
  decoded: DecodedLegacyMesh,
  fragmentId: string,
  opacity: number,
): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(decoded.positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(decoded.indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const material = new THREE.MeshStandardMaterial({
    color: fragmentId === "left-hemisphere_cortex" ? 0x55b7c7 : 0x6e83d1,
    emissive: fragmentId === "left-hemisphere_cortex" ? 0x0b2832 : 0x121a3c,
    emissiveIntensity: 0.22,
    transparent: true,
    opacity: clampMniScientificTemplateOpacity(opacity),
    side: THREE.DoubleSide,
    roughness: 0.62,
    metalness: 0.04,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `mni-2009c-template-${fragmentId}`;
  mesh.userData.scientificLayer = "mni-template";
  mesh.userData.providerFragmentId = fragmentId;
  return mesh;
}

export async function streamMniScientificTemplate(
  surface: MniScientificTemplateSurface,
  opacity: number,
  signal: AbortSignal,
): Promise<THREE.Group> {
  if (!canStreamMniScientificTemplate(surface)) {
    throw new Error("The registered MNI scientific template does not satisfy the provider-streaming safety contract.");
  }

  const payloads = await Promise.all(surface.fragments.map(async (fragment) => {
    const response = await fetch(fragment.url, {
      signal,
      cache: "no-store",
      headers: { Accept: "application/octet-stream" },
    });
    if (!response.ok) throw new Error(`MNI provider fragment ${fragment.id} returned HTTP ${response.status}.`);
    const wireBytes = response.headers.get("content-length");
    if (wireBytes && Number(wireBytes) !== fragment.bytes) {
      throw new Error(`MNI provider fragment ${fragment.id} changed wire size (${wireBytes} bytes; expected ${fragment.bytes}).`);
    }
    const payload = await response.arrayBuffer();
    if (payload.byteLength !== fragment.decodedBytes) {
      throw new Error(`MNI provider fragment ${fragment.id} changed decoded payload size (${payload.byteLength} bytes; expected ${fragment.decodedBytes}).`);
    }
    return { fragment, payload };
  }));

  const root = new THREE.Group();
  root.name = "mni-2009c-scientific-template";
  root.userData.scientificLayer = "mni-template";
  root.userData.referenceSpaceId = surface.referenceSpaceId;
  root.userData.visualModelRelationship = "separate-provider-native-mni-root-not-hra-registered";
  for (const { fragment, payload } of payloads) {
    root.add(createMesh(
      decodeLegacyNeuroglancerMesh(payload, surface.transformMatrixNanometres),
      fragment.id,
      opacity,
    ));
  }
  return root;
}

export function setMniScientificTemplateOpacity(
  root: THREE.Group,
  opacity: number,
): void {
  const nextOpacity = clampMniScientificTemplateOpacity(opacity);
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial) {
        material.opacity = nextOpacity;
        material.transparent = true;
        material.needsUpdate = true;
      }
    });
  });
}

export function disposeMniScientificTemplate(root: THREE.Group): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  });
  root.clear();
}
