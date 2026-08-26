import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CANONICAL_SCIENTIFIC_REFERENCE_SPACE_ID,
  getScientificSpatialBackbone,
  queryScientificCoordinate,
} from "./scientificSpatialService";
import {
  clearEbrainsProviderCache,
} from "./ebrainsProvider";

describe("scientific spatial backbone", () => {
  afterEach(() => {
    clearEbrainsProviderCache();
    vi.unstubAllGlobals();
  });

  it("declares EBRAINS/siibra MNI 2009c asymmetric independently of the Luna presentation GLB", () => {
    const backbone = getScientificSpatialBackbone();
    expect(backbone.visualModel.role).toBe("PRESENTATION_MODEL");
    expect(backbone.visualModel.lunaToMni).toBe("NOT_ESTABLISHED");
    expect(backbone.scientificProvider.id).toBe("ebrains-siibra");
    expect(backbone.canonicalReference.id).toBe(CANONICAL_SCIENTIFIC_REFERENCE_SPACE_ID);
    expect(backbone.canonicalReference.version).toBe("MNI 152 ICBM 2009c Nonlinear Asymmetric");
    expect(backbone.canonicalReference.providerReferenceSpaceId).toBe("minds/core/referencespace/v1.0.0/dafcffc5-4826-4bf1-8ff6-46b8a31ff8e2");
    expect(backbone.canonicalReference.units).toBe("millimetres");
    expect(backbone.canonicalReference.providerNativeUnits).toBe("micrometres");
    expect(backbone.canonicalReference.axisOrientation).toBeNull();
    expect(backbone.canonicalReference.handedness).toBeNull();
    expect(backbone.canonicalReference.origin).toBeNull();
    expect(backbone.julichCorticalOverlay.surfaceDelivery.status).toBe("ASSET_DELIVERY_UNRESOLVED");
    expect(backbone.julichCorticalOverlay.surfaceDelivery.assetUrl).toBeNull();
    expect(backbone.julichCorticalOverlay.licensing.licenseStatus).toBe("LICENSE_REVIEW_REQUIRED");
    expect(backbone.scientificBrainArchitecture.visualBrain.lunaToMni).toBe("NOT_ESTABLISHED");
    expect(backbone.scientificBrainArchitecture.mniTemplateSurface.referenceSpaceId).toBe(CANONICAL_SCIENTIFIC_REFERENCE_SPACE_ID);
    expect(backbone.scientificBrainArchitecture.mniTemplateSurface.rendering.defaultVisible).toBe(false);
    expect(backbone.scientificBrainArchitecture.mniTemplateSurface.fragments).toHaveLength(2);
    expect(backbone.scientificBrainArchitecture.crosswalks.find((entry) => entry.id === "hra-to-julich-v3-1")?.status).toBe("UNMAPPED");
  });

  it("rejects non-canonical spaces, non-millimetre units, and non-finite coordinates before provider access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(queryScientificCoordinate({
      referenceSpaceId: "hra-brain-female-v1-1",
      units: "millimetres",
      x: 1,
      y: 2,
      z: 3,
    })).rejects.toThrow("Only the registered MNI ICBM 152 2009c Nonlinear Asymmetric");

    await expect(queryScientificCoordinate({
      referenceSpaceId: CANONICAL_SCIENTIFIC_REFERENCE_SPACE_ID,
      units: "micrometres",
      x: 1,
      y: 2,
      z: 3,
    })).rejects.toThrow("units=millimetres");

    await expect(queryScientificCoordinate({
      referenceSpaceId: CANONICAL_SCIENTIFIC_REFERENCE_SPACE_ID,
      units: "millimetres",
      x: Number.NaN,
      y: 2,
      z: 3,
    })).rejects.toThrow("finite X, Y, and Z");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a declared MNI scientific coordinate with Julich provider context but never a Luna target", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string | URL) => Promise.resolve({
      ok: true,
      json: async () => String(url).includes("hbp-spatial-backend")
        ? { target_point: [1.2, -3.4, 5.6] }
        : { data: [["region", 0.8]] },
    })));

    const result = await queryScientificCoordinate({
      referenceSpaceId: CANONICAL_SCIENTIFIC_REFERENCE_SPACE_ID,
      units: "millimetres",
      x: 12,
      y: -18,
      z: 24,
    });

    expect(result.coordinate).toMatchObject({
      x: 12,
      y: -18,
      z: 24,
      units: "millimetres",
      referenceSpaceId: CANONICAL_SCIENTIFIC_REFERENCE_SPACE_ID,
      source: "user-entered",
    });
    expect(result.scientificTarget).toMatchObject({
      targetKind: "scientific-coordinate-target",
      status: "available",
      referenceSpaceId: CANONICAL_SCIENTIFIC_REFERENCE_SPACE_ID,
      coordinate: { x: 12, y: -18, z: 24, units: "millimetres" },
    });
    expect(result.scientificTarget.limitation).toContain("enabled lower-scale nanobot mission target");
    expect(result.julich.status).toBe("available");
    expect(result.julich.assignment).toEqual({ data: [["region", 0.8]] });
    expect(result.bigBrain.status).toBe("available");
    expect(result.bigBrain.coordinate).toMatchObject({
      x: 1.2,
      y: -3.4,
      z: 5.6,
      referenceSpaceId: "ebrains-bigbrain",
      source: "provider-returned",
    });
    expect(result.bigBrain.observation?.scientificTarget?.targetKind).toBe("scientific-coordinate-target");
    expect(result.bigBrain.observation?.scientificTarget?.limitation).toContain("does not imply");
    expect(result.molecular.status).toBe("sample-scoped");
    expect(result.cellular.status).toBe("sample-scoped");
    expect(result.connectivity.status).toBe("provider-context");
    expect(result.limitations.join(" ")).toContain("not a Luna visual-mesh target");
    expect(result.limitations.join(" ")).toContain("No Luna-to-MNI");
  });

  it("contains provider failure as an unavailable Julich result without fabricating region, transform, or target", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: true, message: "provider unavailable" }),
    }));

    const result = await queryScientificCoordinate({
      referenceSpaceId: CANONICAL_SCIENTIFIC_REFERENCE_SPACE_ID,
      units: "millimetres",
      x: 1,
      y: 2,
      z: 3,
    });

    expect(result.julich.status).toBe("unavailable");
    expect(result.julich.assignment).toBeNull();
    expect(result.julich.reason).toContain("No region, probability, transform, or Luna target was inferred");
    expect(result.bigBrain.status).toBe("unavailable");
    expect(result.bigBrain.coordinate).toBeNull();
  });
});
