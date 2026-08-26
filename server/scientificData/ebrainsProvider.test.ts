import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearEbrainsProviderCache,
  getEbrainsAtlasSummary,
  getEbrainsDatasets,
  getEbrainsProviderRecord,
  getEbrainsReferenceSpaces,
  getEbrainsUnavailableRegionsOrFeatures,
} from "./ebrainsProvider";

describe("EBRAINS read-only provider adapter", () => {
  afterEach(() => {
    clearEbrainsProviderCache();
    vi.unstubAllGlobals();
  });

  it("exposes normalized provider and dataset metadata without browser assets", () => {
    expect(getEbrainsProviderRecord().providerId).toBe("ebrains");
    expect(getEbrainsDatasets().map((dataset) => dataset.id)).toEqual(expect.arrayContaining([
      "ebrains-multilevel-human-atlas", "julich-brain-cytoarchitecture", "bigbrain-microscopic-reference",
    ]));
  });

  it("normalizes atlas metadata and reuses the five-minute provider cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      "@id": "juelich/iav/atlas/v1.0.0/1", name: "Multilevel Human Atlas",
      spaces: [{ "@id": "mni-2009c" }], parcellations: [{ "@id": "a" }, { "@id": "b" }],
    }) });
    vi.stubGlobal("fetch", fetchMock);
    const first = await getEbrainsAtlasSummary();
    const second = await getEbrainsAtlasSummary();
    expect(first.availability).toBe("available");
    expect(first.parcellationReferenceCount).toBe(2);
    expect(second.providerAtlasId).toBe("juelich/iav/atlas/v1.0.0/1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("contains provider failure and preserves scientific unavailability", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const atlas = await getEbrainsAtlasSummary();
    expect(atlas.availability).toBe("offline");
    expect(atlas.limitations[0]).toContain("temporarily unavailable");
  });

  it("returns curated reference spaces and refuses name-derived regions or features", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) }));
    expect((await getEbrainsReferenceSpaces()).map((space) => space.id)).toEqual(expect.arrayContaining([
      "ebrains-mni-icbm-152-2009c", "ebrains-bigbrain",
    ]));
    const unavailable = getEbrainsUnavailableRegionsOrFeatures();
    expect(unavailable.registrationStatus).toBe("not-established");
    expect(unavailable.reason).toContain("is inferred from a Luna mesh name");
  });
});
