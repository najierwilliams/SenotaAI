import type {
  LunaAttentionAssessment,
  LunaAttentionAssessmentState,
  LunaCognitiveAssessment,
  LunaCognitiveInputRelevance,
  LunaContradictionStatus,
  LunaCuriosityExtendedStatus,
  LunaExtendedGapStatus,
  LunaFocusTier,
  LunaGapCategory,
  LunaGoalExtendedStatus,
  LunaInternalStateDimension,
  LunaSelfModelFactKind,
} from "@shared/lunaCognitive";

export const LUNA_COGNITIVE_MAX_ITEMS_PER_CYCLE = 100;
export const LUNA_COGNITIVE_MAX_DERIVATIONS_PER_CYCLE = 16;
export const LUNA_COGNITIVE_MAX_BACKGROUND_FOCUS = 8;
export const LUNA_COGNITIVE_MIN_SELF_EVIDENCE = 3;
export const LUNA_COGNITIVE_MIN_SELF_CYCLES = 2;
export const LUNA_COGNITIVE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const sensitivePattern = /\b(?:api[_ -]?key|access[_ -]?token|secret|password|private[_ -]?key)\b\s*[:=]|\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|vcp_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,})\b|-----BEGIN [A-Z ]*PRIVATE KEY-----/i;
const correctionPattern = /\b(?:correction|correct that|that(?:'s| is) wrong|i was wrong|actually|instead|not true|please revise)\b/i;
const goalPattern = /\b(?:i want|we want|goal is|goal:|need to|we need|plan to|trying to|objective is)\b/i;
const commitmentPattern = /\b(?:i promise|we promise|i will|we will|commit(?:ment)? to|by \d{4}-\d{2}-\d{2})\b/i;
const questionPattern = /\?|\b(?:how|what|why|when|where|which|can you|could you|is there|do we)\b/i;
const urgencyPattern = /\b(?:urgent|asap|today|deadline|blocked|blocking|critical)\b/i;
const riskPattern = /\b(?:risk|unsafe|security|privacy|clinical|medical|physical|financial|destructive|account)\b/i;

export function normalizeLunaCognitiveText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ?:'-]/g, "").trim().slice(0, 4_000);
}

export function assertSafeLunaCognitiveInput(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) throw new Error("A cognitive input requires non-empty content.");
  if (trimmed.length > 4_000) throw new Error("A cognitive input may contain at most 4,000 characters.");
  if (sensitivePattern.test(trimmed)) throw new Error("Sensitive credentials and private keys cannot be admitted to Luna cognitive input.");
  return trimmed;
}

function round(value: number) {
  return Math.round(Math.max(0, Math.min(1, value)) * 1_000) / 1_000;
}

function gapCategoryFor(input: { correction: boolean; question: boolean; goal: boolean; raw: string }): LunaGapCategory | null {
  if (input.correction) return "CONTRADICTION";
  if (/\b(source|citation|provenance|where did|evidence)\b/i.test(input.raw)) return "PROVENANCE";
  if (/\b(when|date|deadline|time)\b/i.test(input.raw)) return "TEMPORAL";
  if (/\b(relationship|trust|person|player|npc|social)\b/i.test(input.raw)) return "SOCIAL";
  if (/\b(can luna|capability|limitation|self model)\b/i.test(input.raw)) return "SELF_MODEL";
  if (input.goal) return "GOAL";
  if (input.question) return "CONTEXTUAL";
  return null;
}

/**
 * Produces a compact explainable assessment from an actual user, worker, project, or world input.
 * The function is pure: it performs no persistence, model call, tool invocation, or Queue dispatch.
 */
export function assessLunaCognitiveInput(input: { content: string; existingNormalizedSummaries?: string[]; declaredImportance?: number; declaredConfidence?: number }): LunaCognitiveAssessment {
  const raw = assertSafeLunaCognitiveInput(input.content);
  const normalized = normalizeLunaCognitiveText(raw);
  const correction = correctionPattern.test(raw);
  const goal = goalPattern.test(raw);
  const commitment = commitmentPattern.test(raw);
  const question = questionPattern.test(raw);
  const ordinaryGreeting = /^(?:hi|hello|hey|thanks|thank you|good morning|good evening)[!. ]*$/i.test(raw);
  const duplicate = (input.existingNormalizedSummaries ?? []).map(normalizeLunaCognitiveText).includes(normalized);
  const relevance: LunaCognitiveInputRelevance = ordinaryGreeting ? "CONTEXT_ONLY" : duplicate ? "CONTEXT_ONLY" : (correction || goal || commitment || question || raw.length >= 40) ? "RELEVANT" : "IGNORED";
  const uncertaintyScore = round(input.declaredConfidence === undefined ? (correction ? 0.8 : question ? 0.68 : goal ? 0.42 : 0.3) : 1 - input.declaredConfidence);
  const noveltyScore = duplicate ? 0.05 : ordinaryGreeting ? 0.1 : round(Math.min(0.9, 0.35 + Math.min(raw.length, 400) / 800 + (correction ? 0.2 : 0) + (goal ? 0.1 : 0)));
  const importance = round(input.declaredImportance ?? (urgencyPattern.test(raw) ? 0.9 : goal || commitment ? 0.7 : correction ? 0.75 : question ? 0.55 : 0.35));
  const attentionScore = round(relevance === "RELEVANT" ? importance * 0.45 + uncertaintyScore * 0.25 + noveltyScore * 0.2 + (riskPattern.test(raw) ? 0.1 : 0) : 0.05);
  const category = relevance === "RELEVANT" ? gapCategoryFor({ correction, question, goal, raw }) : null;
  const confidence = round(input.declaredConfidence ?? (correction ? 0.6 : question ? 0.45 : goal ? 0.7 : 0.55));
  const conclusion = correction
    ? "The source explicitly signals a correction; retain the source and seek evidence before selecting a competing claim."
    : goal
      ? "The source contains a stated objective that can inform owner-scoped goal continuity."
      : question
        ? "The source contains a question or missing-context signal suitable for bounded gap assessment."
        : relevance === "RELEVANT"
          ? "The source has durable contextual relevance but does not establish a factual or scientific claim."
          : "The source does not meet the threshold for durable cognitive learning.";
  const recommendation = relevance === "RELEVANT"
    ? correction ? "Create a correction learning record and unresolved contradiction candidate if an affected target is supplied." : category ? "Create or update a category-labelled knowledge gap only when an exact open duplicate is absent." : "Retain as a bounded experience without promoting it to memory."
    : "Keep only minimal input audit context; do not create memory, goal, or autonomous action.";
  return {
    relevance,
    summary: raw.slice(0, 1_200),
    importance,
    confidence,
    detectedCorrection: correction,
    detectedGoal: goal,
    detectedCommitment: commitment,
    detectedQuestion: question,
    noveltyScore,
    uncertaintyScore,
    attentionScore,
    recommendedGapCategory: category,
    reasoning: {
      conclusion,
      uncertaintySummary: uncertaintyScore >= 0.65 ? "The input has meaningful unresolved uncertainty or correction risk." : "The input carries bounded contextual uncertainty.",
      recommendation,
      options: [
        { label: "Retain source-backed context", summary: "Preserve the compact input and provenance for later owner-scoped retrieval." },
        { label: "Defer action", summary: "Do not promote the input to memory, a scientific claim, or worker execution without sufficient evidence and existing governance." },
      ],
    },
  };
}

export function canPromoteInferredSelfModel(input: { evidenceCount: number; distinctCycleCount: number; averageConfidence: number; factKind: LunaSelfModelFactKind }) {
  if (input.factKind !== "INFERRED") return false;
  return input.evidenceCount >= LUNA_COGNITIVE_MIN_SELF_EVIDENCE
    && input.distinctCycleCount >= LUNA_COGNITIVE_MIN_SELF_CYCLES
    && input.averageConfidence >= 0.7;
}

export function validAttentionTransition(from: LunaAttentionAssessmentState, to: LunaAttentionAssessmentState) {
  const valid: Record<LunaAttentionAssessmentState, readonly LunaAttentionAssessmentState[]> = {
    ACTIVE: ["SUPPRESSED", "RESOLVED", "EXPIRED"],
    SUPPRESSED: ["ACTIVE", "EXPIRED"],
    RESOLVED: [],
    EXPIRED: [],
  };
  return valid[from].includes(to);
}

export function validGapTransition(from: LunaExtendedGapStatus, to: LunaExtendedGapStatus, hasNewEvidence = false) {
  if (["RESOLVED", "DISMISSED", "EXPIRED"].includes(from) && to === "OPEN") return hasNewEvidence;
  if (from === "MERGED") return false;
  return from !== to;
}

export function validCuriosityTransition(from: LunaCuriosityExtendedStatus, to: LunaCuriosityExtendedStatus) {
  const valid: Record<LunaCuriosityExtendedStatus, readonly LunaCuriosityExtendedStatus[]> = {
    CANDIDATE: ["INTERESTING", "DEFERRED", "DISMISSED", "EXPIRED"],
    INTERESTING: ["QUEUED", "DEFERRED", "DISMISSED", "EXPIRED"],
    QUEUED: ["INVESTIGATING", "DEFERRED", "EXPIRED"],
    INVESTIGATING: ["SATISFIED", "DEFERRED", "EXPIRED"],
    SATISFIED: [], DEFERRED: ["INTERESTING", "EXPIRED"], DISMISSED: [], EXPIRED: [],
  };
  return valid[from].includes(to);
}

export function validContradictionTransition(from: LunaContradictionStatus, to: LunaContradictionStatus) {
  const valid: Record<LunaContradictionStatus, readonly LunaContradictionStatus[]> = {
    UNRESOLVED: ["UNDER_INVESTIGATION", "INCONCLUSIVE"],
    UNDER_INVESTIGATION: ["RESOLVED", "ACCEPTED_A", "ACCEPTED_B", "INCONCLUSIVE"],
    RESOLVED: [], ACCEPTED_A: [], ACCEPTED_B: [], INCONCLUSIVE: [],
  };
  return valid[from].includes(to);
}

export function validGoalProfileTransition(from: LunaGoalExtendedStatus, to: LunaGoalExtendedStatus) {
  const valid: Record<LunaGoalExtendedStatus, readonly LunaGoalExtendedStatus[]> = {
    PROPOSED: ["ACTIVE", "ABANDONED", "SUPERSEDED"],
    ACTIVE: ["PAUSED", "COMPLETED", "ABANDONED", "SUPERSEDED", "BLOCKED"],
    PAUSED: ["ACTIVE", "ABANDONED", "SUPERSEDED"],
    BLOCKED: ["ACTIVE", "PAUSED", "ABANDONED", "SUPERSEDED"],
    COMPLETED: [], ABANDONED: [], SUPERSEDED: [],
  };
  return valid[from].includes(to);
}

/** Deterministically allocates focus. Critical action-required items cannot be suppressed. */
export function allocateLunaFocus(items: LunaAttentionAssessment[]): Array<{ attentionId: string; tier: LunaFocusTier; rank: number; score: number; suppressionReason: string | null }> {
  const candidates = items.filter(item => item.state === "ACTIVE").sort((a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  return candidates.slice(0, 1 + 3 + LUNA_COGNITIVE_MAX_BACKGROUND_FOCUS).map((item, index) => ({
    attentionId: item.id,
    tier: index === 0 ? "PRIMARY" : index <= 3 ? "SECONDARY" : "BACKGROUND",
    rank: index + 1,
    score: item.score,
    suppressionReason: null,
  }));
}

export function deriveInternalStateChanges(assessment: LunaCognitiveAssessment): Array<{ dimension: LunaInternalStateDimension; value: number; delta: number; reason: string }> {
  const changes: Array<{ dimension: LunaInternalStateDimension; value: number; delta: number; reason: string }> = [
    { dimension: "UNCERTAINTY", value: assessment.uncertaintyScore, delta: assessment.uncertaintyScore, reason: "Derived from bounded source confidence and explicit correction/question signals." },
    { dimension: "INTEREST", value: assessment.noveltyScore, delta: assessment.noveltyScore, reason: "Derived from novelty assessment of the persisted input." },
  ];
  if (assessment.detectedCorrection) changes.push({ dimension: "CONCERN", value: assessment.attentionScore, delta: assessment.attentionScore, reason: "An explicit correction warrants evidence-bounded review, not an automatic claim winner." });
  if (assessment.detectedQuestion) changes.push({ dimension: "CURIOSITY", value: assessment.noveltyScore, delta: assessment.noveltyScore, reason: "A source question may justify a bounded curiosity candidate subject to cooldown." });
  return changes.slice(0, 4);
}

export function maintenanceStopsAfter(input: { evaluatedCount: number; derivedCount: number }) {
  return input.evaluatedCount >= LUNA_COGNITIVE_MAX_ITEMS_PER_CYCLE || input.derivedCount >= LUNA_COGNITIVE_MAX_DERIVATIONS_PER_CYCLE;
}

export function isWithinCooldown(until: string | null, now = new Date()) {
  return Boolean(until && Date.parse(until) > now.getTime());
}
