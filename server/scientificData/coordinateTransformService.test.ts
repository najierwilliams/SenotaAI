import { describe, expect, it } from "vitest";
import {
  BRAIN_REFERENCE_SPACES,
  getDataset,
} from "./registry";
import {
  getCoordinateTransform,
  transformCoordinate,
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
    expect(getSpace("ebrains-mni-icbm-152-2009c").version).toContain("2009c");
    expect(getSpace("ebrains-bigbrain").resolution).toBe("20 μm");
    expect(getSpace("allen-human-donor-mr").coordinateConvention).toBe("Donor MR volume coordinates");
    expect(getSpace("cellxgene-human-brain-anatomical-annotation").kind).toBe("annotation");
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
      { sourceVersion: "2009c nonlinear asymmetric" },
    );

    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.coordinate).toEqual(mniCoordinate);
      expect(result.transform.transformType).toBe("identity");
      expect(result.transform.reversible).toBe(true);
    }
  });

  it("rejects invalid coordinates, incompatible units, and unavailable Luna registration", () => {
    const invalidCoordinate = transformCoordinate(
      { x: Number.NaN, y: 0, z: 0, units: "millimetres" },
      "ebrains-mni-icbm-152-2009c",
      "ebrains-mni-icbm-152-2009c",
    );
    expect(invalidCoordinate.status).toBe("unavailable");
    if (invalidCoordinate.status === "unavailable") {
      expect(invalidCoordinate.failure).toBe("invalid-coordinate");
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
      expect(lunaRegistration.failure).toBe("transform-unavailable");
      expect(lunaRegistration.reason).toContain("Reference-space registration unavailable");
    }
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
