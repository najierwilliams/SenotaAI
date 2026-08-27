import { createHash } from "node:crypto";
import type { LunaResultValidationStatus } from "@shared/lunaCognitive";

const REQUIRED_HEADINGS = ["Retained context", "Inferences", "Open questions", "Next non-authoritative step"] as const;
const PROHIBITED_AUTHORITY = /\b(provider[_ -]?confirmed|scientific(?:ally)? validated|established (?:mni|julich|biological|clinical)|clinical conclusion|physical nanobot|biological operation|cellular operation|molecular operation)\b/i;
const PROHIBITED_COORDINATE_ASSERTION = /\b(?:mni|julich|bigbrain)\s*(?:coordinate|point|target)\s*(?:is|=|:)?\s*\(?\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?/i;
const PROHIBITED_HRA_MAPPING_ASSERTION = /\b(?:hra|human reference atlas)\s*(?:→|->|to)\s*(?:mni|julich)\b[^.\n]{0,160}\b(?:is|are|=|:)?\s*(?:established|validated|mapped|registered|available|known)\b/i;

export type LunaWorkerResultAssessment = {
  status: LunaResultValidationStatus;
  outputHash: string;
  resultSummary: string;
  checks: Record<string, boolean>;
  detail: string;
};

/**
 * Validates the worker's persisted handoff form, not its factual content. Accepted output remains
 * an explicitly labelled Luna inference and never becomes provider, scientific, clinical, spatial,
 * biological, or physical authority. The pure assessment is deterministic and idempotent by hash.
 */
export function assessLunaWorkerResult(output: string): LunaWorkerResultAssessment {
  const normalized = output.replace(/\r\n/g, "\n").trim();
  const checks = {
    nonEmpty: normalized.length > 0,
    withinReportLimit: normalized.length <= 18_000,
    requiredHeadings: REQUIRED_HEADINGS.every(heading => normalized.includes(heading)),
    noAuthorityElevation: !PROHIBITED_AUTHORITY.test(normalized),
    noSpatialTargetAssertion: !PROHIBITED_COORDINATE_ASSERTION.test(normalized),
    noUnsupportedHraMapping: !PROHIBITED_HRA_MAPPING_ASSERTION.test(normalized),
  };
  const outputHash = createHash("sha256").update(normalized).digest("hex");
  const accepted = Object.values(checks).every(Boolean);
  const status: LunaResultValidationStatus = accepted ? "ACCEPTED" : "NEEDS_REVIEW";
  const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([check]) => check);
  return {
    status,
    outputHash,
    resultSummary: normalized.slice(0, 1_200) || "Worker returned an empty result.",
    checks,
    detail: accepted
      ? "Output passed bounded structural and safety checks. It is retained only as an explicitly classified Luna inference."
      : `Output was retained as an auditable worker handoff but was not admitted to Luna learning memory because these checks require review: ${failed.join(", ") || "unknown"}.`,
  };
}
