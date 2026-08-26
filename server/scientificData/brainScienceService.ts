import type {
  BrainDataset,
  BrainDatasetProvenance,
  BrainDatasetStatus,
  BrainReferenceSpace,
  BrainScientificFinding,
  BrainScientificObservation,
  BrainStructureMapping,
} from "@shared/brainScience";
import {
  getDataset,
  BRAIN_LUNA_REFERENCE_REGISTRATION,
  BRAIN_REFERENCE_SPACES,
} from "./registry";
import {
  HRA_V11_ALLEN_BRAIN_SPATIAL_REGISTRATION,
} from "@shared/hraSpatial";
import {
  createSpatialTargetState,
} from "./spatialTargetService";
import {
  resolveCanonicalStructureMapping,
} from "./structureMappingService";
import {
  getCoordinateTransform,
} from "./coordinateTransformService";
import {
  getJulichV31MapCatalog,
} from "./ebrainsProvider";

const EBRAINS_HUMAN_ATLAS_URL =
  "https://siibra-api-stable.apps.hbp.eu/v3_0/atlases/juelich/iav/atlas/v1.0.0/1";

const CELLXGENE_HBCA_URL =
  "https://api.cellxgene.cziscience.com/curation/v1/collections/283d65eb-dd53-496d-adb7-7570c7caa443";

const ALLEN_BASE_URL =
  "https://api.brain-map.org/api/v2/data/query.json";

const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_STRUCTURE_NAME_LENGTH = 120;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const queryCache = new Map<
  string,
  CacheEntry<BrainScientificObservation>
>();

export interface BrainScientificQuery {
  scale: BrainScientificObservation["scale"];
  structureId?: string | null;
  structureName?: string | null;
  refresh?: boolean;
}

function getReferenceSpace(
  dataset: BrainDataset,
): BrainReferenceSpace | null {
  const referenceSpaceId =
    dataset.referenceSpaceIds[0];

  return (
    BRAIN_REFERENCE_SPACES.find(
      (space) => space.id === referenceSpaceId,
    ) ?? null
  );
}

function createProvenance(
  dataset: BrainDataset,
  accessedAt: string | null,
): BrainDatasetProvenance {
  return {
    provider: dataset.provider,
    datasetName: dataset.name,
    version: dataset.version,
    sourceUrl:
      dataset.endpoint ??
      dataset.assetUrl ??
      "",
    citation: dataset.citation,
    license: dataset.license,
    accessedAt,
    referenceSpaceIds:
      dataset.referenceSpaceIds,
  };
}

function createStructureMapping(
  query: BrainScientificQuery,
  dataset: BrainDataset,
): BrainStructureMapping | null {
  return resolveCanonicalStructureMapping({
    structureId: query.structureId,
    structureName: query.structureName,
    provider: dataset.provider,
  });
}

function sanitizeStructureName(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .slice(0, MAX_STRUCTURE_NAME_LENGTH);

  return normalized || null;
}

async function fetchJson<T>(
  url: string,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    FETCH_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Provider returned HTTP ${response.status}`,
      );
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function createUnavailableObservation(
  dataset: BrainDataset,
  query: BrainScientificQuery,
): BrainScientificObservation {
  return {
    scale: query.scale,
    status: dataset.status,
    dataset,
    registration: BRAIN_LUNA_REFERENCE_REGISTRATION,
    hraSpatialRegistration:
      HRA_V11_ALLEN_BRAIN_SPATIAL_REGISTRATION,
    structureMapping: createStructureMapping(
      query,
      dataset,
    ),
    referenceSpace: getReferenceSpace(dataset),
    coordinateTransform: null,
    ...createSpatialTargetState({
      scale: query.scale,
      dataset,
      provenance: createProvenance(dataset, null),
      referenceSpace: getReferenceSpace(dataset),
      structureMapping: createStructureMapping(query, dataset),
      coordinateTransform: null,
    }),
    findings: [],
    message:
      dataset.limitations ??
      "Scientific dataset unavailable for this observation context.",
    cached: false,
    fetchedAt: null,
  };
}

async function queryTissue(
  dataset: BrainDataset,
  query: BrainScientificQuery,
): Promise<BrainScientificObservation> {
  const payload = await fetchJson<{
    name?: string;
    spaces?: Array<{ "@id"?: string }>;
    parcellations?: Array<{ "@id"?: string }>;
  }>(EBRAINS_HUMAN_ATLAS_URL);

  const accessedAt = new Date().toISOString();
  const provenance = createProvenance(
    dataset,
    accessedAt,
  );
  const coordinateTransform = getCoordinateTransform(
    "ebrains-mni-icbm-152-2009c",
    "luna-viewer-local",
  );

  const parcellationCount =
    payload.parcellations?.length ?? 0;

  const bigBrainDataset = getDataset(
    "bigbrain-microscopic-reference",
  );
  const julichMapCatalog = await getJulichV31MapCatalog();

  const findings: BrainScientificFinding[] = [
    {
      id: "ebrains-human-atlas",
      label: "Atlas",
      value:
        payload.name ??
        "Multilevel Human Atlas",
      unit: null,
      kind: "atlas",
      provenance,
    },
    {
      id: "ebrains-parcellation-count",
      label: "Published parcellation references",
      value: String(parcellationCount),
      unit: "references",
      kind: "atlas",
      provenance,
    },
    {
      id: "julich-v3-1-mni-map-catalog",
      label: "Julich-Brain v3.1 MNI provider maps",
      value: julichMapCatalog.availability === "available"
        ? `${julichMapCatalog.maps.filter((map) => map.mapType === "LABELLED").length} labelled and ${julichMapCatalog.maps.filter((map) => map.mapType === "STATISTICAL").length} statistical map records`
        : "Provider map catalog temporarily unavailable",
      unit: null,
      kind: "atlas",
      provenance,
    },
    ...(bigBrainDataset
      ? [
          {
            id: "bigbrain-reference-context",
            label: "BigBrain scientific context",
            value: "20 μm histological reference · browser-native full-brain asset unavailable",
            unit: null,
            kind: "atlas" as const,
            provenance: createProvenance(bigBrainDataset, accessedAt),
          },
        ]
      : []),
  ];

  return {
    scale: query.scale,
    status: "partial",
    dataset,
    registration: BRAIN_LUNA_REFERENCE_REGISTRATION,
    hraSpatialRegistration:
      HRA_V11_ALLEN_BRAIN_SPATIAL_REGISTRATION,
    structureMapping: createStructureMapping(
      query,
      dataset,
    ),
    referenceSpace: getReferenceSpace(dataset),
    coordinateTransform,
    ...createSpatialTargetState({
      scale: query.scale,
      dataset,
      provenance,
      referenceSpace: getReferenceSpace(dataset),
      structureMapping: createStructureMapping(query, dataset),
      coordinateTransform,
    }),
    findings,
    message:
      "Live EBRAINS atlas metadata and Julich-Brain v3.1 MNI map catalog are available as provider context. They do not map the selected Luna structure, establish Luna-to-MNI registration, or create a target; regional assignment and raw probabilistic maps remain explicit provider queries.",
    cached: false,
    fetchedAt: accessedAt,
  };
}

interface CellxgeneDataset {
  dataset_id?: string;
  title?: string;
  cell_count?: number;
  tissue?: Array<{ label?: string }>;
  cell_type?: Array<{ label?: string }>;
}

interface CellxgeneCollection {
  collection_version_id?: string;
  datasets?: CellxgeneDataset[];
}

function matchesCellxgeneDataset(
  dataset: CellxgeneDataset,
  structureName: string | null,
): boolean {
  if (!structureName) {
    return false;
  }

  const haystack = [
    dataset.title,
    ...(dataset.tissue ?? []).map(
      (tissue) => tissue.label,
    ),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();

  const candidates = structureName
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter((token) => token.length >= 4);

  return candidates.some(
    (token) => haystack.includes(token),
  );
}

async function queryCellular(
  dataset: BrainDataset,
  query: BrainScientificQuery,
): Promise<BrainScientificObservation> {
  const payload = await fetchJson<CellxgeneCollection>(
    CELLXGENE_HBCA_URL,
  );

  const accessedAt = new Date().toISOString();
  const provenance = createProvenance(
    {
      ...dataset,
      version:
        payload.collection_version_id ??
        dataset.version,
    },
    accessedAt,
  );

  // Collection metadata may be shown, but no Luna structure is matched to a
  // cellular dataset by name. A future sample-scoped relation must be explicit.
  const matchedDatasets: CellxgeneDataset[] = [];

  const findings = matchedDatasets.map(
    (entry, index): BrainScientificFinding => ({
      id:
        entry.dataset_id ??
        `cellxgene-match-${index}`,
      label: entry.title ?? "CELLxGENE dataset",
      value: String(entry.cell_count ?? "Metadata available"),
      unit:
        typeof entry.cell_count === "number"
          ? "nuclei"
          : null,
      kind: "cellular-metadata",
      provenance,
    }),
  );

  return {
    scale: query.scale,
    status: "partial",
    dataset,
    registration: BRAIN_LUNA_REFERENCE_REGISTRATION,
    hraSpatialRegistration:
      HRA_V11_ALLEN_BRAIN_SPATIAL_REGISTRATION,
    structureMapping: createStructureMapping(
      query,
      dataset,
    ),
    referenceSpace: getReferenceSpace(dataset),
    coordinateTransform: null,
    ...createSpatialTargetState({
      scale: query.scale,
      dataset,
      provenance,
      referenceSpace: getReferenceSpace(dataset),
      structureMapping: createStructureMapping(query, dataset),
      coordinateTransform: null,
    }),
    findings,
    message: "CELLxGENE collection metadata is available as sample-scoped context. No Luna structure-to-dataset relation is inferred from titles, tissue labels, or display names.",
    cached: false,
    fetchedAt: accessedAt,
  };
}

interface AllenStructureResponse {
  msg?: Array<{
    id?: number;
    name?: string;
    acronym?: string;
  }>;
}

async function queryMolecular(
  dataset: BrainDataset,
  query: BrainScientificQuery,
): Promise<BrainScientificObservation> {
  // Allen sample/structure lookups require an explicit provider structure or
  // sample identifier. Luna display names are not submitted as provider queries.
  const accessedAt = new Date().toISOString();
  const provenance = createProvenance(dataset, accessedAt);
  const matches: NonNullable<AllenStructureResponse["msg"]> = [];

  const findings = matches.map(
    (entry): BrainScientificFinding => ({
      id: `allen-structure-${entry.id ?? entry.name ?? "unknown"}`,
      label: entry.name ?? "Allen structure",
      value: entry.acronym ?? String(entry.id ?? "Provider match"),
      unit: null,
      kind: "molecular-metadata",
      provenance,
    }),
  );

  return {
    scale: query.scale,
    status: "partial",
    dataset,
    registration: BRAIN_LUNA_REFERENCE_REGISTRATION,
    hraSpatialRegistration:
      HRA_V11_ALLEN_BRAIN_SPATIAL_REGISTRATION,
    structureMapping: {
      canonicalStructureId:
        query.structureId ??
        "unselected",
      provider: dataset.provider,
      externalId:
        matches.length === 1 && matches[0].id
          ? String(matches[0].id)
          : null,
      externalName:
        matches.length === 1
          ? matches[0].name ?? null
          : null,
      status:
        matches.length === 1
          ? "broad"
          : "query-required",
      note: "No Allen provider structure is assigned from a Luna name. Molecular evidence requires an explicit Allen sample or provider structure identifier with donor/sample provenance.",
    },
    referenceSpace: getReferenceSpace(dataset),
    coordinateTransform: null,
    ...createSpatialTargetState({
      scale: query.scale,
      dataset,
      provenance,
      referenceSpace: getReferenceSpace(dataset),
      structureMapping: {
        canonicalStructureId:
          query.structureId ?? "unselected",
        provider: dataset.provider,
        externalId:
          matches.length === 1 && matches[0].id
            ? String(matches[0].id)
            : null,
        externalName:
          matches.length === 1
            ? matches[0].name ?? null
            : null,
        status:
          matches.length === 1
            ? "broad"
            : "query-required",
        note:
          matches.length === 1
            ? "A provider structure-name match was returned. This is not a coordinate transform and no expression value has been inferred."
            : "No unique provider structure assignment was made. Luna requires a more specific provider query before showing molecular measurements.",
      },
      coordinateTransform: null,
    }),
    findings,
    message: "Allen Human Brain Atlas is exposed only as sample-scoped molecular context. No Luna structure-to-Allen assignment is inferred from a display name.",
    cached: false,
    fetchedAt: accessedAt,
  };
}

function getPrimaryDataset(
  scale: BrainScientificObservation["scale"],
): BrainDataset | null {
  const ids: Record<
    BrainScientificObservation["scale"],
    string
  > = {
    macro: "luna-macro-anatomy-model",
    tissue: "julich-brain-cytoarchitecture",
    cellular: "cellxgene-human-brain-cell-atlas-v1",
    subcellular: "human-cortical-em-fragment",
    molecular: "allen-human-brain-atlas-microarray",
  };

  return getDataset(ids[scale]);
}

function createErrorObservation(
  dataset: BrainDataset,
  query: BrainScientificQuery,
  error: unknown,
): BrainScientificObservation {
  const message =
    error instanceof Error
      ? error.message
      : "Provider request failed";

  return {
    ...createUnavailableObservation(
      dataset,
      query,
    ),
    status: "offline",
    message:
      `Scientific provider temporarily unavailable: ${message}. Macro and local workspace features remain available.`,
  };
}

export async function queryBrainScientificObservation(
  query: BrainScientificQuery,
): Promise<BrainScientificObservation> {
  const dataset = getPrimaryDataset(query.scale);

  if (!dataset) {
    throw new Error(
      `No registered dataset for ${query.scale}`,
    );
  }

  const key = [
    query.scale,
    query.structureId ?? "",
    query.structureName ?? "",
  ].join(":");

  const cached = queryCache.get(key);

  if (
    cached &&
    cached.expiresAt > Date.now() &&
    !query.refresh
  ) {
    return {
      ...cached.value,
      cached: true,
    };
  }

  if (
    dataset.status === "unavailable" ||
    dataset.status === "unsupported" ||
    dataset.status === "requires-authentication"
  ) {
    return createUnavailableObservation(
      dataset,
      query,
    );
  }

  try {
    let observation: BrainScientificObservation;

    switch (query.scale) {
      case "macro":
        observation = {
          scale: query.scale,
          status: "available",
          dataset,
          registration: BRAIN_LUNA_REFERENCE_REGISTRATION,
          hraSpatialRegistration:
            HRA_V11_ALLEN_BRAIN_SPATIAL_REGISTRATION,
          structureMapping: createStructureMapping(
            query,
            dataset,
          ),
          referenceSpace: getReferenceSpace(dataset),
          coordinateTransform: null,
          ...createSpatialTargetState({
            scale: query.scale,
            dataset,
            provenance: createProvenance(
              dataset,
              new Date().toISOString(),
            ),
            referenceSpace: getReferenceSpace(dataset),
            structureMapping: createStructureMapping(query, dataset),
            coordinateTransform: null,
          }),
          findings: [],
          message:
            "The local Luna Macro model remains available independently of external scientific providers.",
          cached: false,
          fetchedAt: new Date().toISOString(),
        };
        break;
      case "tissue":
        observation = await queryTissue(
          dataset,
          query,
        );
        break;
      case "cellular":
        observation = await queryCellular(
          dataset,
          query,
        );
        break;
      case "molecular":
        observation = await queryMolecular(
          dataset,
          query,
        );
        break;
      case "subcellular":
        observation = createUnavailableObservation(
          dataset,
          query,
        );
        break;
    }

    queryCache.set(key, {
      value: observation,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return observation;
  } catch (error) {
    return createErrorObservation(
      dataset,
      query,
      error,
    );
  }
}

export function clearBrainScientificCache(): void {
  queryCache.clear();
}
