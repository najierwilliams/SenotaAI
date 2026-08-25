import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  applyBrainTissueMaterialTuning,
  enableBrainMeshDepth,
} from "./BrainVisualPresentation";

describe("Luna Macro visual presentation", () => {
  it("applies restrained non-metallic tissue tuning without replacing base color or maps", () => {
    const map = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({
      color: 0xb97868,
      roughness: 0.92,
      metalness: 0.6,
      map,
    });
    const originalColor = material.color.getHex();

    applyBrainTissueMaterialTuning(material);

    expect(material.color.getHex()).toBe(originalColor);
    expect(material.map).toBe(map);
    expect(material.metalness).toBe(0.02);
    expect(material.roughness).toBeGreaterThanOrEqual(0.34);
    expect(material.roughness).toBeLessThanOrEqual(0.74);
    expect(material.dithering).toBe(true);
  });

  it("enables visual depth on the existing mesh without changing its identity, geometry, or transform", () => {
    const geometry = new THREE.SphereGeometry(1, 8, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0xc88b7f,
      roughness: 0.5,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "Left_Hippocampus";
    mesh.position.set(1, 2, 3);
    const originalGeometry = mesh.geometry;
    const originalPosition = mesh.position.clone();

    enableBrainMeshDepth(mesh);

    expect(mesh.name).toBe("Left_Hippocampus");
    expect(mesh.geometry).toBe(originalGeometry);
    expect(mesh.position).toEqual(originalPosition);
    expect(mesh.castShadow).toBe(true);
    expect(mesh.receiveShadow).toBe(true);
  });
});
