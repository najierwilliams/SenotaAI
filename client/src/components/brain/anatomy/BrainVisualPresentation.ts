import * as THREE from "three";

/**
 * Conservative presentation tuning for the existing Macro GLB. The helper
 * never changes geometry, names, transforms, textures, or material colors.
 */
export function applyBrainTissueMaterialTuning(
  material: THREE.Material,
): void {
  if (!(material instanceof THREE.MeshStandardMaterial)) {
    return;
  }

  material.metalness = Math.min(
    material.metalness,
    0.02,
  );
  material.roughness = THREE.MathUtils.clamp(
    material.roughness * 0.72 + 0.08,
    0.34,
    0.74,
  );
  material.envMapIntensity = Math.min(
    material.envMapIntensity,
    0.32,
  );
  material.dithering = true;
  material.needsUpdate = true;
}

/**
 * Enables renderer-level soft self-shadowing for an existing GLB mesh while
 * preserving its structure name, geometry, materials, and transform.
 */
export function enableBrainMeshDepth(
  mesh: THREE.Mesh,
): void {
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];

  materials.forEach(
    applyBrainTissueMaterialTuning,
  );
}
