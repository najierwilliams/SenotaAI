import { describe, expect, it, vi } from "vitest";
import { assertSelfModificationTransition } from "./selfModification";
import { createBoundedSelfModificationJob } from "./selfModificationController";

vi.mock("./supabase", () => ({ transitionLunaSelfModificationRun: vi.fn() }));

const run = {
  id: "run-1", workspaceId: "workspace-1", objective: "Improve the bounded application path safely", reason: "A focused owner-approved improvement is required.", status: "ACCEPTED_FOR_EXECUTION" as const,
  previousVersion: "v1", candidateVersion: null, rollbackAvailable: true, limits: { maxChangedFiles: 12 }, safetyResult: {}, deploymentResult: {}, rollbackResult: {}, outcome: null,
  initiatedBy: "owner", workerJobId: null, workerWorkspaceRef: null, workerResult: {}, validationResult: {}, safetyDecision: {}, healthCheckResult: {}, acceptedAt: null, workerPendingAt: null, workerStartedAt: null, workerCompletedAt: null, validationAt: null, safetyAt: null, deploymentAuthorizedAt: null, deployingAt: null, deployedAt: null, healthCheckedAt: null, rollbackCompletedAt: null, createdAt: "now", updatedAt: "now",
};

describe("Luna self-modification execution controller", () => {
  it("accepts the bounded proposal-to-worker lifecycle and requires worker evidence", () => {
    expect(assertSelfModificationTransition("PROPOSED", "ACCEPTED_FOR_EXECUTION", { eligibleProposal: true })).toBe(true);
    expect(assertSelfModificationTransition("ACCEPTED_FOR_EXECUTION", "WORKER_PENDING")).toBe(true);
    expect(() => assertSelfModificationTransition("WORKER_RUNNING", "WORKER_COMPLETED")).toThrow("structured worker result");
    expect(assertSelfModificationTransition("WORKER_RUNNING", "WORKER_COMPLETED", {
      workerJobId: "job-1", workerWorkspaceRef: "isolated://job-1", workerResult: { jobId: "job-1", workspaceRef: "isolated://job-1", status: "COMPLETED", files: [], tests: [] },
    })).toBe(true);
  });

  it("rejects invalid transitions and execution without an eligible proposal", () => {
    expect(() => assertSelfModificationTransition("PROPOSED", "WORKER_RUNNING")).toThrow("Invalid self-modification transition");
    expect(() => assertSelfModificationTransition("PROPOSED", "ACCEPTED_FOR_EXECUTION")).toThrow("eligible persisted proposal");
    expect(() => createBoundedSelfModificationJob({ ...run, status: "PROPOSED" }, { workspaceRef: "isolated://job-1", allowedPaths: ["client/src/App.tsx"] })).toThrow("accepted self-modification run");
  });

  it("requires independent safety and actual deployment evidence", () => {
    expect(() => assertSelfModificationTransition("AWAITING_SAFETY", "DEPLOYMENT_AUTHORIZED", { safetyDecision: { approved: false, authority: "external", decisionId: "decision-1" } })).toThrow("independent approved safety decision");
    expect(assertSelfModificationTransition("AWAITING_SAFETY", "DEPLOYMENT_AUTHORIZED", { safetyDecision: { approved: true, authority: "external-safety", decisionId: "decision-1" } })).toBe(true);
    expect(() => assertSelfModificationTransition("DEPLOYING", "DEPLOYED")).toThrow("deployment result");
    expect(() => assertSelfModificationTransition("DEPLOYED", "HEALTH_CHECK_FAILED")).toThrow("health-check result");
    expect(() => assertSelfModificationTransition("HEALTH_CHECK_FAILED", "ROLLED_BACK")).toThrow("rollback result");
  });

  it("creates only a bounded worker job and preserves the run objective and allowed paths", () => {
    const job = createBoundedSelfModificationJob(run, { workspaceRef: "isolated://job-1", allowedPaths: ["client/src/App.tsx", "server/example.ts"] });
    expect(job).toMatchObject({ runId: "run-1", workspaceRef: "isolated://job-1", objective: run.objective, allowedPaths: ["client/src/App.tsx", "server/example.ts"] });
  });
});
