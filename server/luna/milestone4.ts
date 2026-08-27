import type { LunaClaim, LunaKnowledgeGap, LunaMemory, LunaWorkerRole } from "@shared/lunaCognitive";

export type LunaWorkerSelectionAdvice = {
  role: LunaWorkerRole;
  reason: string;
  sourceCounts: Record<string, number>;
  dispatchAuthorized: false;
};

/**
 * Produces bounded advisory role suggestions from persisted state only. It deliberately does not
 * alter the deterministic task graph, enqueue workers, authorize tools, or choose scientific truth.
 */
export function adviseLunaWorkerSelection(input: {
  claims: LunaClaim[];
  gaps: LunaKnowledgeGap[];
  memories: LunaMemory[];
  limit?: number;
}): LunaWorkerSelectionAdvice[] {
  const openGaps = input.gaps.filter(gap => gap.status === "OPEN" || gap.status === "WATCHING");
  const actionRequiredGaps = openGaps.filter(gap => gap.severity === "ACTION_REQUIRED");
  const unanchoredClaims = input.claims.filter(claim => claim.lifecycleState === "REQUIRES_REVIEW");
  const providerUnavailable = input.memories.filter(memory => memory.truthState === "PROVIDER_UNAVAILABLE");
  const advice: LunaWorkerSelectionAdvice[] = [];
  if (openGaps.length || unanchoredClaims.length) advice.push({ role: "REVIEW_AGENT", reason: "Open persisted gaps or review-required claims need an explicit bounded review before any follow-up is considered.", sourceCounts: { openGaps: openGaps.length, reviewRequiredClaims: unanchoredClaims.length }, dispatchAuthorized: false });
  if (providerUnavailable.length) advice.push({ role: "PROVENANCE_AGENT", reason: "Persisted provider-unavailable observations require provenance review; this does not authorize a provider retry or external request.", sourceCounts: { providerUnavailable: providerUnavailable.length }, dispatchAuthorized: false });
  if (actionRequiredGaps.length) advice.push({ role: "MAINTENANCE_AGENT", reason: "Action-required persisted gaps merit a bounded health review and owner-visible attention, not autonomous execution.", sourceCounts: { actionRequiredGaps: actionRequiredGaps.length }, dispatchAuthorized: false });
  return advice.slice(0, Math.min(Math.max(input.limit ?? 6, 1), 14));
}
