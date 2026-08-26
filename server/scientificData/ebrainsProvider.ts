import type {
  BrainCoordinate,
  BrainDataset,
  BrainReferenceSpace,
} from "@shared/brainScience";
import {
  BRAIN_DATASETS,
  BRAIN_LUNA_REFERENCE_REGISTRATION,
  BRAIN_REFERENCE_SPACES,
} from "./registry";
import {
  getSelectedScientificReference,
  JULICH_BRAIN_PROVIDER_PARCELLATION_ID,
  JULICH_MNI_2009C_PROVIDER_SPACE_ID,
} from "./scientificReferenceRegistry";

const SIIBRA_BASE_URL = "https://siibra-api-stable.apps.hbp.eu/v3_0";
const HUMAN_ATLAS_PATH = "/atlases/juelich/iav/atlas/v1.0.0/1";
const TTL_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 8_000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

export interface EbrainsProviderRecord {
  providerId: "ebrains";
  name: string;
  providerVersion: "siibra API v3.0";
  sourceUrl: string;
  format: "JSON over HTTPS";
  availability: "available" | "offline";
  capabilities: string[];
  limitations: string[];
  retrievedAt: string | null;
}

export interface EbrainsAtlasSummary {
  datasetId: string;
  datasetName: string;
  datasetVersion: string | null;
  providerId: "ebrains";
  sourceUrl: string;
  format: "JSON";
  license: string | null;
  requiredAttribution: string | null;
  referenceSpaceIds: string[];
  providerAtlasId: string;
  providerAtlasName: string | null;
  parcellationReferenceCount: number;
  availability: "available" | "offline";
  limitations: string[];
  retrievedAt: string | null;
}

export interface EbrainsJulichMapCatalog {
  availability: "available" | "offline";
  providerId: "ebrains";
  providerParcellationId: string;
  referenceSpaceId: "ebrains-mni-icbm-152-2009c";
  providerReferenceSpaceId: string;
  datasetVersion: "Julich-Brain v3.1";
  sourceUrl: string;
  license: "CC BY-NC-SA 4.0";
  maps: Array<{ id: string; name: string; mapType: "LABELLED" | "STATISTICAL" }>;
  limitations: string[];
  retrievedAt: string | null;
}

export interface EbrainsUnavailableQuery {
  availability: "unavailable";
  reason: string;
  registrationStatus: "not-established";
  lunaRegistrationId: string;
}

async function fetchJson<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${SIIBRA_BASE_URL}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`siibra returned HTTP ${response.status}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timer);
  }
}

async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && entry.expiresAt > Date.now()) return entry.value;
  const value = await loader();
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
  return value;
}

function ebrainsDatasets(): BrainDataset[] {
  return BRAIN_DATASETS.filter((dataset) =>
    dataset.provider === "ebrains" || dataset.provider === "julich-brain" || dataset.provider === "bigbrain",
  );
}

export function getEbrainsProviderRecord(): EbrainsProviderRecord {
  return {
    providerId: "ebrains",
    name: "EBRAINS / siibra",
    providerVersion: "siibra API v3.0",
    sourceUrl: SIIBRA_BASE_URL,
    format: "JSON over HTTPS",
    availability: "available",
    capabilities: ["atlas metadata", "reference-space metadata", "Julich-Brain catalog context", "BigBrain catalog context"],
    limitations: [
      "Luna does not redistribute EBRAINS datasets or visual assets.",
      "Provider coordinates are never projected into Luna because Luna-to-provider registration is not established.",
      "Region and feature results require an explicitly supported provider query; this adapter does not infer them from Luna names.",
    ],
    retrievedAt: null,
  };
}

export async function getEbrainsAtlasSummary(): Promise<EbrainsAtlasSummary> {
  const dataset = BRAIN_DATASETS.find((item) => item.id === "ebrains-multilevel-human-atlas")!;
  try {
    const atlas = await cached("ebrains:human-atlas", () => fetchJson<{
      "@id"?: string;
      name?: string;
      spaces?: Array<{ "@id"?: string }>;
      parcellations?: Array<{ "@id"?: string }>;
    }>(HUMAN_ATLAS_PATH));
    return {
      datasetId: dataset.id,
      datasetName: dataset.name,
      datasetVersion: dataset.version,
      providerId: "ebrains",
      sourceUrl: `${SIIBRA_BASE_URL}${HUMAN_ATLAS_PATH}`,
      format: "JSON",
      license: dataset.license,
      requiredAttribution: dataset.citation,
      referenceSpaceIds: atlas.spaces?.map((space) => space["@id"]).filter((id): id is string => Boolean(id)) ?? [],
      providerAtlasId: atlas["@id"] ?? "juelich/iav/atlas/v1.0.0/1",
      providerAtlasName: atlas.name ?? null,
      parcellationReferenceCount: atlas.parcellations?.length ?? 0,
      availability: "available",
      limitations: ["Provider atlas metadata is scientific context, not a Luna mesh mapping or target geometry."],
      retrievedAt: new Date().toISOString(),
    };
  } catch {
    return {
      datasetId: dataset.id, datasetName: dataset.name, datasetVersion: dataset.version,
      providerId: "ebrains", sourceUrl: `${SIIBRA_BASE_URL}${HUMAN_ATLAS_PATH}`, format: "JSON",
      license: dataset.license, requiredAttribution: dataset.citation, referenceSpaceIds: [],
      providerAtlasId: "juelich/iav/atlas/v1.0.0/1", providerAtlasName: null,
      parcellationReferenceCount: 0, availability: "offline",
      limitations: ["Scientific provider temporarily unavailable. Luna visual and Macro simulation remain available."], retrievedAt: null,
    };
  }
}

export async function getEbrainsReferenceSpaces(): Promise<BrainReferenceSpace[]> {
  // Provider metadata is retrieved to validate connectivity; Luna returns only its curated,
  // versioned space records so unnamed provider fields never become scientific conventions.
  await cached("ebrains:spaces", () => fetchJson<unknown>("/spaces")).catch(() => null);
  return BRAIN_REFERENCE_SPACES.filter((space) =>
    space.provider === "ebrains" || space.provider === "bigbrain",
  );
}

export function getEbrainsDatasets(): BrainDataset[] { return ebrainsDatasets(); }

export async function getJulichV31MapCatalog(): Promise<EbrainsJulichMapCatalog> {
  const params = new URLSearchParams({
    parcellation_id: JULICH_BRAIN_PROVIDER_PARCELLATION_ID,
    space_id: JULICH_MNI_2009C_PROVIDER_SPACE_ID,
    size: "100",
  });
  const sourceUrl = `${SIIBRA_BASE_URL}/maps?${params.toString()}`;
  const base = {
    providerId: "ebrains" as const,
    providerParcellationId: JULICH_BRAIN_PROVIDER_PARCELLATION_ID,
    referenceSpaceId: "ebrains-mni-icbm-152-2009c" as const,
    providerReferenceSpaceId: JULICH_MNI_2009C_PROVIDER_SPACE_ID,
    datasetVersion: "Julich-Brain v3.1" as const,
    sourceUrl,
    license: "CC BY-NC-SA 4.0" as const,
    limitations: [
      "Catalog metadata is provider-scoped and does not create a Luna structure-to-Julich mapping.",
      "Luna does not download, bundle, render, or redistribute provider maps.",
      "Provider map availability does not establish Luna-to-MNI coordinate registration or a nanobot target.",
    ],
  };
  try {
    const response = await cached("ebrains:julich-v31-mni-map-catalog", () => fetchJson<{
      items?: Array<{ "@id"?: string; name?: string; maptype?: "LABELLED" | "STATISTICAL" }>;
    }>(`/maps?${params.toString()}`));
    return {
      ...base,
      availability: "available",
      maps: (response.items ?? []).flatMap((map) =>
        map["@id"] && map.name && (map.maptype === "LABELLED" || map.maptype === "STATISTICAL")
          ? [{ id: map["@id"], name: map.name, mapType: map.maptype }]
          : [],
      ),
      retrievedAt: new Date().toISOString(),
    };
  } catch {
    return { ...base, availability: "offline", maps: [], retrievedAt: null };
  }
}

export function getEbrainsSelectedScientificReference() {
  return getSelectedScientificReference();
}

export interface EbrainsCoordinateAssignment {
  availability: "available" | "unavailable";
  referenceSpaceId: "ebrains-mni-icbm-152-2009c";
  providerReferenceSpaceId: string;
  providerParcellationId: string;
  coordinate: BrainCoordinate | null;
  assignment: unknown | null;
  reason: string | null;
  provenanceUrl: string;
}

/**
 * Performs a provider query only for coordinates explicitly declared in the
 * selected MNI ICBM 152 2009c reference. The returned assignment is provider
 * data; it is never converted to a Luna point or inferred from a Luna mesh.
 */
export async function assignJulichAtMni2009cCoordinate(
  coordinate: BrainCoordinate,
): Promise<EbrainsCoordinateAssignment> {
  const base = {
    referenceSpaceId: "ebrains-mni-icbm-152-2009c" as const,
    providerReferenceSpaceId: JULICH_MNI_2009C_PROVIDER_SPACE_ID,
    providerParcellationId: JULICH_BRAIN_PROVIDER_PARCELLATION_ID,
    provenanceUrl: "https://siibra-api-stable.apps.hbp.eu/v3_0/redoc",
  };

  if (
    coordinate.units !== "millimetres" ||
    !Number.isFinite(coordinate.x) ||
    !Number.isFinite(coordinate.y) ||
    !Number.isFinite(coordinate.z)
  ) {
    return {
      ...base,
      availability: "unavailable",
      coordinate: null,
      assignment: null,
      reason: "A Julich assignment requires finite coordinates explicitly expressed in MNI ICBM 152 2009c millimetres.",
    };
  }

  const params = new URLSearchParams({
    parcellation_id: JULICH_BRAIN_PROVIDER_PARCELLATION_ID,
    space_id: JULICH_MNI_2009C_PROVIDER_SPACE_ID,
    point: `${coordinate.x.toFixed(3)},${coordinate.y.toFixed(3)},${coordinate.z.toFixed(3)}`,
    assignment_type: "statistical",
    sigma_mm: "0",
  });

  try {
    const assignment = await fetchJson<{ error?: boolean; message?: string }>(`/map/assign?${params.toString()}`);
    if (assignment && typeof assignment === "object" && assignment.error === true) {
      return {
        ...base,
        availability: "unavailable",
        coordinate: { ...coordinate },
        assignment: null,
        reason: `The public siibra assignment service returned a provider error: ${assignment.message ?? "unknown error"}. No region, probability, transform, or Luna target was inferred.`,
      };
    }
    return { ...base, availability: "available", coordinate: { ...coordinate }, assignment, reason: null };
  } catch {
    return {
      ...base,
      availability: "unavailable",
      coordinate: { ...coordinate },
      assignment: null,
      reason: "The public siibra assignment service did not return a result. No region, probability, transform, or Luna target was inferred.",
    };
  }
}

export function getEbrainsUnavailableRegionsOrFeatures(): EbrainsUnavailableQuery {
  return {
    availability: "unavailable",
    reason: "No provider-region or feature relation is inferred from a Luna mesh name. A supported explicit siibra query and an evidence-backed canonical mapping are required.",
    registrationStatus: "not-established",
    lunaRegistrationId: BRAIN_LUNA_REFERENCE_REGISTRATION.id,
  };
}

export function clearEbrainsProviderCache(): void { cache.clear(); }
