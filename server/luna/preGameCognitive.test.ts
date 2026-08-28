import { describe, expect, it } from "vitest";
import {
  allocateLunaFocus,
  assessLunaCognitiveInput,
  canPromoteInferredSelfModel,
  deriveInternalStateChanges,
  isWithinCooldown,
  LUNA_COGNITIVE_MAX_BACKGROUND_FOCUS,
  maintenanceStopsAfter,
  normalizeLunaCognitiveText,
  validAttentionTransition,
  validContradictionTransition,
  validCuriosityTransition,
  validGapTransition,
  validGoalProfileTransition,
} from "./preGameCognitive";

const attention = (id: string, score: number, severity: "INFO" | "WARNING" | "ACTION_REQUIRED" = "INFO") => ({
  id,
  workspaceId: "workspace",
  sourceType: "EXPERIENCE",
  sourceId: id,
  targetType: "EXPERIENCE",
  targetId: id,
  severity,
  score,
  factors: { importance: score },
  state: "ACTIVE" as const,
  focusTier: null,
  suppressionReason: null,
  expiresAt: null,
  createdAt: `2026-08-27T00:00:${id.padStart(2, "0")}Z`,
  updatedAt: "2026-08-27T00:00:00Z",
});

describe("pre-game Luna cognitive assessment", () => {
  it("does not promote an ordinary greeting into durable learning candidates", () => {
    const result = assessLunaCognitiveInput({ content: "hello" });
    expect(result.relevance).toBe("CONTEXT_ONLY");
    expect(result.recommendedGapCategory).toBeNull();
    expect(result.attentionScore).toBeLessThan(0.1);
  });

  it("recognizes an explicit correction as source-backed contradiction risk without selecting a winner", () => {
    const result = assessLunaCognitiveInput({ content: "Correction: that assumption is wrong; please revise it." });
    expect(result.relevance).toBe("RELEVANT");
    expect(result.detectedCorrection).toBe(true);
    expect(result.recommendedGapCategory).toBe("CONTRADICTION");
    expect(result.reasoning.conclusion).toContain("correction");
    expect(result.reasoning.recommendation).toContain("unresolved contradiction candidate");
  });

  it("derives bounded goal and question context without calling a worker", () => {
    const result = assessLunaCognitiveInput({ content: "We need to decide what provenance is missing before the deadline. What source supports it?" });
    expect(result.detectedGoal).toBe(true);
    expect(result.detectedQuestion).toBe(true);
    expect(result.relevance).toBe("RELEVANT");
    expect(result.recommendedGapCategory).toBe("PROVENANCE");
    expect(result.reasoning.options).toHaveLength(2);
  });

  it("suppresses exact normalized repeat novelty", () => {
    const content = "We need to evaluate the project evidence.";
    const result = assessLunaCognitiveInput({ content, existingNormalizedSummaries: ["  WE NEED to evaluate the project evidence! "] });
    expect(result.relevance).toBe("CONTEXT_ONLY");
    expect(result.noveltyScore).toBe(0.05);
    expect(normalizeLunaCognitiveText(content)).toBe("we need to evaluate the project evidence");
  });

  it("rejects credential-shaped input before it can become cognitive data", () => {
    expect(() => assessLunaCognitiveInput({ content: "api_key=sk-abcdefghijklmnopqrstuvwxyz123456" })).toThrow(/Sensitive credentials/);
  });
});

describe("pre-game lifecycle and focus safety", () => {
  it("requires repeated, cross-cycle evidence before inferred self development", () => {
    expect(canPromoteInferredSelfModel({ factKind: "INFERRED", evidenceCount: 2, distinctCycleCount: 2, averageConfidence: 0.9 })).toBe(false);
    expect(canPromoteInferredSelfModel({ factKind: "INFERRED", evidenceCount: 3, distinctCycleCount: 1, averageConfidence: 0.9 })).toBe(false);
    expect(canPromoteInferredSelfModel({ factKind: "INFERRED", evidenceCount: 3, distinctCycleCount: 2, averageConfidence: 0.7 })).toBe(true);
    expect(canPromoteInferredSelfModel({ factKind: "USER_ASSERTED", evidenceCount: 9, distinctCycleCount: 9, averageConfidence: 1 })).toBe(false);
  });

  it("enforces terminal and evidence-aware lifecycle transitions", () => {
    expect(validAttentionTransition("ACTIVE", "SUPPRESSED")).toBe(true);
    expect(validAttentionTransition("RESOLVED", "ACTIVE")).toBe(false);
    expect(validGapTransition("RESOLVED", "OPEN", false)).toBe(false);
    expect(validGapTransition("RESOLVED", "OPEN", true)).toBe(true);
    expect(validGapTransition("MERGED", "OPEN", true)).toBe(false);
    expect(validCuriosityTransition("INVESTIGATING", "SATISFIED")).toBe(true);
    expect(validCuriosityTransition("SATISFIED", "INTERESTING")).toBe(false);
    expect(validContradictionTransition("UNRESOLVED", "ACCEPTED_A")).toBe(false);
    expect(validContradictionTransition("UNDER_INVESTIGATION", "INCONCLUSIVE")).toBe(true);
    expect(validGoalProfileTransition("ACTIVE", "SUPERSEDED")).toBe(true);
    expect(validGoalProfileTransition("COMPLETED", "ACTIVE")).toBe(false);
  });

  it("allocates one primary, three secondary, and a bounded background focus set deterministically", () => {
    const values = Array.from({ length: 16 }, (_, index) => attention(String(index + 1), 1 - index / 20));
    const allocation = allocateLunaFocus(values);
    expect(allocation).toHaveLength(1 + 3 + LUNA_COGNITIVE_MAX_BACKGROUND_FOCUS);
    expect(allocation[0]).toMatchObject({ attentionId: "1", tier: "PRIMARY", rank: 1 });
    expect(allocation.filter(item => item.tier === "SECONDARY")).toHaveLength(3);
    expect(allocation.filter(item => item.tier === "BACKGROUND")).toHaveLength(LUNA_COGNITIVE_MAX_BACKGROUND_FOCUS);
  });

  it("keeps computational internal-state observations bounded and source-explainable", () => {
    const assessment = assessLunaCognitiveInput({ content: "Correction: this is not true. Why is the source missing?" });
    const changes = deriveInternalStateChanges(assessment);
    expect(changes.length).toBeLessThanOrEqual(4);
    expect(changes.map(change => change.dimension)).toContain("UNCERTAINTY");
    expect(changes.map(change => change.dimension)).toContain("CONCERN");
    expect(changes.every(change => change.value >= 0 && change.value <= 1)).toBe(true);
    expect(changes.every(change => Boolean(change.reason))).toBe(true);
  });

  it("stops maintenance at explicit evaluation or derivation caps and respects cooldown", () => {
    expect(maintenanceStopsAfter({ evaluatedCount: 100, derivedCount: 0 })).toBe(true);
    expect(maintenanceStopsAfter({ evaluatedCount: 10, derivedCount: 16 })).toBe(true);
    expect(maintenanceStopsAfter({ evaluatedCount: 10, derivedCount: 2 })).toBe(false);
    expect(isWithinCooldown(new Date(Date.now() + 10_000).toISOString())).toBe(true);
    expect(isWithinCooldown(new Date(Date.now() - 10_000).toISOString())).toBe(false);
  });
});
