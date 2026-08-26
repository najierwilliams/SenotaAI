import { describe, expect, it } from "vitest";
import type { JulichScientificRegion } from "@shared/brainScience";
import {
  createJulichCorticalOverlayState,
  isJulichCorticalOverlayRenderable,
  selectJulichScientificRegion,
  setJulichCorticalOverlayOpacity,
  setJulichCorticalOverlayVisibility,
} from "@shared/julichCorticalOverlay";
import {
  JULICH_CORTICAL_OVERLAY,
  getJulichCorticalOverlay,
} from "./julichCorticalOverlayService";
import { getScientificSpatialBackbone } from "./scientificSpatialService";

function providerRegion(): JulichScientificRegion {
  return {
    id: "julich-region:provider-only:example",
    label: "Provider-defined example region",
    providerRegionId: "provider-only:example",
    providerParcellationId: JULICH_CORTICAL_OVERLAY.providerParcellationId,
    datasetVersion: "Julich-Brain v3.1",
    referenceSpaceId: "ebrains-mni-icbm-152-2009c",
    sourceMapId: JULICH_CORTICAL_OVERLAY.mapIds.labelled,
    source: "provider-region",
    scientificTarget: {
      id: "julich-region-target:provider-only:example",
      targetKind: "region-probabilistic-target",
      structureUberonId: null,
      structureFmaId: null,
      provider: "julich-brain",
      datasetId: "julich-brain-cytoarchitecture",
      datasetVersion: "Julich-Brain v3.1",
      referenceSpaceId: "ebrains-mni-icbm-152-2009c",
      coordinate: null,
      coordinateUnits: null,
      registrationMethod: "Provider-defined Julich region; no Luna/HRA relation.",
      registrationErrorMillimetres: null,
      uncertaintySigmaMillimetres: null,
      evidenceTier: "region-probabilistic",
      provenanceId: "julich-brain-v3-1-mni-2009c",
      licenseId: "julich-brain-v3-1",
      status: "available",
      limitation: "Region-probabilistic context only; no Luna mesh mapping or mission target.",
    },
    limitation: "Provider region only; no Luna/HRA mapping.",
  };
}

describe("guarded Julich/siibra cortical overlay", () => {
  it("pins the exact v3.1, MNI 2009c asymmetric, and map identifiers", () => {
    const overlay = getJulichCorticalOverlay();
    expect(overlay.datasetVersion).toContain("v3.1");
    expect(overlay.persistentId).toBe("doi:10.25493/KNSN-XB4");
    expect(overlay.providerParcellationId).toBe("minds/core/parcellationatlas/v1.0.0/94c1125b-b87e-45e4-901c-00daee7f2579-310");
    expect(overlay.providerParcellationId).not.toContain("-290");
    expect(overlay.referenceSpaceId).toBe("ebrains-mni-icbm-152-2009c");
    expect(overlay.providerReferenceSpaceId).toBe("minds/core/referencespace/v1.0.0/dafcffc5-4826-4bf1-8ff6-46b8a31ff8e2");
    expect(overlay.mapIds).toEqual({
      labelled: "siibra-map-v0.0.1_mni152-jba31-labelled",
      continuousDefaultGranularity: "siibra-map-v0.0.1_mni152-jba31_207-continuous",
      continuousHighGranularity: "siibra-map-v0.0.1_mni152-jba31_227-continuous",
    });
  });

  it("rejects the published fsaverage labels and MNI NIfTI volumes as an exact cortical surface", () => {
    const overlay = getJulichCorticalOverlay();
    expect(overlay.surfaceDelivery.status).toBe("ASSET_DELIVERY_UNRESOLVED");
    expect(overlay.surfaceDelivery.deliveryMode).toBe("none");
    expect(overlay.surfaceDelivery.assetUrl).toBeNull();
    expect(overlay.surfaceDelivery.surfaceId).toBeNull();
    expect(overlay.surfaceDelivery.inspectedProviderAssets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: "fsaverage_surface/lh.JulichBrainAtlas_3.1.label.gii",
        bytes: 69913,
        eligibility: "REJECTED_WRONG_REFERENCE_SPACE",
      }),
      expect.objectContaining({
        path: "maximum-probability-maps_MPMs_207-areas/JulichBrainAtlas_3.1_207areas_MPM_lh_MNI152.nii.gz",
        bytes: 151961,
        eligibility: "REJECTED_NOT_SURFACE_GEOMETRY",
      }),
    ]));
    expect(overlay.surfaceDelivery.inspectedProviderAssets.every((asset) => asset.eligibility !== "ELIGIBLE")).toBe(true);
  });

  it("keeps rendering and license gates disabled until a provider stream and use review are both documented", () => {
    const overlay = getJulichCorticalOverlay();
    expect(overlay.licensing).toMatchObject({
      license: "CC BY-NC-SA 4.0",
      licenseStatus: "LICENSE_REVIEW_REQUIRED",
      redistribution: "not-redistributed",
    });
    expect(overlay.rendering).toMatchObject({
      defaultVisible: false,
      visibilityControl: "DISABLED_ASSET_UNRESOLVED",
      opacityControl: "DISABLED_ASSET_UNRESOLVED",
      hoverCapability: "UNAVAILABLE_NO_STABLE_PROVIDER_GEOMETRY",
      selectionCapability: "UNAVAILABLE_NO_STABLE_PROVIDER_GEOMETRY",
    });
    expect(isJulichCorticalOverlayRenderable(overlay)).toBe(false);
  });

  it("cannot force blocked controls on or alter their stored opacity", () => {
    const overlay = getJulichCorticalOverlay();
    const initial = createJulichCorticalOverlayState(overlay);
    expect(initial).toEqual({ visible: false, opacity: 0.72, selectedRegion: null });
    expect(setJulichCorticalOverlayVisibility(overlay, initial, true).visible).toBe(false);
    expect(setJulichCorticalOverlayOpacity(overlay, initial, 0.1)).toEqual(initial);
  });

  it("keeps a provider-defined region separate from HRA selection and unavailable without stable overlay geometry", () => {
    const overlay = getJulichCorticalOverlay();
    const region = providerRegion();
    expect(region.scientificTarget.targetKind).toBe("region-probabilistic-target");
    expect(region.scientificTarget.coordinate).toBeNull();
    expect(region.scientificTarget.structureUberonId).toBeNull();
    expect(selectJulichScientificRegion(overlay, createJulichCorticalOverlayState(overlay), region).selectedRegion).toBeNull();
  });

  it("exposes the same non-rendering declaration through the scientific spatial backbone", () => {
    const backbone = getScientificSpatialBackbone();
    expect(backbone.visualModel.lunaToMni).toBe("NOT_ESTABLISHED");
    expect(backbone.julichCorticalOverlay).toBe(JULICH_CORTICAL_OVERLAY);
    expect(backbone.limitations.join(" ")).toContain("intentionally non-rendering");
  });
});
