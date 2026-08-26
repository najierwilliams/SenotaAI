import { readFileSync, writeFileSync } from "node:fs";

const assetPath = "client/public/models/luna/brain/source/3d-vh-f-allen-brain.glb";
const buffer = readFileSync(assetPath);
const magic = buffer.toString("utf8", 0, 4);
if (magic !== "glTF") throw new Error("Not a GLB file");
const jsonLength = buffer.readUInt32LE(12);
const jsonType = buffer.readUInt32LE(16);
if (jsonType !== 0x4e4f534a) throw new Error("First GLB chunk is not JSON");
const gltf = JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength));
const nodes = (gltf.nodes ?? []).filter((node) => typeof node.name === "string");
const meshNodes = nodes.filter((node) => Number.isInteger(node.mesh));
const output = {
  assetPath,
  glbVersion: gltf.asset?.version ?? null,
  generator: gltf.asset?.generator ?? null,
  nodeCount: nodes.length,
  meshNodeCount: meshNodes.length,
  meshBackedSourceNames: meshNodes.map((node) => node.name).sort(),
  nonMeshNamedNodes: nodes.filter((node) => !Number.isInteger(node.mesh)).map((node) => node.name).sort(),
};
writeFileSync("docs/luna-visual-structure-inventory.json", `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ nodeCount: output.nodeCount, meshNodeCount: output.meshNodeCount }, null, 2));
