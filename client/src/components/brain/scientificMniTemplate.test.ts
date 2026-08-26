import { describe, expect, it } from "vitest";

import type {
  MniScientificTemplateSurface,
} from "@shared/brainScience";
import {
  canStreamMniScientificTemplate,
  clampMniScientificTemplateOpacity,
  createMniScientificTemplateState,
  decodeLegacyNeuroglancerMesh,
} from "./scientificMniTemplate";

const SURFACE: MniScientificTemplateSurface = {
  id: "siibra-mni-2009c-cortical-template",
  label: "MNI template",
  status: "PARTIAL",
  referenceSpaceId: "ebrains-mni-icbm-152-2009c",
  providerReferenceSpaceId: "minds/core/referencespace/v1.0.0/dafcffc5-4826-4bf1-8ff6-46b8a31ff8e2",
  configurationRevision: "test",
  sourceUrl: "https://provider.example/space",
  meshLabelIndex: 65535,
  format: "neuroglancer-legacy-precomputed-mesh",
  transformUrl: "https://provider.example/transform.json",
  transformMatrixNanometres: [[1, 0, 0, -1_000_000], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]],
  fragments: [
    { id: "left-hemisphere_cortex", url: "https://provider.example/left", bytes: 11, decodedBytes: 52, etag: "left", lastModified: "2024-01-01T00:00:00Z" },
    { id: "right-hemisphere_cortex", url: "https://provider.example/right", bytes: 11, decodedBytes: 52, etag: "right", lastModified: "2024-01-01T00:00:00Z" },
  ],
  licensing: {
    license: "Attribution required",
    redistribution: "permitted-with-attribution",
    attributionRequired: true,
    sourceUrl: "https://provider.example/license",
  },
  rendering: {
    defaultVisible: false,
    defaultOpacity: 0.48,
    deliveryMode: "provider-stream",
    cachePolicy: "no-persistent-cache",
    selectionCapability: "UNAVAILABLE_NO_REGION_LABELS",
  },
  limitation: "Separate from HRA.",
};

function createPayload(): ArrayBuffer {
  const vertexCount = 3;
  const buffer = new ArrayBuffer(4 + vertexCount * 3 * 4 + 3 * 4);
  const view = new DataView(buffer);
  view.setUint32(0, vertexCount, true);
  const vertices = [1_000_000, 0, 0, 2_000_000, 0, 0, 1_000_000, 1_000_000, 0];
  vertices.forEach((value, index) => view.setFloat32(4 + index * 4, value, true));
  [0, 1, 2].forEach((value, index) => view.setUint32(4 + vertices.length * 4 + index * 4, value, true));
  return buffer;
}

describe("MNI scientific template utility", () => {
  it("keeps the provider template default-off and eligible only for bounded HTTPS streaming", () => {
    expect(createMniScientificTemplateState(SURFACE)).toEqual({
      visible: false,
      opacity: 0.48,
      loadState: "idle",
      error: null,
    });
    expect(canStreamMniScientificTemplate(SURFACE)).toBe(true);
    expect(canStreamMniScientificTemplate({ ...SURFACE, status: "UNAVAILABLE" })).toBe(false);
    expect(canStreamMniScientificTemplate({ ...SURFACE, fragments: [] })).toBe(false);
  });

  it("applies only the provider transform in nanometres before converting mesh coordinates to millimetres", () => {
    const decoded = decodeLegacyNeuroglancerMesh(createPayload(), SURFACE.transformMatrixNanometres);
    expect([...decoded.positions]).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    expect([...decoded.indices]).toEqual([0, 1, 2]);
  });

  it("clamps visual opacity without creating a positional or selection contract", () => {
    expect(clampMniScientificTemplateOpacity(-10)).toBe(0.08);
    expect(clampMniScientificTemplateOpacity(2)).toBe(0.82);
    expect(clampMniScientificTemplateOpacity(0.4)).toBe(0.4);
  });
});
