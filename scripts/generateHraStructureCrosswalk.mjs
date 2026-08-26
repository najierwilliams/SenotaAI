import { readFileSync, writeFileSync } from "node:fs";

const glbPath = "client/public/models/luna/brain/source/3d-vh-f-allen-brain.glb";
const graphPath = "/tmp/hra-brain-female-v11-graph.json";
const glb = readFileSync(glbPath);
const jsonLength = glb.readUInt32LE(12);
const document = JSON.parse(glb.toString("utf8", 20, 20 + jsonLength));
const graph = JSON.parse(readFileSync(graphPath, "utf8"));
const meshNames = (document.nodes ?? [])
  .filter((node) => Number.isInteger(node.mesh) && typeof node.name === "string")
  .map((node) => node.name)
  .sort();
const graphBySubpath = new Map(
  (graph.data ?? [])
    .filter((entry) => entry.object_reference?.file_name === "Allen_F_Brain.glb" && entry.object_reference?.file_subpath && entry.representation_of)
    .map((entry) => [entry.object_reference.file_subpath, entry]),
);
const records = meshNames.map((meshName) => {
  const entity = graphBySubpath.get(meshName);
  return {
    lunaStructureId: meshName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""),
    lunaSourceName: meshName,
    meshBacked: true,
    canonicalOntology: entity ? "UBERON" : null,
    canonicalStructureId: entity?.representation_of ?? null,
    hraEntityId: entity?.id ?? null,
    hraEntityLabel: entity?.label ?? null,
    mappingStatus: entity ? "EVIDENCE_BACKED" : "UNMAPPED",
    mappingEvidence: entity
      ? "Exact official HRA v1.1 graph file_subpath matches the exact GLB mesh node name; representation_of supplies the UBERON identifier."
      : "No exact HRA v1.1 graph file_subpath record was found for this mesh node; no ontology identifier is inferred.",
    provenance: "https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json",
    sourceVersion: "HRA Brain-Female v1.1",
    providerMappings: [],
  };
});
const summary = {
  assetPath: glbPath,
  graphUrl: "https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json",
  meshNodeCount: meshNames.length,
  exactHraUberonMappings: records.filter((record) => record.mappingStatus === "EVIDENCE_BACKED").length,
  unmappedMeshNodes: records.filter((record) => record.mappingStatus === "UNMAPPED").length,
  records,
};
writeFileSync("docs/luna-hra-structure-crosswalk-evidence.json", `${JSON.stringify(summary, null, 2)}\n`);
const module = `/** Generated from exact HRA v1.1 graph file_subpath joins. Do not replace null identifiers with name-derived mappings. */\nexport const HRA_V11_STRUCTURE_CROSSWALK = ${JSON.stringify(records, null, 2)} as const;\n\nexport const HRA_V11_STRUCTURE_CROSSWALK_SUMMARY = ${JSON.stringify({ meshNodeCount: summary.meshNodeCount, exactHraUberonMappings: summary.exactHraUberonMappings, unmappedMeshNodes: summary.unmappedMeshNodes }, null, 2)} as const;\n`;
writeFileSync("server/scientificData/hraStructureCrosswalk.generated.ts", module);
console.log(JSON.stringify({ meshNodeCount: summary.meshNodeCount, exactHraUberonMappings: summary.exactHraUberonMappings, unmappedMeshNodes: summary.unmappedMeshNodes }, null, 2));
