import type { LunaAttentionItem, LunaClaim, LunaKnowledgeGap } from "@shared/lunaCognitive";
import type { LunaReflection } from "./supabase";

/**
 * An inspectable summary of persisted outcomes. It records no new knowledge and does not decide,
 * dispatch, or authorize a follow-up. This keeps learning bounded to the already-audited state.
 */
export function summarizeLunaLearning(input: {
  reflections: LunaReflection[];
  attention: LunaAttentionItem[];
  gaps: LunaKnowledgeGap[];
  claims: LunaClaim[];
}) {
  const latestReflection = input.reflections.slice().sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;
  const openAttention = input.attention.filter(item => item.state === "OPEN");
  const openGaps = input.gaps.filter(gap => gap.status === "OPEN" || gap.status === "WATCHING");
  const reviewRequiredClaims = input.claims.filter(claim => claim.lifecycleState === "REQUIRES_REVIEW" || claim.truthState === "CONTRADICTED");
  return {
    reflectionCount: input.reflections.length,
    latestReflection: latestReflection ? {
      id: latestReflection.id,
      createdAt: latestReflection.createdAt,
      confidence: latestReflection.confidence,
      nextAction: latestReflection.nextAction,
      truthState: latestReflection.truthState,
    } : null,
    openAttentionCount: openAttention.length,
    openGapCount: openGaps.length,
    reviewRequiredClaimCount: reviewRequiredClaims.length,
    learningBoundary: "persisted-outcome-summary-only",
    followUpAuthorization: false,
  };
}
