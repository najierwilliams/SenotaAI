import { describe, expect, it } from "vitest";
import {
  BRAIN_LUNA_REFERENCE_REGISTRATION,
  BRAIN_REFERENCE_SPACES,
  getDataset,
} from "./registry";
import {
  getCoordinateTransform,
  getLunaReferenceRegistration,
  isLunaMniTransformEnabled,
  transformCoordinate,
  transformCoordinateStrict,
} from "./coordinateTransformService";
import {
  createSpatialTargetState,
} from "./spatialTargetService";

const mniCoordinate = {
  x: 12,
  y: -18,
  z: 24,
  units: "millimetres" as const,
};

function getSpace(id: string) {
  const space = BRAIN_REFERENCE_SPACES.find(
    (entry) => entry.id === id,
  );

  if (!space) {
    throw new Error(`Missing reference space fixture: ${id}`);
  }

  return space;
}

function getRequiredDataset(id: string) {
  const dataset = getDataset(id);

  if (!dataset) {
    throw new Error(`Missing dataset fixture: ${id}`);
  }

  return dataset;
}

describe("Luna scientific reference-space registration", () => {
  it("registers explicit Luna, MNI, BigBrain, Allen donor-MR, and CELLxGENE annotation spaces", () => {
    expect(getSpace("luna-viewer-local").kind).toBe("viewer-local");
    expect(getSpace("luna-viewer-local").units).toBeNull();
    expect(getSpace("luna-raw-hra-v11-allen-brain-glb").kind).toBe("raw-asset");
    expect(getSpace("luna-raw-hra-v11-allen-brain-glb").units).toBe("millimetres");
    expect(getSpace("hra-brain-female-v1-1").kind).toBe("hra-reference-object");
    expect(getSpace("hra-ccf-body-v1-2").kind).toBe("hra-body-reference");
    expect(getSpace("hra-brain-female-v1-1").description).toContain("not MNI");
    expect(getSpace("ebrains-mni-icbm-152-2009c").version).toContain("2009c");
    expect(getSpace("ebrains-bigbrain").resolution).toBe("20 μm");
    expect(getSpace("allen-human-donor-mr").coordinateConvention).toBe("Donor MR volume coordinates");
    expect(getSpace("cellxgene-human-brain-anatomical-annotation").kind).toBe("annotation");
  });

  it("records the byte-verified HRA GLB provenance and a P33 NOT_ESTABLISHED MNI quality gate without an executable artifact", () => {
    const registration = getLunaReferenceRegistration();
    expect(registration).toEqual(BRAIN_LUNA_REFERENCE_REGISTRATION);
    expect(registration.status).toBe("unavailable");
    expect(registration.qualityGate.status).toBe("NOT_ESTABLISHED");
    expect(registration.qualityGate.transformEnabled).toBe(false);
    expect(registration.qualityGate.assessmentVersion).toBe("P33");
    expect(registration.qualityGate.missingEvidence).toHaveLength(4);
    expect(isLunaMniTransformEnabled()).toBe(false);
    expect(registration.sourceSpaceId).toBe("luna-viewer-local");
    expect(registration.targetSpaceId).toBe("ebrains-mni-icbm-152-2009c");
    expect(registration.sourceAsset.sourceVersion).toBe("HRA Brain-female v1.1");
    expect(registration.sourceAsset.sha256).toBe(
      "c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc",
    );
    expect(registration.transformArtifact).toBeNull();
    expect(registration.sourceUnits).toBeNull();
    expect(registration.sourceOrientation).toBeNull();
    expect(registration.validation.status).toBe("unavailable");
    expect(registration.validation.landmarks).toHaveLength(4);
    expect(registration.validation.landmarks.every((landmark) => landmark.status === "not-evaluated")).toBe(true);
  });

  it("rejects unknown reference spaces and declared version mismatches", () => {
    const unknown = transformCoordinate(
      mniCoordinate,
      "missing-space",
      "ebrains-mni-icbm-152-2009c",
    );
    expect(unknown.status).toBe("unavailable");
    if (unknown.status === "unavailable") {
      expect(unknown.failure).toBe("unknown-source-space");
    }

    const mismatch = transformCoordinate(
      mniCoordinate,
      "ebrains-mni-icbm-152-2009c",
      "ebrains-mni-icbm-152-2009c",
      { sourceVersion: "incorrect-template-version" },
    );
    expect(mismatch.status).toBe("unavailable");
    if (mismatch.status === "unavailable") {
      expect(mismatch.failure).toBe("reference-space-version-mismatch");
    }
  });

  it("allows identity only inside the same declared space and preserves transform provenance", () => {
    const result = transformCoordinate(
      mniCoordinate,
      "ebrains-mni-icbm-152-2009c",
      "ebrains-mni-icbm-152-2009c",
      { sourceVersion: "MNI 152 ICBM 2009c Nonlinear Asymmetric" },
    );

    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.coordinate).toEqual(mniCoordinate);
      expect(result.transform.transformType).toBe("identity");
      expect(result.transform.reversible).toBe(true);
    }
  });

  it("rejects invalid coordinates, incompatible units, and a NOT_ESTABLISHED Luna/MNI registration without emitting a coordinate", () => {
    const invalidCoordinate = transformCoordinate(
      { x: Number.NaN, y: 0, z: 0, units: "millimetres" },
      "ebrains-mni-icbm-152-2009c",
      "ebrains-mni-icbm-152-2009c",
    );
    expect(invalidCoordinate.status).toBe("unavailable");
    if (invalidCoordinate.status === "unavailable") {
      expect(invalidCoordinate.failure).toBe("invalid-coordinate");
    }

    const infiniteCoordinate = transformCoordinate(
      { x: Number.POSITIVE_INFINITY, y: 0, z: 0, units: "millimetres" },
      "ebrains-mni-icbm-152-2009c",
      "ebrains-mni-icbm-152-2009c",
    );
    expect(infiniteCoordinate.status).toBe("unavailable");
    if (infiniteCoordinate.status === "unavailable") {
      expect(infiniteCoordinate.failure).toBe("invalid-coordinate");
    }

    const invalidUnits = transformCoordinate(
      { x: 1, y: 2, z: 3, units: "voxels" },
      "ebrains-mni-icbm-152-2009c",
      "ebrains-mni-icbm-152-2009c",
    );
    expect(invalidUnits.status).toBe("unavailable");
    if (invalidUnits.status === "unavailable") {
      expect(invalidUnits.failure).toBe("invalid-units");
    }

    const lunaRegistration = transformCoordinate(
      { x: 0.1, y: 0.2, z: 0.3, units: null },
      "luna-viewer-local",
      "ebrains-mni-icbm-152-2009c",
    );
    expect(lunaRegistration.status).toBe("unavailable");
    if (lunaRegistration.status === "unavailable") {
      expect(lunaRegistration.failure).toBe("registration-not-established");
      expect(lunaRegistration.reason).toContain("Luna/MNI registration quality gate is NOT_ESTABLISHED");
      expect("coordinate" in lunaRegistration).toBe(false);
    }
  });

  it("rejects raw-GLB ↔ MNI directions at NOT_ESTABLISHED and preserves raw-space unit enforcement", () => {
    const rawToMni = transformCoordinate(
      { x: 0, y: 0, z: 0, units: "millimetres" },
      "luna-raw-hra-v11-allen-brain-glb",
      "ebrains-mni-icbm-152-2009c",
    );
    expect(rawToMni.status).toBe("unavailable");
    if (rawToMni.status === "unavailable") {
      expect(rawToMni.failure).toBe("registration-not-established");
      expect(rawToMni.transform?.id).toBe(
        "luna-raw-hra-v11-allen-brain-glb-to-ebrains-mni-icbm-152-2009c",
      );
      expect("coordinate" in rawToMni).toBe(false);
    }

    const mniToRaw = transformCoordinate(
      mniCoordinate,
      "ebrains-mni-icbm-152-2009c",
      "luna-raw-hra-v11-allen-brain-glb",
    );
    expect(mniToRaw.status).toBe("unavailable");
    if (mniToRaw.status === "unavailable") {
      expect(mniToRaw.failure).toBe("registration-not-established");
      expect(mniToRaw.transform?.id).toBe(
        "ebrains-mni-icbm-152-2009c-to-luna-raw-hra-v11-allen-brain-glb",
      );
    }

    const invalidRawUnits = transformCoordinate(
      { x: 0, y: 0, z: 0, units: "voxels" },
      "luna-raw-hra-v11-allen-brain-glb",
      "ebrains-mni-icbm-152-2009c",
    );
    expect(invalidRawUnits.status).toBe("unavailable");
    if (invalidRawUnits.status === "unavailable") {
      expect(invalidRawUnits.failure).toBe("invalid-units");
    }
  });

  it("requires a registered transform ID and provenance before strict conversion", () => {
    const missingId = transformCoordinateStrict({
      coordinate: mniCoordinate,
      sourceReferenceSpaceId: "ebrains-mni-icbm-152-2009c",
      targetReferenceSpaceId: "ebrains-mni-icbm-152-2009c",
      transformId: null,
      provenance: "test fixture",
    });
    expect(missingId.status).toBe("unavailable");
    if (missingId.status === "unavailable") {
      expect(missingId.failure).toBe("missing-transform-id");
    }

    const missingProvenance = transformCoordinateStrict({
      coordinate: mniCoordinate,
      sourceReferenceSpaceId: "ebrains-mni-icbm-152-2009c",
      targetReferenceSpaceId: "ebrains-mni-icbm-152-2009c",
      transformId: "ebrains-mni-icbm-152-2009c-identity",
      provenance: null,
    });
    expect(missingProvenance.status).toBe("unavailable");
    if (missingProvenance.status === "unavailable") {
      expect(missingProvenance.failure).toBe("missing-provenance");
    }

    const unsupported = transformCoordinateStrict({
      coordinate: mniCoordinate,
      sourceReferenceSpaceId: "ebrains-mni-icbm-152-2009c",
      targetReferenceSpaceId: "ebrains-mni-icbm-152-2009c",
      transformId: "invented-transform",
      provenance: "test fixture",
    });
    expect(unsupported.status).toBe("unavailable");
    if (unsupported.status === "unavailable") {
      expect(unsupported.failure).toBe("unsupported-transform");
    }

    const strictLuna = transformCoordinateStrict({
      coordinate: { x: 0, y: 0, z: 0, units: null },
      sourceReferenceSpaceId: "luna-viewer-local",
      targetReferenceSpaceId: "ebrains-mni-icbm-152-2009c",
      transformId: "luna-to-mni-invented",
      provenance: "Luna viewer",
    });
    expect(strictLuna.status).toBe("unavailable");
    if (strictLuna.status === "unavailable") {
      expect(strictLuna.failure).toBe("unsupported-transform");
    }

    const registeredRawGlbTransform = transformCoordinateStrict({
      coordinate: { x: 0, y: 0, z: 0, units: "millimetres" },
      sourceReferenceSpaceId: "luna-raw-hra-v11-allen-brain-glb",
      targetReferenceSpaceId: "ebrains-mni-icbm-152-2009c",
      transformId: "luna-raw-hra-v11-allen-brain-glb-to-ebrains-mni-icbm-152-2009c",
      provenance: "checksum-pinned raw GLB fixture",
    });
    expect(registeredRawGlbTransform.status).toBe("unavailable");
    if (registeredRawGlbTransform.status === "unavailable") {
      expect(registeredRawGlbTransform.failure).toBe("registration-not-established");
      expect("coordinate" in registeredRawGlbTransform).toBe(false);
    }
  });

  it("does not turn a rejected raw-GLB/MNI path into a Macro coordinate target or enabled operation", () => {
    const rawToMniTransform = getCoordinateTransform(
      "luna-raw-hra-v11-allen-brain-glb",
      "ebrains-mni-icbm-152-2009c",
    );
    const macro = createSpatialTargetState({
      scale: "macro",
      dataset: getRequiredDataset("luna-macro-anatomy-model"),
      provenance: null,
      referenceSpace: getSpace("luna-raw-hra-v11-allen-brain-glb"),
      structureMapping: null,
      coordinateTransform: rawToMniTransform,
    });

    expect(rawToMniTransform?.status).toBe("unavailable");
    expect(macro.spatialTarget.coordinate).toBeNull();
    expect(macro.spatialTarget.spatialStatus).toBe("unavailable");
    expect(macro.spatialCapability.transformToLunaAvailable).toBe(false);
    expect(macro.spatialCapability.operationEnabled).toBe(false);
  });

  it("keeps Tissue, Cellular, Molecular, and Subcellular targets unavailable for distinct recorded reasons", () => {
    const tissue = createSpatialTargetState({
      scale: "tissue",
      dataset: getRequiredDataset("julich-brain-cytoarchitecture"),
      provenance: null,
      referenceSpace: getSpace("ebrains-mni-icbm-152-2009c"),
      structureMapping: {
        canonicalStructureId: "allen_hippocampus_l",
        provider: "julich-brain",
        externalId: null,
        externalName: "Hippocampus",
        status: "query-required",
        note: "Provider regional query required.",
      },
      coordinateTransform: getCoordinateTransform(
        "luna-viewer-local",
        "ebrains-mni-icbm-152-2009c",
      ),
    });
    expect(tissue.spatialTarget.coordinateType).toBe("region");
    expect(tissue.spatialCapability.spatialDataAvailable).toBe(true);
    expect(tissue.spatialCapability.transformToLunaAvailable).toBe(false);
    expect(tissue.spatialCapability.operationEnabled).toBe(false);

    const cellular = createSpatialTargetState({
      scale: "cellular",
      dataset: getRequiredDataset("cellxgene-human-brain-cell-atlas-v1"),
      provenance: null,
      referenceSpace: getSpace("cellxgene-human-brain-anatomical-annotation"),
      structureMapping: null,
      coordinateTransform: null,
    });
    expect(cellular.spatialCapability.spatialDataAvailable).toBe(false);
    expect(cellular.spatialTarget.reason).toContain("no coordinate-resolved human cell positions");

    const molecular = createSpatialTargetState({
      scale: "molecular",
      dataset: getRequiredDataset("allen-human-brain-atlas-microarray"),
      provenance: null,
      referenceSpace: getSpace("allen-human-donor-mr"),
      structureMapping: null,
      coordinateTransform: null,
    });
    expect(molecular.spatialCapability.spatialDataAvailable).toBe(true);
    expect(molecular.spatialTarget.reason).toContain("no validated reference-space registration into Luna Local");

    const subcellular = createSpatialTargetState({
      scale: "subcellular",
      dataset: getRequiredDataset("human-cortical-em-fragment"),
      provenance: null,
      referenceSpace: null,
      structureMapping: null,
      coordinateTransform: null,
    });
    expect(subcellular.spatialCapability.datasetAvailable).toBe(false);
    expect(subcellular.spatialTarget.reason).toContain("No coordinate-resolved human whole-brain subcellular dataset");
  });
});
