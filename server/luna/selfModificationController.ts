import {
  assertSelfModificationTransition,
  type SelfModificationExecutionState,
  type SelfModificationRun,
  type SelfModificationTransitionEvidence,
  type SelfModificationWorkerJob,
} from "./selfModification";
import { transitionLunaSelfModificationRun } from "./supabase";

export function createBoundedSelfModificationJob(run: SelfModificationRun, input: { workspaceRef: string; allowedPaths: string[] }): SelfModificationWorkerJob {
  if (run.status !== "ACCEPTED_FOR_EXECUTION" && run.status !== "WORKER_PENDING") {
    throw new Error(`A worker job can only be prepared for an accepted self-modification run, not ${run.status}.`);
  }
  if (!input.workspaceRef.trim()) throw new Error("A bounded worker workspace reference is required.");
  if (input.allowedPaths.length < 1 || input.allowedPaths.length > run.limits.maxChangedFiles) {
    throw new Error("The bounded worker path set is outside the run limits.");
  }
  return { runId: run.id, workspaceRef: input.workspaceRef, objective: run.objective, allowedPaths: [...new Set(input.allowedPaths)], limits: run.limits as SelfModificationWorkerJob["limits"] };
}

export async function transitionSelfModificationExecution(input: { userId: number; runId: string; from: SelfModificationExecutionState; to: SelfModificationExecutionState; evidence?: SelfModificationTransitionEvidence; actor?: string }) {
  assertSelfModificationTransition(input.from, input.to, input.evidence);
  return transitionLunaSelfModificationRun({ userId: input.userId, runId: input.runId, to: input.to, evidence: input.evidence, actor: input.actor ?? "luna:self-modification-controller" });
}
