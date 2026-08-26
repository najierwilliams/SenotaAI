import { describe, expect, it } from "vitest";
import {
  ALLEN_ICBM_2009B_CORRESPONDENCE_EVIDENCE,
  HRA_BRAIN_FEMALE_TO_CCF_BODY,
  HRA_LANDMARK_VALIDATION_FRAMEWORK,
  HRA_RAW_GLB_TO_BRAIN_FEMALE,
  HRA_V11_ALLEN_BRAIN_ASSET,
  HRA_V11_ALLEN_BRAIN_SPATIAL_REGISTRATION,
  getHraMniRegistrationStatus,
  getHraSpatialRegistrationForAsset,
  hasCompletedHraLandmarkValidation,
  hraBrainFemaleToHraCcfBody,
  hraBrainFemaleToRawGlb,
  hraCcfBodyToHraBrainFemale,
  isHraCoordinateSpacePair,
  lunaRawGlbCoordinate,
  rawGlbToHraBrainFemale,
  viewerPresentationCoordinate,
} from "@shared/hraSpatial";

function expectPointClose(
  actual: { x: number; y: number; z: number },
  expected: { x: number; y: number; z: number },
): void {
  expect(actual.x).toBeCloseTo(expected.x, 10);
  expect(actual.y).toBeCloseTo(expected.y, 10);
  expect(actual.z).toBeCloseTo(expected.z, 10);
}

describe("HRA v1.1 Allen_F_Brain spatial registration", () => {
  it("pins the exact byte-verified HRA v1.1 source asset and provenance", () => {
    expect(HRA_V11_ALLEN_BRAIN_SPATIAL_REGISTRATION.status).toBe("established");
    expect(HRA_V11_ALLEN_BRAIN_SPATIAL_REGISTRATION.asset).toEqual(
      HRA_V11_ALLEN_BRAIN_ASSET,
    );
    expect(HRA_V11_ALLEN_BRAIN_ASSET.path).toBe(
      "/models/luna/brain/source/3d-vh-f-allen-brain.glb",
    );
    expect(HRA_V11_ALLEN_BRAIN_ASSET.sha256).toBe(
      "c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc",
    );
    expect(HRA_V11_ALLEN_BRAIN_ASSET.version).toBe("v1.1");
    expect(HRA_V11_ALLEN_BRAIN_ASSET.persistentIdentifier).toContain(
      "/brain-female/v1.1",
    );
  });

  it("records the exact published raw GLB to HRA Brain-Female placement", () => {
    expect(HRA_RAW_GLB_TO_BRAIN_FEMALE.sourceSpaceId).toBe(
      "luna-raw-hra-v11-allen-brain-glb",
    );
    expect(HRA_RAW_GLB_TO_BRAIN_FEMALE.targetSpaceId).toBe(
      "hra-brain-female-v1-1",
    );
    expect(HRA_RAW_GLB_TO_BRAIN_FEMALE.scale).toEqual([1, 1, 1]);
    expect(HRA_RAW_GLB_TO_BRAIN_FEMALE.rotationDegrees).toEqual([-90, 0, 0]);
    expect(HRA_RAW_GLB_TO_BRAIN_FEMALE.translationMillimetres).toEqual([
      74.68038,
      -711.022258,
      148.092479,
    ]);
    expect(HRA_RAW_GLB_TO_BRAIN_FEMALE.units).toBe("millimetres");
    expect(HRA_RAW_GLB_TO_BRAIN_FEMALE.validationStatus).toBe("metadata-only");
  });

  it("applies the published raw GLB to HRA Brain-Female transform in millimetres", () => {
    const target = rawGlbToHraBrainFemale(
      lunaRawGlbCoordinate(1, 2, 3),
    );

    expect(target.units).toBe("millimetres");
    expectPointClose(target, {
      x: 75.68038,
      y: -708.022258,
      z: 146.092479,
    });
  });

  it("recovers a raw GLB point through the mathematically derived inverse", () => {
    const raw = lunaRawGlbCoordinate(-12.5, 31.25, 4.75);
    const recovered = hraBrainFemaleToRawGlb(
      rawGlbToHraBrainFemale(raw),
    );

    expect(recovered.units).toBe("millimetres");
    expectPointClose(recovered, raw);
  });

  it("records the published HRA Brain-Female to HRA CCF body placement and inverse", () => {
    expect(HRA_BRAIN_FEMALE_TO_CCF_BODY.sourceSpaceId).toBe(
      "hra-brain-female-v1-1",
    );
    expect(HRA_BRAIN_FEMALE_TO_CCF_BODY.targetSpaceId).toBe(
      "hra-ccf-body-v1-2",
    );
    expect(HRA_BRAIN_FEMALE_TO_CCF_BODY.translationMillimetres).toEqual([
      -74.68038,
      711.022258,
      -148.092479,
    ]);

    const brainFemale = rawGlbToHraBrainFemale(
      lunaRawGlbCoordinate(5, 6, 7),
    );
    const recovered = hraCcfBodyToHraBrainFemale(
      hraBrainFemaleToHraCcfBody(brainFemale),
    );
    expectPointClose(recovered, brainFemale);
  });

  it("keeps viewer presentation coordinates outside the scientific HRA transform pairs", () => {
    const viewer = viewerPresentationCoordinate(0.1, -0.2, 0.3);
    expect(viewer.coordinateSpace).toBe("luna-viewer-presentation");
    expect(
      isHraCoordinateSpacePair(
        "luna-viewer-presentation",
        "hra-brain-female-v1-1",
      ),
    ).toBe(false);
  });

  it("requires the exact checksum before treating the HRA placement as established", () => {
    const verified = getHraSpatialRegistrationForAsset({
      path: HRA_V11_ALLEN_BRAIN_ASSET.path,
      sha256: HRA_V11_ALLEN_BRAIN_ASSET.sha256,
    });
    expect(verified.checksumVerified).toBe(true);
    expect(verified.status).toBe("established");
    expect(verified.registration.status).toBe("established");

    const mismatch = getHraSpatialRegistrationForAsset({
      path: HRA_V11_ALLEN_BRAIN_ASSET.path,
      sha256: "different-asset-checksum",
    });
    expect(mismatch.checksumVerified).toBe(false);
    expect(mismatch.status).toBe("requires-revalidation");
    expect(mismatch.registration.status).toBe("requires-revalidation");
  });

  it("retains an unpopulated landmark-validation framework rather than inventing coordinates", () => {
    expect(HRA_LANDMARK_VALIDATION_FRAMEWORK.validationStatus).toBe(
      "metadata-only",
    );
    expect(HRA_LANDMARK_VALIDATION_FRAMEWORK.records).toEqual([]);
    expect(hasCompletedHraLandmarkValidation()).toBe(false);
  });

  it("records the inspected official Allen annotation volume metadata without claiming a raw GLB bridge", () => {
    const evidence = ALLEN_ICBM_2009B_CORRESPONDENCE_EVIDENCE;
    const full = evidence.annotationVolumes.find(
      (volume) => volume.filename === "annotation_full.nii.gz",
    );

    expect(evidence.status).toBe("unavailable");
    expect(evidence.notExecutable).toBe(true);
    expect(evidence.sourceAsset.sha256).toBe(HRA_V11_ALLEN_BRAIN_ASSET.sha256);
    expect(evidence.sourceSpaceId).toBe("luna-raw-hra-v11-allen-brain-glb");
    expect(evidence.targetSpaceId).toBe(
      "allen-human-reference-atlas-3d-2020-icbm-2009b-sym",
    );
    expect(full).toMatchObject({
      dimensions: [394, 466, 378],
      voxelSpacingMillimetres: [0.5, 0.5, 0.5],
      units: "millimetres",
      affineSource: "qform",
      orientationOfIncreasingVoxelIndices: ["R", "A", "S"],
      originWorldMillimetres: [-98, -134, -72],
      nonBackgroundLabelCount: 141,
    });
    expect(evidence.transformArtifact).toBeNull();
    expect(evidence.validation.landmarkResidualsMillimetres).toBeNull();
  });

  it("records exact semantic candidates while preserving the absence of coordinate correspondence", () => {
    const hippocampusHead =
      ALLEN_ICBM_2009B_CORRESPONDENCE_EVIDENCE.semanticStructureCandidates.find(
        (candidate) => candidate.allenAcronym === "HiH",
      );

    expect(hippocampusHead).toMatchObject({
      allenAnnotationId: 12171,
      allenName: "head of hippocampus",
      laterality: "paired",
      evidence: "exact-name-semantic-candidate",
    });
    expect(hippocampusHead?.glbNodeNames).toEqual([
      "Allen_head_of_hippocampus_L",
      "Allen_head_of_hippocampus_R",
    ]);
    expect(hippocampusHead?.limitation).toContain("node-to-voxel-label");
    expect(
      isHraCoordinateSpacePair(
        "luna-raw-hra-v11-allen-brain-glb",
        "allen-human-reference-atlas-3d-2020-icbm-2009b-sym",
      ),
    ).toBe(false);
  });

  it("exposes no MNI coordinates or transform through the HRA registration", () => {
    const mni = getHraMniRegistrationStatus();
    expect(mni.status).toBe("not-established");
    expect(mni.reason).toContain("No authoritative");
    expect(HRA_V11_ALLEN_BRAIN_SPATIAL_REGISTRATION.mni.status).toBe(
      "not-established",
    );
  });
});
