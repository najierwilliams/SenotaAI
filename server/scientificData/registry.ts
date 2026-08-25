import type {
  BrainCoordinateTransform,
  BrainDataset,
  BrainReferenceSpace,
  BrainScientificDatasetManifest,
} from "@shared/brainScience";

export const BRAIN_REFERENCE_SPACES: BrainReferenceSpace[] = [
  {
    id: "luna-viewer-local",
    label: "Luna viewer local coordinates",
    kind: "viewer-local",
    provider: "luna",
    template: null,
    units: null,
    axisOrientation: null,
    coordinateConvention:
      "Undocumented native glTF mesh coordinates after BrainViewer presentation centering and display scaling.",
    resolution: null,
    version: null,
    provenanceUrl: null,
    description:
      "Repository-local Luna GLB coordinate frame. The asset contains no declared units, axis orientation, anatomical template, reference-space ID, or external registration metadata; BrainViewer centres and display-scales it. No validated transform to external scientific reference spaces is configured.",
  },
  {
    id: "ebrains-mni-icbm-152-2009c",
    label: "MNI ICBM 152 2009c",
    kind: "template",
    provider: "ebrains",
    template: "ICBM 152 2009c",
    units: "millimetres",
    axisOrientation: null,
    coordinateConvention: "Provider MNI/ICBM template coordinates",
    resolution: null,
    version: "2009c nonlinear asymmetric",
    provenanceUrl: "https://search.kg.ebrains.eu/instances/Dataset/4ac9f0bc-560d-47e0-8916-7b24da9bb0ce",
    description:
      "A human atlas reference space exposed by the EBRAINS multilevel human atlas.",
  },
  {
    id: "ebrains-bigbrain",
    label: "BigBrain reference space",
    kind: "histological",
    provider: "bigbrain",
    template: "BigBrain",
    units: "micrometres",
    axisOrientation: null,
    coordinateConvention: "Provider histological reference coordinates",
    resolution: "20 μm",
    version: null,
    provenanceUrl: "https://ebrains.eu/data-tools-services/brain-atlases/human-brain",
    description:
      "Microscopic 20 μm histological reference represented in the EBRAINS multilevel atlas.",
  },
  {
    id: "allen-human-donor-mr",
    label: "Allen Human Brain Atlas donor MR space",
    kind: "donor-native",
    provider: "allen-institute",
    template: null,
    units: "millimetres",
    axisOrientation: null,
    coordinateConvention: "Donor MR volume coordinates",
    resolution: "1 mm isotropic donor T1 acquisition",
    version: null,
    provenanceUrl: "https://brain-map.org/support/documentation/human-brain-atlas-api",
    description:
      "Donor-specific MR-volume coordinates of Allen Human Brain Atlas sampling sites. These are not interchangeable with Luna viewer coordinates.",
  },
  {
    id: "cellxgene-human-brain-anatomical-annotation",
    label: "CELLxGENE human-brain anatomical annotation",
    kind: "annotation",
    provider: "cellxgene",
    template: null,
    units: null,
    axisOrientation: null,
    coordinateConvention: null,
    resolution: null,
    version: "Human Brain Cell Atlas v1.0",
    provenanceUrl: "https://cellxgene.cziscience.com/collections/283d65eb-dd53-496d-adb7-7570c7caa443",
    description:
      "Dataset anatomical-region annotation metadata. It is not a 3D spatial coordinate system.",
  },
];

export const BRAIN_COORDINATE_TRANSFORMS: BrainCoordinateTransform[] = [
  {
    id: "luna-to-ebrains-mni",
    sourceReferenceSpaceId: "luna-viewer-local",
    targetReferenceSpaceId: "ebrains-mni-icbm-152-2009c",
    status: "unavailable",
    transformType: "unavailable",
    version: null,
    method: null,
    documentationUrl: null,
    confidence: null,
    reversible: null,
    note:
      "No validated transform from the Luna GLB coordinate frame to MNI is configured. Luna does not project external coordinates into the viewer.",
  },
  {
    id: "ebrains-mni-to-luna",
    sourceReferenceSpaceId: "ebrains-mni-icbm-152-2009c",
    targetReferenceSpaceId: "luna-viewer-local",
    status: "unavailable",
    transformType: "unavailable",
    version: null,
    method: null,
    documentationUrl: null,
    confidence: null,
    reversible: null,
    note:
      "No validated transform from MNI ICBM 152 2009c to the Luna GLB coordinate frame is configured. Provider coordinates are not projected into the viewer.",
  },
  {
    id: "allen-donor-mr-to-mni",
    sourceReferenceSpaceId: "allen-human-donor-mr",
    targetReferenceSpaceId: "ebrains-mni-icbm-152-2009c",
    status: "available",
    transformType: "provider-service",
    version: null,
    method: "Provider-documented donor-specific MR-to-MNI registration",
    documentationUrl:
      "https://brain-map.org/support/documentation/human-brain-atlas-api",
    confidence: null,
    reversible: null,
    note:
      "The Allen provider documents donor-specific transforms. Luna does not apply them client-side; returned sample coordinates remain provider provenance.",
  },
];

export const BRAIN_DATASETS: BrainDataset[] = [
  {
    id: "luna-macro-anatomy-model",
    name: "Luna Macro Anatomy Model",
    provider: "luna",
    scale: "macro",
    modality: "3D anatomical mesh",
    species: "Homo sapiens",
    version: null,
    status: "available",
    accessType: "local-asset",
    endpoint: null,
    assetUrl:
      "/models/luna/brain/source/3d-vh-f-allen-brain.glb",
    requiresAuthentication: false,
    downloadable: false,
    approximateSize: null,
    license: "Repository asset; source licensing must be retained with the asset.",
    citation: null,
    referenceSpaceIds: ["luna-viewer-local"],
    description:
      "The repository-local GLB used by the Luna Brain Macro viewer. Its filename includes an Allen label, but no source package, asset-specific citation, coordinate declaration, or registration record is retained in this repository.",
    limitations:
      "Its native glTF mesh frame has undocumented units, orientation, origin, and anatomical template. It is not a registered MNI, ICBM, donor-MR, or BigBrain transform; display normalization is never a scientific transform.",
  },
  {
    id: "ebrains-multilevel-human-atlas",
    name: "EBRAINS Multilevel Human Brain Atlas",
    provider: "ebrains",
    scale: "tissue",
    modality: "Probabilistic cytoarchitecture and regional atlas metadata",
    species: "Homo sapiens",
    version: "siibra API v3.0",
    status: "partial",
    accessType: "remote-api",
    endpoint: "https://siibra-api-stable.apps.hbp.eu/v3_0",
    assetUrl: null,
    requiresAuthentication: false,
    downloadable: true,
    approximateSize: null,
    license: "Dataset and asset specific; no provider data is redistributed by Luna.",
    citation:
      "Amunts K, Mohlberg H, Bludau S, Zilles K. Julich-Brain: A 3D probabilistic atlas of the human brain’s cytoarchitecture. Science. 2020;369(6506):988-992. https://doi.org/10.1126/science.abb4588",
    referenceSpaceIds: [
      "ebrains-mni-icbm-152-2009c",
      "ebrains-bigbrain",
    ],
    description:
      "Remote atlas metadata and regional feature discovery through the documented public siibra HTTP API.",
    limitations:
      "Luna exposes verified atlas metadata and provenance only. It does not download or render raw probabilistic volumes, and region mappings remain query-reviewed.",
  },
  {
    id: "julich-brain-cytoarchitecture",
    name: "Julich-Brain Cytoarchitectonic Atlas",
    provider: "julich-brain",
    scale: "tissue",
    modality: "3D probabilistic cytoarchitectonic maps",
    species: "Homo sapiens",
    version: null,
    status: "partial",
    accessType: "remote-api",
    endpoint: "https://siibra-api-stable.apps.hbp.eu/v3_0/atlases/juelich/iav/atlas/v1.0.0/1",
    assetUrl: null,
    requiresAuthentication: false,
    downloadable: true,
    approximateSize: "Tera- to petabyte-scale source imaging pipeline",
    license: "Dataset and asset specific; no raw map is copied into Luna.",
    citation:
      "Amunts K, Mohlberg H, Bludau S, Zilles K. Julich-Brain: A 3D probabilistic atlas of the human brain’s cytoarchitecture. Science. 2020;369(6506):988-992. https://doi.org/10.1126/science.abb4588",
    referenceSpaceIds: [
      "ebrains-mni-icbm-152-2009c",
      "ebrains-bigbrain",
    ],
    description:
      "Cytoarchitectonic tissue context reached through the EBRAINS/siibra atlas service.",
    limitations:
      "No raw probability map is converted to a false binary boundary or displayed in Luna’s local coordinate frame.",
  },
  {
    id: "bigbrain-microscopic-reference",
    name: "BigBrain Microscopic Human Brain Reference",
    provider: "bigbrain",
    scale: "tissue",
    modality: "20 μm histological 3D reference",
    species: "Homo sapiens",
    version: null,
    status: "unsupported",
    accessType: "remote-stream",
    endpoint: "https://bigbrainproject.org/",
    assetUrl: null,
    requiresAuthentication: false,
    downloadable: true,
    approximateSize: ">1 TB full dataset",
    license: "Dataset-specific terms must be reviewed before derivative use or redistribution.",
    citation:
      "Amunts K, et al. BigBrain: An Ultrahigh-Resolution 3D Human Brain Model. Science. 2013;340(6139):1472-1475. https://doi.org/10.1126/science.1235381",
    referenceSpaceIds: ["ebrains-bigbrain"],
    description:
      "A microscopic reference discoverable in EBRAINS; retained as a future streaming/derived-map candidate.",
    limitations:
      "The full source dataset is too large for GitHub and browser payloads. Luna does not download, cache, or render the raw volume.",
  },
  {
    id: "cellxgene-human-brain-cell-atlas-v1",
    name: "Human Brain Cell Atlas v1.0",
    provider: "cellxgene",
    scale: "cellular",
    modality: "Single-nucleus transcriptomic cell metadata",
    species: "Homo sapiens",
    version: "CELLxGENE collection version retrieved at runtime",
    status: "partial",
    accessType: "server-query",
    endpoint:
      "https://api.cellxgene.cziscience.com/curation/v1/collections/283d65eb-dd53-496d-adb7-7570c7caa443",
    assetUrl: null,
    requiresAuthentication: false,
    downloadable: true,
    approximateSize: "Collection contains >3 million nuclei; individual H5AD files vary by subset.",
    license: "Dataset-specific; Luna retrieves metadata only and does not redistribute H5AD files.",
    citation:
      "Siletti K, et al. A cellular census of the human brain. Science. 2023. https://doi.org/10.1126/science.add7046",
    referenceSpaceIds: [
      "cellxgene-human-brain-anatomical-annotation",
    ],
    description:
      "Lazy server-side collection metadata lookup for selected anatomy, returning only bounded dataset summaries.",
    limitations:
      "The collection is transcriptomic and anatomical metadata, not a 3D coordinate set aligned to the Luna GLB. Luna does not render cells without provider-supported positions.",
  },
  {
    id: "allen-human-brain-atlas-microarray",
    name: "Allen Human Brain Atlas Microarray",
    provider: "allen-institute",
    scale: "molecular",
    modality: "Microarray gene-expression sampling metadata and expression service",
    species: "Homo sapiens",
    version: null,
    status: "partial",
    accessType: "remote-api",
    endpoint: "https://api.brain-map.org/api/v2/data/query.json",
    assetUrl: null,
    requiresAuthentication: false,
    downloadable: true,
    approximateSize: "Provider data and downloads vary by donor and query.",
    license: "Use is subject to provider terms and citation policy; Luna does not redistribute raw data.",
    citation:
      "Allen Institute for Brain Science. Allen Human Brain Atlas API. https://brain-map.org/support/documentation/human-brain-atlas-api",
    referenceSpaceIds: ["allen-human-donor-mr"],
    description:
      "Lazy remote lookup of provider structure metadata for molecular queries, with exact results and donor/MR provenance retained.",
    limitations:
      "No expression value is inferred for an unmatched Luna structure or interpolated across anatomy. Returned molecular measurements require an exact provider structure/probe query.",
  },
  {
    id: "human-cortical-em-fragment",
    name: "Human Cortical Electron-Microscopy Fragment",
    provider: "human-em",
    scale: "subcellular",
    modality: "Electron-microscopy reconstruction",
    species: "Homo sapiens",
    version: null,
    status: "unavailable",
    accessType: "download",
    endpoint: null,
    assetUrl: null,
    requiresAuthentication: false,
    downloadable: true,
    approximateSize: "~1.4 PB source imaging data",
    license: "Provider-specific; no source data is included in Luna.",
    citation:
      "Shapson-Coe A, et al. A petavoxel fragment of human cerebral cortex reconstructed at nanoscale resolution. Science. 2024. https://doi.org/10.1126/science.adk4858",
    referenceSpaceIds: [],
    description:
      "A public, sample-scoped human cortical EM resource retained in the registry as a future candidate.",
    limitations:
      "It is a single surgical cortical sample without a validated mapping to Luna’s canonical whole-brain structures. Luna therefore does not expose it as subcellular structure data.",
  },
];

export function getDataset(
  id: string,
): BrainDataset | null {
  return (
    BRAIN_DATASETS.find(
      (dataset) => dataset.id === id,
    ) ?? null
  );
}

export function getDatasetsForScale(
  scale: BrainDataset["scale"],
): BrainDataset[] {
  return BRAIN_DATASETS.filter(
    (dataset) => dataset.scale === scale,
  );
}

export function getScientificDatasetManifest(): BrainScientificDatasetManifest {
  return {
    datasets: BRAIN_DATASETS,
    referenceSpaces: BRAIN_REFERENCE_SPACES,
    coordinateTransforms:
      BRAIN_COORDINATE_TRANSFORMS,
  };
}
