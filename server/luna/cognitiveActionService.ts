import type { LunaDurableRuntime } from "@shared/lunaCognitive";
import { dispatchLunaMission, planLunaMission } from "./orchestrator";
import {
  createOrGetLunaAutonomousDecision,
  getLunaCognitiveSnapshot,
  recordLunaRuntimeEvent,
  updateLunaAutonomousDecision,
} from "./supabase";
import { assessNextLunaAutonomousDecision, transitionLunaDecisionForDispatch } from "./milestone5ActionLoop";

function missionPriority(priorityScore: number) {
  return Math.min(5, Math.max(1, Math.ceil(priorityScore * 5)));
}

/**
 * Executes no work in the request handler. It records an owner-enabled deterministic decision,
 * persists at most one linked mission, and uses the existing Queue-backed dispatcher. A durable
 * runtime acceptance with a real run ID remains the only proof that worker execution was queued.
 */
export async function assessAndDispatchLunaCognitiveAction(input: { userId: number; runtime?: LunaDurableRuntime }) {
  const snapshot = await getLunaCognitiveSnapshot(input.userId);
  const candidate = assessNextLunaAutonomousDecision({
    autonomyEnabled: snapshot.state.autonomyEnabled,
    cognitiveActionsEnabled: snapshot.state.cognitiveActionsEnabled,
    gaps: snapshot.knowledgeGaps,
    priorityAssessments: snapshot.priorityAssessments,
    attention: snapshot.attention,
    missions: snapshot.missions,
    decisions: snapshot.decisions,
  });

  if (!candidate) {
    return {
      accepted: false,
      reason: !snapshot.state.autonomyEnabled || !snapshot.state.cognitiveActionsEnabled
        ? "Owner-controlled cognitive action selection is disabled."
        : "No persisted eligible high-priority knowledge-gap candidate is available.",
      decision: null,
      mission: null,
      runtime: null,
    };
  }

  const persisted = await createOrGetLunaAutonomousDecision({ userId: input.userId, ...candidate, actor: "luna:autonomy" });
  let decision = persisted.decision;
  let linkedMission = decision.missionId ? snapshot.missions.find(mission => mission.id === decision.missionId) ?? null : null;

  if (!linkedMission) {
    const planned = await planLunaMission({
      userId: input.userId,
      objective: decision.objective,
      priority: missionPriority(decision.priorityScore),
      projectTitle: `Luna bounded action: ${decision.sourceType.replace(/_/g, " ")}`,
      decisionId: decision.id,
      missionOrigin: "AUTONOMOUS",
      idempotencyKey: `m5-decision:${decision.decisionKey}`,
      maxWorkers: decision.budget.maxWorkers,
      maxSteps: decision.budget.maxSteps,
      maxRetries: decision.budget.maxRetries,
      maxDurationSeconds: decision.budget.maxDurationSeconds,
      maxModelRequests: decision.budget.maxModelRequests,
      maxTokenBudget: decision.budget.maxTokenBudget,
    });
    linkedMission = planned.mission;
    decision = await updateLunaAutonomousDecision({
      userId: input.userId,
      decisionId: decision.id,
      missionId: linkedMission.id,
      status: "RECOMMENDED",
      outcome: "NO_ACTION",
      actor: "luna:autonomy",
      reason: "Decision created one bounded, idempotently linked durable mission.",
    });
    await recordLunaRuntimeEvent({
      userId: input.userId,
      action: "AUTONOMOUS_MISSION_PLANNED",
      subjectType: "DECISION",
      subjectId: decision.id,
      missionId: linkedMission.id,
      actor: "luna:autonomy",
      detail: { decisionKey: decision.decisionKey, sourceType: decision.sourceType, sourceId: decision.sourceId, policyVersion: decision.policyVersion, budget: decision.budget },
    });
  }

  const dispatched = await dispatchLunaMission({ userId: input.userId, missionId: linkedMission.id, runtime: input.runtime });
  const transition = transitionLunaDecisionForDispatch({ accepted: dispatched.accepted, runtimeAvailable: dispatched.runtime.status === "CONFIGURED" });
  decision = await updateLunaAutonomousDecision({
    userId: input.userId,
    decisionId: decision.id,
    missionId: dispatched.mission.id,
    status: transition.status,
    outcome: transition.outcome,
    actor: "luna:autonomy",
    reason: dispatched.accepted
      ? "Configured durable runtime returned a real queue run ID for the linked mission."
      : `Durable dispatch did not receive a run ID: ${dispatched.runtime.detail}`,
  });
  await recordLunaRuntimeEvent({
    userId: input.userId,
    action: dispatched.accepted ? "AUTONOMOUS_MISSION_DISPATCHED" : "AUTONOMOUS_MISSION_BLOCKED",
    subjectType: "DECISION",
    subjectId: decision.id,
    missionId: dispatched.mission.id,
    actor: "luna:autonomy",
    detail: {
      decisionKey: decision.decisionKey,
      outcome: decision.outcome,
      runtimeProvider: dispatched.runtime.provider,
      runtimeStatus: dispatched.runtime.status,
      runtimeRunId: dispatched.mission.runtimeRunId,
      providerMessage: dispatched.runtime.detail,
    },
  });
  return { accepted: dispatched.accepted, reason: dispatched.runtime.detail, decision, mission: dispatched.mission, runtime: dispatched.runtime };
}
