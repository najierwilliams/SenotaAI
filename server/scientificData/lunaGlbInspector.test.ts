import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

const projectRoot = process.cwd();
const assetPath = join(
  projectRoot,
  "client/public/models/luna/brain/source/3d-vh-f-allen-brain.glb",
);
const expectedSha256 =
  "c5711a1a8bc62ca930b8bcf076def15315c11f5ad9bc7901e51f698406d38dbc";

function checksum(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

it("inspects the immutable Luna GLB without modifying it or asserting spatial registration", () => {
  const outputPath = join(
    tmpdir(),
    `luna-glb-inspection-vitest-${process.pid}.json`,
  );
  const before = checksum(assetPath);

  try {
    execFileSync("node", ["scripts/inspectLunaGlb.mjs"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        LUNA_GLB_INSPECTION_OUTPUT: outputPath,
      },
      stdio: "pipe",
    });

    const report = JSON.parse(readFileSync(outputPath, "utf8")) as {
      byteLength: number;
      header: { magic: string; version: number; declaredLength: number };
      asset: { generator?: string } | null;
      counts: Record<string, number>;
      nodeTransformSummary: Record<string, number>;
      registrationTransform?: unknown;
      mniCoordinate?: unknown;
    };

    expect(before).toBe(expectedSha256);
    expect(checksum(assetPath)).toBe(expectedSha256);
    expect(report.byteLength).toBe(11_977_884);
    expect(report.header).toMatchObject({
      magic: "glTF",
      version: 2,
      declaredLength: 11_977_884,
    });
    expect(report.asset?.generator).toContain("Autodesk MAYA 2022.2");
    expect(report.counts).toMatchObject({
      nodes: 286,
      meshes: 283,
      primitiveCount: 283,
      animations: 0,
      skins: 0,
      cameras: 0,
    });
    expect(report.nodeTransformSummary).toEqual({
      nodesWithMatrix: 0,
      nodesWithNonIdentityTranslation: 0,
      nodesWithNonIdentityRotation: 0,
      nodesWithNonIdentityScale: 0,
    });
    expect(report.registrationTransform).toBeUndefined();
    expect(report.mniCoordinate).toBeUndefined();
  } finally {
    rmSync(outputPath, { force: true });
  }
});
