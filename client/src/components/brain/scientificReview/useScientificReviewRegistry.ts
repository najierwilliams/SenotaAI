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
  reviewStatus: "approved" | "evidence-backed-requires-review" | "unmapped";
  reviewedAt: string | null;
  reviewMethod: string | null;
  reviewProvenance: string | null;
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

export interface ReviewDecisionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function isPersistedReviewDecision(value: unknown): value is PersistedReviewDecision {
  if (!value || typeof value !== "object") return false;
  const decision = value as Partial<PersistedReviewDecision>;
  return (decision.status === "APPROVED" || decision.status === "REJECTED")
    && typeof decision.reviewer === "string"
    && typeof decision.reviewedAt === "string"
    && (typeof decision.reviewReason === "string" || decision.reviewReason === null);
}

/** Safely reads only valid local review overlays; canonical source records are never read or changed here. */
export function parsePersistedReviewDecisions(raw: string | null): Record<string, PersistedReviewDecision> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([structureId, decision]) => structureId.length > 0 && isPersistedReviewDecision(decision)),
    ) as Record<string, PersistedReviewDecision>;
  } catch {
    return {};
  }
}

export function readPersistedReviewDecisions(storage: ReviewDecisionStorage): Record<string, PersistedReviewDecision> {
  try {
    return parsePersistedReviewDecisions(storage.getItem(STORAGE_KEY));
  } catch {
    return {};
  }
}

export function persistReviewDecisions(storage: ReviewDecisionStorage, decisions: Record<string, PersistedReviewDecision>) {
  storage.setItem(STORAGE_KEY, JSON.stringify(decisions));
}

export function applyReviewDecision(
  decisions: Record<string, PersistedReviewDecision>,
  structureId: string,
  decision: PersistedReviewDecision,
): Record<string, PersistedReviewDecision> {
  return { ...decisions, [structureId]: decision };
}

export function keepStructureInReview(
  decisions: Record<string, PersistedReviewDecision>,
  structureId: string,
): Record<string, PersistedReviewDecision> {
  const next = { ...decisions };
  delete next[structureId];
  return next;
}

/** Test/development utility only. It removes the local decision overlay, never canonical evidence. */
export function clearPersistedReviewDecisions(storage: ReviewDecisionStorage) {
  storage.removeItem(STORAGE_KEY);
}

export function resolveScientificReviewStatus(record: CanonicalReviewRecord, decisions: Record<string, PersistedReviewDecision>): ScientificReviewStatus {
  // Server-attested approval is authoritative and source-preserving. Browser-local
  // overlays remain available only for records that still require human review.
  if (record.reviewStatus === "approved") return "APPROVED";
  const decision = decisions[record.lunaStructureId];
  if (decision) return decision.status;
  return record.reviewStatus === "evidence-backed-requires-review" ? "REQUIRES_REVIEW" : "UNMAPPED";
}

export function isReviewableCanonicalIdentity(record: CanonicalReviewRecord) {
  return record.reviewStatus === "approved" || record.reviewStatus === "evidence-backed-requires-review";
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
  const reviewedRecords = records.filter(isReviewableCanonicalIdentity);
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
    typeof window === "undefined" ? {} : readPersistedReviewDecisions(window.localStorage),
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
    const decision = createPersistedReviewDecision(status, reviewer, reviewReason);
    setDecisions((current) => {
      const next = applyReviewDecision(current, structureId, decision);
      persistReviewDecisions(window.localStorage, next);
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
      return next;
    });
  }, []);

  const resetToReview = useCallback((structureId: string) => {
    setDecisions((current) => {
      const next = keepStructureInReview(current, structureId);
      persistReviewDecisions(window.localStorage, next);
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
      return next;
    });
  }, []);

  const resetAllLocalReviewDecisionsForDevelopment = useCallback(() => {
    setDecisions(() => {
      clearPersistedReviewDecisions(window.localStorage);
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
      return {};
    });
  }, []);

  useEffect(() => {
    const syncStorageDecision = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setDecisions(parsePersistedReviewDecisions(event.newValue));
      }
    };
    window.addEventListener("storage", syncStorageDecision);
    return () => window.removeEventListener("storage", syncStorageDecision);
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const windowWithTestReset = window as Window & { __lunaScientificReviewTestReset?: () => void };
    const previous = windowWithTestReset.__lunaScientificReviewTestReset;
    windowWithTestReset.__lunaScientificReviewTestReset = resetAllLocalReviewDecisionsForDevelopment;
    return () => {
      if (previous) windowWithTestReset.__lunaScientificReviewTestReset = previous;
      else delete windowWithTestReset.__lunaScientificReviewTestReset;
    };
  }, [resetAllLocalReviewDecisionsForDevelopment]);

  const statusByStructureId = useMemo(() => new Map(records.map((record) => [record.lunaStructureId, effectiveStatus(record)])), [records, effectiveStatus]);
  const reviewedRecords = useMemo(() => records.filter(isReviewableCanonicalIdentity), [records]);
  const highConfidence = useMemo(() => reviewedRecords.filter((record) => !isCompositeReviewRecord(record)), [reviewedRecords]);
  const ambiguous = useMemo(() => reviewedRecords.filter(isCompositeReviewRecord), [reviewedRecords]);
  const summary = useMemo(() => buildScientificReviewSummary(records, decisions), [records, decisions]);

  return { records, loading, decisions, effectiveStatus, setDecision, resetToReview, statusByStructureId, reviewedRecords, highConfidence, ambiguous, summary };
}

export { STORAGE_KEY as SCIENTIFIC_REVIEW_STORAGE_KEY, UPDATE_EVENT as SCIENTIFIC_REVIEW_UPDATE_EVENT };
