import type {
  BrainDataset,
  BrainReferenceSpace,
} from "@shared/brainScience";
import {
  BRAIN_DATASETS,
  BRAIN_LUNA_REFERENCE_REGISTRATION,
  BRAIN_REFERENCE_SPACES,
} from "./registry";

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

export function getEbrainsUnavailableRegionsOrFeatures(): EbrainsUnavailableQuery {
  return {
    availability: "unavailable",
    reason: "No provider-region or feature relation is inferred from a Luna mesh name. A supported explicit siibra query and an evidence-backed canonical mapping are required.",
    registrationStatus: "not-established",
    lunaRegistrationId: BRAIN_LUNA_REFERENCE_REGISTRATION.id,
  };
}

export function clearEbrainsProviderCache(): void { cache.clear(); }
