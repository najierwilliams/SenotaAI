import { createHash } from "node:crypto";
import type {
  LunaAttentionItem,
  LunaAutonomousDecision,
  LunaDecisionOutcome,
  LunaDecisionStatus,
  LunaKnowledgeGap,
  LunaMission,
  LunaPriorityAssessment,
  LunaFoundation,
} from "@shared/lunaCognitive";
import { assessDevelopmentalEligibility } from "./developmentalContext";

export const LUNA_MILESTONE5_POLICY_VERSION = "luna-m5-v1";
export const LUNA_MILESTONE5_MIN_PRIORITY = 0.55;

export const LUNA_MILESTONE5_BUDGET = {
  maxWorkers: 4,
  maxSteps: 24,
  maxRetries: 2,
  maxDurationSeconds: 900,
  maxModelRequests: 12,
  maxTokenBudget: 24_000,
} as const;

export type LunaDecisionCandidate = Pick<
  LunaAutonomousDecision,
  "sourceType" | "sourceId" | "decisionKey" | "objective" | "status" | "outcome" | "priorityScore" | "policyVersion" | "rationale" | "evidence" | "budget"
>;

function boundedObjective(gap: LunaKnowledgeGap) {
  return `Resolve bounded persisted knowledge gap: ${gap.question}`.slice(0, 12_000);
}

function decisionKey(gapId: string, assessmentId: string | null) {
  return createHash("sha256")
    .update(`${LUNA_MILESTONE5_POLICY_VERSION}:KNOWLEDGE_GAP:${gapId}:${assessmentId ?? "unassessed"}`)
    .digest("hex");
}

function latestGapAssessments(assessments: LunaPriorityAssessment[]) {
  const result = new Map<string, LunaPriorityAssessment>();
  for (const assessment of assessments) {
    if (assessment.targetType !== "GAP") continue;
    const previous = result.get(assessment.targetId);
    if (!previous || assessment.createdAt > previous.createdAt || (assessment.createdAt === previous.createdAt && assessment.id.localeCompare(previous.id) > 0)) result.set(assessment.targetId, assessment);
  }
  return result;
}

function hasActiveAutonomousMission(missions: LunaMission[]) {
  return missions.some(mission => mission.missionOrigin === "AUTONOMOUS" && ["QUEUED", "PLANNING", "RUNNING", "WAITING_FOR_PROVIDER", "WAITING_FOR_RUNTIME", "RECOVERY_REQUIRED"].includes(mission.status));
}

function hasUndischargedDecision(decisions: LunaAutonomousDecision[]) {
  return decisions.some(decision => ["RECOMMENDED", "DISPATCHED", "BLOCKED"].includes(decision.status));
}

/**
 * Assesses persisted owner-scoped data only. The result is a proposal, not a task, tool call,
 * or scientific conclusion. It has no side effects and uses a deterministic tie-break sequence.
 */
export function assessNextLunaAutonomousDecision(input: {
  autonomyEnabled: boolean;
  cognitiveActionsEnabled: boolean;
  gaps: LunaKnowledgeGap[];
  priorityAssessments: LunaPriorityAssessment[];
  attention: LunaAttentionItem[];
  missions: LunaMission[];
  decisions: LunaAutonomousDecision[];
  foundation?: LunaFoundation;
}): LunaDecisionCandidate | null {
  if (!input.autonomyEnabled || !input.cognitiveActionsEnabled) return null;
  if (input.attention.some(item => item.state === "OPEN" && item.severity === "ACTION_REQUIRED" && item.category === "SECURITY")) return null;

  if (hasUndischargedDecision(input.decisions) || hasActiveAutonomousMission(input.missions)) return null;

  const assessments = latestGapAssessments(input.priorityAssessments);
  const decidedSourceIds = new Set(input.decisions.map(item => item.sourceId));

  const candidate = input.gaps
    .filter(gap => gap.status === "OPEN")
    .map(gap => ({ gap, assessment: assessments.get(gap.id) ?? null }))
    .filter(item => item.assessment && item.assessment.priorityScore >= LUNA_MILESTONE5_MIN_PRIORITY)
    .filter(item => !decidedSourceIds.has(item.gap.id))
    .filter(item => !input.foundation || assessDevelopmentalEligibility(input.foundation, boundedObjective(item.gap)).eligible)
    .sort((left, right) => {
      const score = (right.assessment?.priorityScore ?? 0) - (left.assessment?.priorityScore ?? 0);
      if (score !== 0) return score;
      return left.gap.createdAt.localeCompare(right.gap.createdAt) || left.gap.id.localeCompare(right.gap.id);
    })[0];

  if (!candidate?.assessment) return null;
  const key = decisionKey(candidate.gap.id, candidate.assessment.id);
  if (input.decisions.some(item => item.decisionKey === key)) return null;

  return {
    sourceType: "KNOWLEDGE_GAP",
    sourceId: candidate.gap.id,
    decisionKey: key,
    objective: boundedObjective(candidate.gap),
    status: "RECOMMENDED",
    outcome: "NO_ACTION",
    priorityScore: candidate.assessment.priorityScore,
    policyVersion: LUNA_MILESTONE5_POLICY_VERSION,
    rationale: `Selected the highest persisted OPEN knowledge gap with a declared priority score of ${candidate.assessment.priorityScore.toFixed(3)}. This proposes a bounded software-only mission; it does not establish evidence, scientific truth, coordinates, or biological action.`,
    evidence: {
      gapId: candidate.gap.id,
      gapStatus: candidate.gap.status,
      gapQuestion: candidate.gap.question,
      priorityAssessmentId: candidate.assessment.id,
      declaredPriorityScore: candidate.assessment.priorityScore,
      attentionSecurityBlockerCount: input.attention.filter(item => item.state === "OPEN" && item.severity === "ACTION_REQUIRED" && item.category === "SECURITY").length,
      developmentalStage: input.foundation ? assessDevelopmentalEligibility(input.foundation, boundedObjective(candidate.gap)).category : "UNASSESSED",
    },
    budget: { ...LUNA_MILESTONE5_BUDGET },
  };
}

export function transitionLunaDecisionForDispatch(input: {
  accepted: boolean;
  runtimeAvailable: boolean;
}): { status: LunaDecisionStatus; outcome: LunaDecisionOutcome } {
  if (input.accepted) return { status: "DISPATCHED", outcome: "DISPATCHED" };
  if (!input.runtimeAvailable) return { status: "BLOCKED", outcome: "RUNTIME_UNAVAILABLE" };
  return { status: "BLOCKED", outcome: "REQUIRES_OWNER_REVIEW" };
}

export function terminalLunaDecisionState(missionStatus: LunaMission["status"]): { status: LunaDecisionStatus; outcome: LunaDecisionOutcome } | null {
  if (missionStatus === "COMPLETED") return { status: "COMPLETED", outcome: "NO_ACTION" };
  if (missionStatus === "FAILED" || missionStatus === "LIMIT_REACHED" || missionStatus === "RECOVERY_REQUIRED") return { status: "FAILED", outcome: "FAILED" };
  if (missionStatus === "CANCELLED") return { status: "CANCELLED", outcome: "CANCELLED" };
  return null;
}
