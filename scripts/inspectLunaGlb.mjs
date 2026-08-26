import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const input = resolve(process.cwd(), "client/public/models/luna/brain/source/3d-vh-f-allen-brain.glb");
const output = process.env.LUNA_GLB_INSPECTION_OUTPUT ?? "/tmp/luna-glb-inspection.json";
const buffer = readFileSync(input);
const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
const magic = view.getUint32(0, true);
const version = view.getUint32(4, true);
const declaredLength = view.getUint32(8, true);
if (magic !== 0x46546c67 || version !== 2) throw new Error("Not a glTF 2.0 binary asset.");

let offset = 12;
let documentJson;
const chunks = [];
while (offset + 8 <= buffer.length) {
  const length = view.getUint32(offset, true);
  const type = view.getUint32(offset + 4, true);
  const contentOffset = offset + 8;
  chunks.push({ type, length });
  if (type === 0x4e4f534a) documentJson = JSON.parse(buffer.subarray(contentOffset, contentOffset + length).toString("utf8").trim());
  offset = contentOffset + length;
}
if (!documentJson) throw new Error("GLB has no JSON chunk.");

const primitiveBounds = [];
for (const [meshIndex, mesh] of (documentJson.meshes ?? []).entries()) {
  for (const [primitiveIndex, primitive] of (mesh.primitives ?? []).entries()) {
    const positionAccessorIndex = primitive.attributes?.POSITION;
    const accessor = Number.isInteger(positionAccessorIndex) ? documentJson.accessors?.[positionAccessorIndex] : null;
    primitiveBounds.push({
      meshIndex,
      meshName: mesh.name ?? null,
      primitiveIndex,
      mode: primitive.mode ?? 4,
      positionAccessorIndex: positionAccessorIndex ?? null,
      count: accessor?.count ?? null,
      min: accessor?.min ?? null,
      max: accessor?.max ?? null,
    });
  }
}

const finiteBounds = primitiveBounds.filter((entry) => Array.isArray(entry.min) && Array.isArray(entry.max));
const aggregateBounds = finiteBounds.length
  ? {
      min: [0, 1, 2].map((axis) => Math.min(...finiteBounds.map((entry) => entry.min[axis]))),
      max: [0, 1, 2].map((axis) => Math.max(...finiteBounds.map((entry) => entry.max[axis]))),
    }
  : null;

const nodes = (documentJson.nodes ?? []).map((node, index) => ({
  index,
  name: node.name ?? null,
  mesh: node.mesh ?? null,
  children: node.children ?? [],
  translation: node.translation ?? [0, 0, 0],
  rotation: node.rotation ?? [0, 0, 0, 1],
  scale: node.scale ?? [1, 1, 1],
  matrix: node.matrix ?? null,
  extras: node.extras ?? null,
}));

const report = {
  input,
  byteLength: buffer.length,
  header: { magic: "glTF", version, declaredLength, chunkCount: chunks.length, chunks },
  asset: documentJson.asset ?? null,
  scene: documentJson.scene ?? null,
  scenes: documentJson.scenes ?? [],
  extensionsUsed: documentJson.extensionsUsed ?? [],
  extensionsRequired: documentJson.extensionsRequired ?? [],
  topLevelExtras: documentJson.extras ?? null,
  counts: {
    nodes: nodes.length,
    meshes: documentJson.meshes?.length ?? 0,
    primitiveCount: primitiveBounds.length,
    accessors: documentJson.accessors?.length ?? 0,
    materials: documentJson.materials?.length ?? 0,
    animations: documentJson.animations?.length ?? 0,
    skins: documentJson.skins?.length ?? 0,
    cameras: documentJson.cameras?.length ?? 0,
  },
  nodes,
  primitiveBounds,
  aggregateBounds,
  nodeTransformSummary: {
    nodesWithMatrix: nodes.filter((node) => node.matrix !== null).length,
    nodesWithNonIdentityTranslation: nodes.filter((node) => node.translation.some((value) => value !== 0)).length,
    nodesWithNonIdentityRotation: nodes.filter((node) => node.rotation.some((value, index) => value !== (index === 3 ? 1 : 0))).length,
    nodesWithNonIdentityScale: nodes.filter((node) => node.scale.some((value) => value !== 1)).length,
  },
};
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Wrote ${output}`);
