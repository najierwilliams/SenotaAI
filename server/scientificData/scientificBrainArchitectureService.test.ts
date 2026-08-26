import { describe, expect, it } from "vitest";

import {
  MNI_SCIENTIFIC_TEMPLATE_SURFACE,
  getScientificBrainArchitectureManifest,
} from "./scientificBrainArchitectureService";

describe("scientific brain architecture manifest", () => {
  it("declares an exact MNI 2009c provider-native cortical template without claiming HRA registration", () => {
    const manifest = getScientificBrainArchitectureManifest();

    expect(manifest.visualBrain).toMatchObject({
      model: "HRA Brain-Female v1.1",
      lunaToMni: "NOT_ESTABLISHED",
    });
    expect(manifest.mniTemplateSurface).toMatchObject({
      referenceSpaceId: "ebrains-mni-icbm-152-2009c",
      providerReferenceSpaceId: "minds/core/referencespace/v1.0.0/dafcffc5-4826-4bf1-8ff6-46b8a31ff8e2",
      meshLabelIndex: 65535,
      format: "neuroglancer-legacy-precomputed-mesh",
      status: "PARTIAL",
      rendering: {
        defaultVisible: false,
        deliveryMode: "provider-stream",
        cachePolicy: "no-persistent-cache",
        selectionCapability: "UNAVAILABLE_NO_REGION_LABELS",
      },
    });
    expect(manifest.mniTemplateSurface.fragments).toEqual([
      expect.objectContaining({ id: "left-hemisphere_cortex", bytes: 1366303 }),
      expect.objectContaining({ id: "right-hemisphere_cortex", bytes: 1386028 }),
    ]);
    expect(MNI_SCIENTIFIC_TEMPLATE_SURFACE.transformMatrixNanometres).toEqual([
      [1, 0, 0, -96500000],
      [0, 1, 0, -132500000],
      [0, 0, 1, -78500000],
      [0, 0, 0, 1],
    ]);
  });

  it("normalizes layer records while preserving source, license, provider, and scope boundaries", () => {
    const manifest = getScientificBrainArchitectureManifest();
    const kinds = manifest.observations.map((observation) => observation.kind);

    expect(kinds).toEqual(expect.arrayContaining([
      "mni-template",
      "tissue-atlas",
      "bigbrain-microscopy-context",
      "cellular-sample-context",
      "molecular-sample-context",
      "connectivity-context",
    ]));
    expect(manifest.observations.every((observation) => Boolean(observation.provenanceId) && Boolean(observation.licenseId) && Boolean(observation.limitation))).toBe(true);
    expect(manifest.observations.find((observation) => observation.kind === "bigbrain-microscopy-context")?.status).toBe("REQUIRES_REVIEW");
  });

  it("rejects non-evidenced HRA crosswalks while retaining the documented MNI-to-BigBrain provider transform", () => {
    const manifest = getScientificBrainArchitectureManifest();
    const hraToMni = manifest.crosswalks.find((entry) => entry.id === "hra-to-mni-2009c");
    const hraToJulich = manifest.crosswalks.find((entry) => entry.id === "hra-to-julich-v3-1");
    const mniToBigBrain = manifest.crosswalks.find((entry) => entry.id === "mni-2009c-to-bigbrain-2015");

    expect(hraToMni).toMatchObject({ status: "NOT_ESTABLISHED", relationshipType: "unmapped" });
    expect(hraToJulich).toMatchObject({ status: "UNMAPPED", relationshipType: "unmapped" });
    expect(mniToBigBrain).toMatchObject({
      status: "COMPLETE",
      relationshipType: "coordinate-transform",
      source: { referenceSpaceId: "ebrains-mni-icbm-152-2009c" },
      target: { referenceSpaceId: "ebrains-bigbrain" },
    });
    expect(mniToBigBrain?.limitation).toContain("not a Luna/HRA registration");
  });
});
