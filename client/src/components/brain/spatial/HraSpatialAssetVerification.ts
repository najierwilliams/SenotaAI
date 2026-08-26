import {
  HRA_V11_ALLEN_BRAIN_ASSET,
  type HraPinnedAsset,
} from "@shared/hraSpatial";

export type HraAssetVerificationStatus =
  | "pending"
  | "verified"
  | "mismatch"
  | "unavailable";

export interface HraAssetVerification {
  status: HraAssetVerificationStatus;
  path: string;
  sha256: string | null;
  message: string;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * This verifies only the local source asset identity. It does not derive a
 * coordinate transform, inspect bounds, alter Three.js object transforms, or
 * request a scientific dataset beyond the GLB already loaded by BrainViewer.
 */
export async function verifyHraPinnedAsset(
  path: string,
  fetcher: typeof fetch = fetch,
): Promise<HraAssetVerification> {
  try {
    const response = await fetcher(path, {
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      return {
        status: "unavailable",
        path,
        sha256: null,
        message: `Unable to verify HRA source asset identity (HTTP ${response.status}). The viewer remains available, but HRA placement requires revalidation.`,
      };
    }

    const digest = await crypto.subtle.digest(
      "SHA-256",
      await response.arrayBuffer(),
    );
    const sha256 = bytesToHex(digest);
    const verified =
      path === HRA_V11_ALLEN_BRAIN_ASSET.path &&
      sha256 === HRA_V11_ALLEN_BRAIN_ASSET.sha256;

    return {
      status: verified ? "verified" : "mismatch",
      path,
      sha256,
      message: verified
        ? "Local GLB checksum matches the HRA v1.1 Allen_F_Brain.glb spatial registration record."
        : "Local GLB checksum differs from the HRA v1.1 pinned asset. HRA placement is not applied and requires revalidation.",
    };
  } catch (error) {
    return {
      status: "unavailable",
      path,
      sha256: null,
      message:
        error instanceof Error
          ? `Unable to verify HRA source asset identity: ${error.message}`
          : "Unable to verify HRA source asset identity. HRA placement requires revalidation.",
    };
  }
}

export function toHraPinnedAssetCandidate(
  verification: HraAssetVerification,
): Pick<HraPinnedAsset, "path" | "sha256"> | null {
  return verification.status === "verified" && verification.sha256
    ? {
        path: verification.path,
        sha256: verification.sha256,
      }
    : null;
}
