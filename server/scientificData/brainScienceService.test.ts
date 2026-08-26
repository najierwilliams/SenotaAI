import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDatasetStatusLabel,
  isDatasetUsable,
} from "@shared/brainScience";
import {
  BRAIN_COORDINATE_TRANSFORMS,
  BRAIN_LUNA_REFERENCE_REGISTRATION,
  getDataset,
  getDatasetsForScale,
  getScientificDatasetManifest,
} from "./registry";
import {
  clearBrainScientificCache,
  queryBrainScientificObservation,
} from "./brainScienceService";

function jsonResponse(body: unknown): Response {
  return new Response(
    JSON.stringify(body),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

describe("Luna Brain scientific dataset integration", () => {
  beforeEach(() => {
    clearBrainScientificCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers the required scales without storing enormous external assets in the manifest", () => {
    const manifest = getScientificDatasetManifest();

    expect(getDataset("luna-macro-anatomy-model")?.status).toBe("available");
    expect(getDatasetsForScale("tissue").map(dataset => dataset.id)).toContain("julich-brain-cytoarchitecture");
    expect(getDatasetsForScale("cellular").map(dataset => dataset.id)).toContain("cellxgene-human-brain-cell-atlas-v1");
    expect(getDatasetsForScale("molecular").map(dataset => dataset.id)).toContain("allen-human-brain-atlas-microarray");
    expect(getDatasetsForScale("subcellular")[0]?.status).toBe("unavailable");
    expect(manifest.datasets.every(dataset => dataset.assetUrl === null || dataset.accessType === "local-asset")).toBe(true);
    expect(manifest.lunaReferenceRegistration).toEqual(BRAIN_LUNA_REFERENCE_REGISTRATION);
    expect(manifest.lunaReferenceRegistration.status).toBe("unavailable");
    expect(manifest.lunaReferenceRegistration.transformArtifact).toBeNull();
    expect(manifest.hraSpatialRegistration.status).toBe("established");
    expect(manifest.hraSpatialRegistration.asset.sha256).toBe(
      "c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc",
    );
    expect(manifest.hraSpatialRegistration.transforms).toHaveLength(2);
    expect(manifest.hraSpatialRegistration.mni.status).toBe("not-established");
  });

  it("keeps reference-space transforms explicit and never treats Luna local coordinates as MNI", () => {
    const localToMni = BRAIN_COORDINATE_TRANSFORMS.find(transform => transform.id === "luna-to-ebrains-mni");

    expect(localToMni?.status).toBe("unavailable");
    expect(localToMni?.method).toBeNull();
  });

  it("defines clear status labels and only treats available or partial data as usable", () => {
    expect(getDatasetStatusLabel("requires-authentication")).toBe("Authentication required");
    expect(isDatasetUsable("available")).toBe(true);
    expect(isDatasetUsable("partial")).toBe(true);
    expect(isDatasetUsable("offline")).toBe(false);
    expect(isDatasetUsable("unavailable")).toBe(false);
  });

  it("returns a stable local Macro observation even when all external services would fail", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network unavailable"));
    vi.stubGlobal("fetch", fetchMock);

    const observation = await queryBrainScientificObservation({
      scale: "macro",
      structureId: "allen_hippocampus_l",
      structureName: "Hippocampus",
    });

    expect(observation.status).toBe("available");
    expect(observation.dataset?.id).toBe("luna-macro-anatomy-model");
    expect(observation.registration).toEqual(BRAIN_LUNA_REFERENCE_REGISTRATION);
    expect(observation.registration.sourceAsset.sourceVersion).toBe("HRA Brain-female v1.1");
    expect(observation.hraSpatialRegistration.status).toBe("established");
    expect(observation.hraSpatialRegistration.transforms[0].targetSpaceId).toBe(
      "hra-brain-female-v1-1",
    );
    expect(observation.hraSpatialRegistration.mni.status).toBe("not-established");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("caches a successful tissue provider lookup and returns bounded atlas findings", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        name: "Multilevel Human Atlas",
        parcellations: [{ "@id": "one" }, { "@id": "two" }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const query = {
      scale: "tissue" as const,
      structureId: "allen_superior_frontal_gyrus_l",
      structureName: "Superior Frontal Gyrus",
    };

    const first = await queryBrainScientificObservation(query);
    const second = await queryBrainScientificObservation(query);

    expect(first.status).toBe("partial");
    expect(first.findings).toHaveLength(4);
    expect(first.findings.some((finding) => finding.id === "bigbrain-reference-context")).toBe(true);
    expect(first.findings.some((finding) => finding.id === "julich-v3-1-mni-map-catalog")).toBe(true);
    expect(first.spatialTarget?.coordinate).toBeNull();
    expect(first.spatialTarget?.coordinateType).toBe("region");
    expect(first.registration.status).toBe("unavailable");
    expect(first.registration.validation.status).toBe("unavailable");
    expect(first.coordinateTransform?.id).toBe("ebrains-mni-to-luna");
    expect(first.coordinateTransform?.status).toBe("unavailable");
    expect(first.spatialCapability.operationEnabled).toBe(false);
    expect(first.spatialCapability.reason).toContain("no validated reference-space registration into Luna Local");
    expect(first.hraSpatialRegistration.status).toBe("established");
    expect(first.hraSpatialRegistration.mni.status).toBe("not-established");
    expect(second.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("contains provider failure instead of crashing the scientific observation flow", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("provider timeout")));

    const observation = await queryBrainScientificObservation({
      scale: "cellular",
      structureId: "allen_hippocampus_l",
      structureName: "Hippocampus",
    });

    expect(observation.status).toBe("offline");
    expect(observation.message).toContain("Macro and local workspace features remain available");
    expect(observation.registration.status).toBe("unavailable");
    expect(observation.findings).toEqual([]);
  });

  it("leaves the unsupported human cortical EM fragment unavailable without requesting source data", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const observation = await queryBrainScientificObservation({
      scale: "subcellular",
      structureId: "allen_hippocampus_l",
      structureName: "Hippocampus",
    });

    expect(observation.status).toBe("unavailable");
    expect(observation.dataset?.id).toBe("human-cortical-em-fragment");
    expect(observation.message).toContain("single surgical cortical sample");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
