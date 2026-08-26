import type {
  ScientificLicenseRecord,
  ScientificProvenanceRecord,
} from "@shared/brainScience";

export const SCIENTIFIC_LICENSE_REGISTRY: ScientificLicenseRecord[] = [
  {
    id: "hra-brain-female-v1-1",
    provider: "HuBMAP / Human Reference Atlas",
    dataset: "HRA Brain-Female v1.1",
    license: "CC BY 4.0",
    redistribution: "permitted-with-attribution",
    sourceUrl: "https://purl.humanatlas.io/ref-organ/brain-female/v1.1",
    note: "Luna retains the visual GLB under the source record's attribution terms.",
  },
  {
    id: "julich-brain-v3-1",
    provider: "EBRAINS / Julich-Brain",
    dataset: "Julich-Brain Atlas cytoarchitectonic maps v3.1",
    license: "CC BY-NC-SA 4.0",
    redistribution: "not-redistributed",
    sourceUrl: "https://search.kg.ebrains.eu/instances/f1fe19e8-99bd-44bc-9616-a52850680777",
    note: "Luna requests lightweight provider metadata only and does not bundle Julich maps or meshes.",
  },
  {
    id: "bigbrain-provider-context",
    provider: "BigBrain / EBRAINS",
    dataset: "BigBrain provider context",
    license: null,
    redistribution: "review-required",
    sourceUrl: "https://julich-brain-atlas.de/atlas",
    note: "Provider-scoped context only; confirm dataset-specific terms before any derivative or redistribution.",
  },
  {
    id: "allen-human-brain-atlas",
    provider: "Allen Institute",
    dataset: "Allen Human Brain Atlas",
    license: null,
    redistribution: "review-required",
    sourceUrl: "https://brain-map.org/support/documentation/human-brain-atlas-api",
    note: "Sample and donor metadata may be queried only under the provider's current terms; no raw dataset is bundled.",
  },
];

export const SCIENTIFIC_PROVENANCE_REGISTRY: ScientificProvenanceRecord[] = [
  {
    id: "hra-brain-female-v1-1-graph",
    provider: "HuBMAP / Human Reference Atlas",
    dataset: "HRA Brain-Female v1.1 graph",
    version: "v1.1",
    sourceUrl: "https://cdn.humanatlas.io/digital-objects/ref-organ/brain-female/v1.1/graph.json",
    citation: "HRA Brain-Female v1.1",
    referenceSpaceId: null,
    registrationMethod: "Exact GLB mesh-node to HRA graph file_subpath identity join; not an MNI transform.",
    retrievedAt: "2026-08-26",
    evidenceTier: "structure-context",
    licenseId: "hra-brain-female-v1-1",
  },
  {
    id: "julich-brain-v3-1-mni-2009c",
    provider: "EBRAINS / Julich-Brain",
    dataset: "Julich-Brain Atlas cytoarchitectonic maps v3.1",
    version: "v3.1",
    sourceUrl: "https://search.kg.ebrains.eu/instances/f1fe19e8-99bd-44bc-9616-a52850680777",
    citation: "doi:10.25493/KNSN-XB4",
    referenceSpaceId: "ebrains-mni-icbm-152-2009c",
    registrationMethod: "Provider-native MNI ICBM 152 2009c nonlinear asymmetric atlas space; not a Luna transform.",
    retrievedAt: "2026-08-26",
    evidenceTier: "region-probabilistic",
    licenseId: "julich-brain-v3-1",
  },
  {
    id: "bigbrain-provider-context",
    provider: "BigBrain / EBRAINS",
    dataset: "BigBrain provider context",
    version: null,
    sourceUrl: "https://julich-brain-atlas.de/atlas",
    citation: null,
    referenceSpaceId: null,
    registrationMethod: null,
    retrievedAt: "2026-08-26",
    evidenceTier: "structure-context",
    licenseId: "bigbrain-provider-context",
  },
  {
    id: "allen-ahba-sample-context",
    provider: "Allen Institute",
    dataset: "Allen Human Brain Atlas sample context",
    version: null,
    sourceUrl: "https://brain-map.org/support/documentation/human-brain-atlas-api",
    citation: null,
    referenceSpaceId: null,
    registrationMethod: "Allen donor MR-to-MNI alignment applies to Allen donor/sample records only.",
    retrievedAt: "2026-08-26",
    evidenceTier: "structure-context",
    licenseId: "allen-human-brain-atlas",
  },
];

export function getScientificLicense(id: string) {
  return SCIENTIFIC_LICENSE_REGISTRY.find((record) => record.id === id) ?? null;
}

export function getScientificProvenance(id: string) {
  return SCIENTIFIC_PROVENANCE_REGISTRY.find((record) => record.id === id) ?? null;
}
