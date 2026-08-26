import { useCallback, useEffect, useMemo, useState } from "react";

export type ScientificReviewStatus = "REQUIRES_REVIEW" | "APPROVED" | "REJECTED" | "UNMAPPED";
export type ScientificReviewDecision = Exclude<ScientificReviewStatus, "UNMAPPED">;

export interface CanonicalReviewRecord {
  lunaStructureId: string;
  lunaStructureName: string;
  meshBacked: boolean;
  uberonId: string | null;
  fmaId: null;
  canonicalName: string | null;
  parentId: null;
  hraEntityId: string | null;
  source: string;
  sourceVersion: string;
  sourceUrl: string;
  reviewStatus: "evidence-backed-requires-review" | "unmapped";
  reviewedAt: null;
  reviewMethod: string | null;
  evidence: string;
  unmappedTriage: string | null;
}

export interface PersistedReviewDecision {
  status: Exclude<ScientificReviewDecision, "REQUIRES_REVIEW">;
  reviewer: string;
  reviewedAt: string;
  reviewReason: string | null;
}

const STORAGE_KEY = "luna-scientific-identity-review-v1";
const UPDATE_EVENT = "luna-scientific-review-updated";

function readPersistedDecisions(): Record<string, PersistedReviewDecision> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function resolveScientificReviewStatus(record: CanonicalReviewRecord, decisions: Record<string, PersistedReviewDecision>): ScientificReviewStatus {
  const decision = decisions[record.lunaStructureId];
  if (decision) return decision.status;
  return record.reviewStatus === "evidence-backed-requires-review" ? "REQUIRES_REVIEW" : "UNMAPPED";
}

export function createPersistedReviewDecision(status: "APPROVED" | "REJECTED", reviewer: string, reviewReason: string | null, reviewedAt = new Date().toISOString()): PersistedReviewDecision {
  if (status === "REJECTED" && !reviewReason?.trim()) {
    throw new Error("A rejection reason is required.");
  }
  return {
    status,
    reviewer: reviewer.trim() || "Local reviewer",
    reviewedAt,
    reviewReason: reviewReason?.trim() || null,
  };
}

export function isCompositeReviewRecord(record: CanonicalReviewRecord) {
  return /(complex|region|matter|part_of|body)/i.test(record.lunaStructureName);
}

export interface ScientificReviewSummary {
  total: number;
  highConfidence: number;
  ambiguous: number;
  approved: number;
  rejected: number;
  requiresReview: number;
  unmapped: number;
}

/**
 * Derives presentation-only review state from immutable canonical records and
 * locally persisted reviewer decisions. It never changes source evidence.
 */
export function buildScientificReviewSummary(
  records: CanonicalReviewRecord[],
  decisions: Record<string, PersistedReviewDecision>,
): ScientificReviewSummary {
  const reviewedRecords = records.filter((record) => record.reviewStatus === "evidence-backed-requires-review");
  const effectiveStatus = (record: CanonicalReviewRecord) => resolveScientificReviewStatus(record, decisions);

  return {
    total: reviewedRecords.length,
    highConfidence: reviewedRecords.filter((record) => !isCompositeReviewRecord(record)).length,
    ambiguous: reviewedRecords.filter(isCompositeReviewRecord).length,
    approved: reviewedRecords.filter((record) => effectiveStatus(record) === "APPROVED").length,
    rejected: reviewedRecords.filter((record) => effectiveStatus(record) === "REJECTED").length,
    requiresReview: reviewedRecords.filter((record) => effectiveStatus(record) === "REQUIRES_REVIEW").length,
    unmapped: records.filter((record) => effectiveStatus(record) === "UNMAPPED").length,
  };
}

export function useScientificReviewRegistry() {
  const [records, setRecords] = useState<CanonicalReviewRecord[]>([]);
  const [decisions, setDecisions] = useState<Record<string, PersistedReviewDecision>>(() =>
    typeof window === "undefined" ? {} : readPersistedDecisions(),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/brain-science/canonical-identities")
      .then((response) => response.ok ? response.json() : null)
      .then((payload: { identities?: CanonicalReviewRecord[] } | null) => {
        if (active) {
          setRecords(payload?.identities ?? []);
          setLoading(false);
        }
      })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const effectiveStatus = useCallback((record: CanonicalReviewRecord): ScientificReviewStatus => resolveScientificReviewStatus(record, decisions), [decisions]);

  const setDecision = useCallback((structureId: string, status: Exclude<ScientificReviewDecision, "REQUIRES_REVIEW">, reviewer: string, reviewReason: string | null) => {
    const next = {
      ...decisions,
      [structureId]: createPersistedReviewDecision(status, reviewer, reviewReason),
    };
    setDecisions(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  }, [decisions]);

  const resetToReview = useCallback((structureId: string) => {
    const next = { ...decisions };
    delete next[structureId];
    setDecisions(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  }, [decisions]);

  const statusByStructureId = useMemo(() => new Map(records.map((record) => [record.lunaStructureId, effectiveStatus(record)])), [records, effectiveStatus]);
  const reviewedRecords = useMemo(() => records.filter((record) => record.reviewStatus === "evidence-backed-requires-review"), [records]);
  const highConfidence = useMemo(() => reviewedRecords.filter((record) => !isCompositeReviewRecord(record)), [reviewedRecords]);
  const ambiguous = useMemo(() => reviewedRecords.filter(isCompositeReviewRecord), [reviewedRecords]);
  const summary = useMemo(() => buildScientificReviewSummary(records, decisions), [records, decisions]);

  return { records, loading, decisions, effectiveStatus, setDecision, resetToReview, statusByStructureId, reviewedRecords, highConfidence, ambiguous, summary };
}

export { STORAGE_KEY as SCIENTIFIC_REVIEW_STORAGE_KEY, UPDATE_EVENT as SCIENTIFIC_REVIEW_UPDATE_EVENT };
