import type { LunaCuriosityCandidate, LunaKnowledgeGap, LunaPriorityAssessment } from "@shared/lunaCognitive";

export type LunaPriorityFactors = Pick<LunaPriorityAssessment, "urgencyScore" | "impactScore" | "evidenceScore" | "unblockScore" | "riskScore">;

function boundedScore(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${label} must be a number from 0 to 1.`);
  return value;
}

/**
 * A transparent prioritization policy. Higher urgency, impact, evidence readiness, and unblock
 * value increase rank; higher action risk reduces rank. It does not authorize an action.
 */
export function explainLunaPriority(factors: LunaPriorityFactors) {
  const urgencyScore = boundedScore(factors.urgencyScore, "Urgency score");
  const impactScore = boundedScore(factors.impactScore, "Impact score");
  const evidenceScore = boundedScore(factors.evidenceScore, "Evidence score");
  const unblockScore = boundedScore(factors.unblockScore, "Unblock score");
  const riskScore = boundedScore(factors.riskScore, "Risk score");
  const priorityScore = Number((
    0.28 * urgencyScore +
    0.27 * impactScore +
    0.20 * evidenceScore +
    0.20 * unblockScore +
    0.05 * (1 - riskScore)
  ).toFixed(3));
  return {
    priorityScore,
    explanation: `Priority ${priorityScore.toFixed(3)} is derived from declared urgency (${urgencyScore.toFixed(3)}), impact (${impactScore.toFixed(3)}), evidence readiness (${evidenceScore.toFixed(3)}), unblock value (${unblockScore.toFixed(3)}), and risk reduction (${riskScore.toFixed(3)}). This ranking does not authorize external, destructive, financial, account, private-data, medical, biological, or physical action.`,
  };
}

export function inspectLunaAttentionSystem(input: {
  gaps: LunaKnowledgeGap[];
  curiosity: LunaCuriosityCandidate[];
  assessments: LunaPriorityAssessment[];
}) {
  const openGaps = input.gaps.filter(gap => gap.status === "OPEN" || gap.status === "WATCHING");
  const proposedCuriosity = input.curiosity.filter(candidate => candidate.status === "PROPOSED");
  return {
    openGapCount: openGaps.length,
    actionRequiredGapCount: openGaps.filter(gap => gap.severity === "ACTION_REQUIRED").length,
    proposedCuriosityCount: proposedCuriosity.length,
    latestAssessments: input.assessments.slice().sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 12),
    policy: "declared-factor-priority-with-risk-reduction",
  };
}
