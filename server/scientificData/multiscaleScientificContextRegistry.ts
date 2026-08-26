export type ScopedObservationKind =
  | "provider-scientific-context"
  | "sample-scoped-spatial-data"
  | "sample-scoped-subcellular-observation";

export interface ScopedScientificContext {
  id: string;
  scale: "tissue" | "cellular" | "molecular" | "subcellular";
  kind: ScopedObservationKind;
  provider: string;
  dataset: string;
  version: string | null;
  referenceSpaceId: string | null;
  coordinateAvailability: "provider-space-only" | "sample-scoped" | "unavailable";
  resolution: string | null;
  licenseStatus: "not-redistributed" | "review-required";
  provenanceUrl: string;
  evidenceTier: "structure-context" | "region-probabilistic" | "point-validated";
  limitation: string;
}

export const MULTISCALE_SCIENTIFIC_CONTEXTS: ScopedScientificContext[] = [
  {
    id: "bigbrain-julich-provider-context",
    scale: "tissue",
    kind: "provider-scientific-context",
    provider: "BigBrain / siibra",
    dataset: "BigBrain linked Julich context",
    version: null,
    referenceSpaceId: null,
    coordinateAvailability: "provider-space-only",
    resolution: "20 micrometre BigBrain reference; no Luna-local rendering",
    licenseStatus: "review-required",
    provenanceUrl: "https://julich-brain-atlas.de/atlas",
    evidenceTier: "structure-context",
    limitation: "Provider-scoped context only. No BigBrain-to-Luna transform, raw dataset download, or redistribution is present.",
  },
  {
    id: "julich-receptor-molecular-context",
    scale: "molecular",
    kind: "provider-scientific-context",
    provider: "Julich-Brain / siibra",
    dataset: "Julich receptor architectonics context",
    version: null,
    referenceSpaceId: "ebrains-mni-icbm-152-2009c",
    coordinateAvailability: "provider-space-only",
    resolution: null,
    licenseStatus: "review-required",
    provenanceUrl: "https://julich-brain-atlas.de/atlas",
    evidenceTier: "structure-context",
    limitation: "No Luna structure-to-provider region relation or molecular value is inferred. Provider feature queries require their own documented relation and terms.",
  },
  {
    id: "allen-ahba-sample-molecular-context",
    scale: "molecular",
    kind: "sample-scoped-spatial-data",
    provider: "Allen Institute",
    dataset: "Allen Human Brain Atlas samples",
    version: null,
    referenceSpaceId: null,
    coordinateAvailability: "sample-scoped",
    resolution: "Donor/sample MR-volume coordinates in millimetres where supplied by Allen",
    licenseStatus: "review-required",
    provenanceUrl: "https://brain-map.org/support/documentation/human-brain-atlas-api",
    evidenceTier: "point-validated",
    limitation: "An Allen sample's documented donor/MR or MNI point is not a Luna coordinate and does not imply continuous whole-brain molecular coverage.",
  },
  {
    id: "cellular-spatial-dataset-pending",
    scale: "cellular",
    kind: "sample-scoped-spatial-data",
    provider: "Unselected",
    dataset: "Authoritative human brain spatial dataset pending selection",
    version: null,
    referenceSpaceId: null,
    coordinateAvailability: "unavailable",
    resolution: null,
    licenseStatus: "review-required",
    provenanceUrl: "https://humanatlas.io/",
    evidenceTier: "structure-context",
    limitation: "No cellular dataset is selected until donor, region, sample, spatial coordinate system, resolution, provenance, and licence are verified.",
  },
  {
    id: "subcellular-sample-context-pending",
    scale: "subcellular",
    kind: "sample-scoped-subcellular-observation",
    provider: "Unselected",
    dataset: "Microscopy or EM sample context pending selection",
    version: null,
    referenceSpaceId: null,
    coordinateAvailability: "unavailable",
    resolution: null,
    licenseStatus: "review-required",
    provenanceUrl: "https://ebrains.eu/",
    evidenceTier: "structure-context",
    limitation: "Subcellular evidence remains sample-scoped. Luna has no whole-brain subcellular coordinate system or dataset.",
  },
];

export function getMultiscaleContexts(scale: ScopedScientificContext["scale"]) {
  return MULTISCALE_SCIENTIFIC_CONTEXTS.filter((context) => context.scale === scale);
}
