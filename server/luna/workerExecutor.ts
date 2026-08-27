import { workerContract, type LunaWorkerRole } from "@shared/lunaCognitive";
import { shouldCreateMemoryRevision, shouldExerciseCancellationCheckpoints, shouldInjectControlledRetry } from "./acceptanceControls";
import { createKnowledgeObject } from "../knowledgeSpace/supabase";
import { retrieveLunaContext } from "./cognitiveService";
import { invokeLunaControlledTool } from "./controlledTools";
import { getLunaModel, type LunaModel } from "./model";
import { assessLunaWorkerResult } from "./learningService";
import {
  createLunaAttention,
  createLunaMemory,
  createOrGetLunaResultValidation,
  createLunaToolCall,
  getLunaCognitiveSnapshot,
  updateLunaMission,
  updateLunaTask,
  updateLunaToolCall,
  updateLunaWorker,
  updateLunaMemory,
  recordLunaRuntimeEvent,
} from "./supabase";

const REPORT_CHARACTER_LIMIT = 18_000;
const ACCEPTANCE_CANCELLATION_WINDOW_MS = 2_500;

/** A cooperative, terminal stop—not a retriable worker failure. */
export class LunaWorkerCancellationError extends Error {
  constructor(readonly stage: string) {
    super(`Luna worker stopped at cancellation checkpoint: ${stage}.`);
    this.name = "LunaWorkerCancellationError";
  }
}

export function isLunaWorkerCancellationError(error: unknown): error is LunaWorkerCancellationError {
  return error instanceof LunaWorkerCancellationError;
}

async function assertWorkerNotCancelled(input: { userId: number; missionId: string; workerId: string; stage: string }) {
  const snapshot = await getLunaCognitiveSnapshot(input.userId);
  const mission = snapshot.missions.find(item => item.id === input.missionId);
  const worker = snapshot.workers.find(item => item.id === input.workerId && item.missionId === input.missionId);
  if (!mission || !worker || mission.cancelRequested || mission.status === "CANCELLED" || worker.state === "CANCELLED") {
    await recordLunaRuntimeEvent({
      userId: input.userId,
      action: "WORKER_CANCELLED_CHECKPOINT",
      subjectType: "WORKER",
      subjectId: input.workerId,
      missionId: input.missionId,
      workerId: input.workerId,
      actor: "luna:worker",
      detail: { stage: input.stage, guarantee: "No further worker side effect is attempted after persisted cancellation is observed." },
    });
    throw new LunaWorkerCancellationError(input.stage);
  }
}

export type LunaWorkerExecutionResult = {
  workerId: string;
  taskId: string | null;
  reportObjectId: string | null;
  resultSummary: string;
  modelRequestUsed: boolean;
};

function workerPrompt(input: { role: LunaWorkerRole; objective: string; task: string; context: string }) {
  const contract = workerContract(input.role);
  return `You are the ${input.role} software worker in Luna's durable Knowledge Space. Your purpose is: ${contract.purpose}

Use only the supplied persisted context. Do not browse, claim external retrieval, invent sources, use hidden reasoning, or create an authoritative scientific conclusion. Treat every result as INFERENCE unless it directly quotes a supplied provider/published source, and do not promote any result to FACT, EVIDENCE, VALIDATED, or PROVIDER_CONFIRMED.

Scientific and operational boundaries are mandatory: the HRA visual GLB → MNI ICBM 152 2009c relationship remains NOT_ESTABLISHED; HRA → Julich is not established; Julich ontology mapping remains 0 authoritative / 0 probabilistic / 0 requires-domain-review / 102 unmapped. Do not propose coordinates, transforms, clinical conclusions, biological targeting, physical nanotechnology, cellular or molecular operation. Software workers are not physical nanobots.

Mission objective: ${input.objective}
Task: ${input.task}

${input.context}

Return a concise, factual working report with these headings: Retained context; Inferences; Open questions; Next non-authoritative step. Do not report completion unless the supplied task can actually be completed from this context.`;
}

function deterministicWorkerResult(input: { role: LunaWorkerRole; objective: string; contextCount: number }) {
  return [
    "Retained context",
    `${input.role} retrieved ${input.contextCount} durable context record(s) for the objective: ${input.objective}`,
    "Inferences",
    "No external source query or scientific authority claim was made by this deterministic worker step.",
    "Open questions",
    "A configured research/provider tool and a verified durable runtime are required before external evidence collection can be claimed.",
    "Next non-authoritative step",
    "Persist this bounded handoff for the next eligible worker role.",
  ].join("\n\n");
}

/**
 * Executes one worker step when, and only when, a configured durable runtime invokes it.
 * It is not registered as an ordinary browser/API operation.
 */
export async function executeLunaWorkerStep(input: { userId: number; missionId: string; workerId: string; model?: LunaModel }): Promise<LunaWorkerExecutionResult> {
  const snapshot = await getLunaCognitiveSnapshot(input.userId);
  const mission = snapshot.missions.find(item => item.id === input.missionId);
  const worker = snapshot.workers.find(item => item.id === input.workerId && item.missionId === input.missionId);
  if (!mission || !worker) throw new Error("Persisted Luna mission or worker is unavailable.");
  if (mission.cancelRequested || mission.status === "CANCELLED") throw new Error("Cancelled Luna mission cannot execute a worker step.");
  if (mission.pauseRequested || mission.status === "PAUSED") throw new Error("Paused Luna mission cannot execute a worker step.");
  if (!["QUEUED", "WAITING", "PAUSED"].includes(worker.state)) throw new Error("Only a queued, waiting, or paused worker can execute a durable step.");
  const task = worker.taskId ? snapshot.tasks.find(item => item.id === worker.taskId) ?? null : null;
  if (task && !["ELIGIBLE", "PENDING"].includes(task.status)) throw new Error("Worker task is not eligible for execution.");

  const workerActor = `luna:${worker.role.toLowerCase()}`;
  await updateLunaWorker({ userId: input.userId, workerId: worker.id, missionId: mission.id, state: "RUNNING", actor: workerActor });
  if (task) await updateLunaTask({ userId: input.userId, taskId: task.id, status: "IN_PROGRESS", actor: workerActor, reason: "Worker started a durable task step." });
  await recordLunaRuntimeEvent({ userId: input.userId, action: "WORKER_EXECUTION_ACTIVE", subjectType: "WORKER", subjectId: worker.id, missionId: mission.id, workerId: worker.id, actor: workerActor, detail: { role: worker.role, safeCheckpoint: "before_context_retrieval" } });
  if (shouldExerciseCancellationCheckpoints(mission.objective)) {
    await recordLunaRuntimeEvent({ userId: input.userId, action: "ACCEPTANCE_CANCELLATION_WINDOW", subjectType: "WORKER", subjectId: worker.id, missionId: mission.id, workerId: worker.id, actor: "luna:acceptance", detail: { control: "CANCELLATION_CHECKPOINTS", stage: "before_first_side_effect", delayMs: ACCEPTANCE_CANCELLATION_WINDOW_MS } });
    await new Promise(resolve => setTimeout(resolve, ACCEPTANCE_CANCELLATION_WINDOW_MS));
  }
  await assertWorkerNotCancelled({ userId: input.userId, missionId: mission.id, workerId: worker.id, stage: "before_context_retrieval" });
  if (shouldInjectControlledRetry({ objective: mission.objective, activity: snapshot.activity, workerId: worker.id })) {
    const failure = "Luna acceptance control: deliberate first delivery failure after persisted worker start.";
    await updateLunaWorker({ userId: input.userId, workerId: worker.id, missionId: mission.id, state: "FAILED", errorMessage: failure, actor: "luna:acceptance" });
    if (task) await updateLunaTask({ userId: input.userId, taskId: task.id, status: "RECOVERY_REQUIRED", errorMessage: failure, actor: "luna:acceptance", reason: "Acceptance control recorded an intentional worker interruption before Queue retry." });
    await recordLunaRuntimeEvent({ userId: input.userId, action: "ACCEPTANCE_CONTROLLED_FAILURE", subjectType: "WORKER", subjectId: worker.id, missionId: mission.id, workerId: worker.id, actor: "luna:acceptance", detail: { control: "RETRY_ONCE", stage: "after_worker_started", guarantee: "The error is rethrown to QueueClient.handleNodeCallback so Vercel Queues, not a direct database mutation, schedules the retry." } });
    throw new Error(failure);
  }
  const toolCall = await createLunaToolCall({ userId: input.userId, missionId: mission.id, workerId: worker.id, toolName: "retrieve_persisted_context", toolClass: "KNOWLEDGE", requestSummary: "Retrieve bounded source-ranked Luna memory for a persisted worker task.", actor: `luna:${worker.role.toLowerCase()}` });
  await updateLunaToolCall({ userId: input.userId, missionId: mission.id, toolCallId: toolCall.id, status: "RUNNING", actor: `luna:${worker.role.toLowerCase()}` });

  try {
    const query = `${mission.objective} ${task?.title ?? worker.role}`;
    const context = await retrieveLunaContext({ userId: input.userId, query, projectId: mission.projectId, limit: 8 });
    const knowledgeContext = await invokeLunaControlledTool({ userId: input.userId, role: worker.role, toolName: "retrieve_knowledge_space", query });
    const promptContext = `${context.promptContext}\n\n${knowledgeContext.promptContext}`.slice(0, 18_000);
    await updateLunaToolCall({ userId: input.userId, missionId: mission.id, toolCallId: toolCall.id, status: "COMPLETED", resultSummary: `Retrieved ${context.memories.length} bounded cognitive memory record(s). ${knowledgeContext.resultSummary}`, actor: `luna:${worker.role.toLowerCase()}` });

    const model = input.model ?? getLunaModel();
    let output: string;
    let modelRequestUsed = false;
    let estimatedTokens = 0;
    const modelBudgetAvailable = mission.modelRequestsUsed < mission.maxModelRequests && mission.tokenUsage < mission.maxTokenBudget;
    if (["MEMORY_AGENT", "MAINTENANCE_AGENT", "PLANNER_AGENT"].includes(worker.role) || !modelBudgetAvailable) {
      output = deterministicWorkerResult({ role: worker.role, objective: mission.objective, contextCount: context.memories.length });
    } else if (!model.isConfigured()) {
      output = deterministicWorkerResult({ role: worker.role, objective: mission.objective, contextCount: context.memories.length });
      await createLunaAttention({ userId: input.userId, missionId: mission.id, severity: "WARNING", category: "SYSTEM", title: "Luna model is unavailable", detail: `${worker.role} completed its deterministic persisted-context handoff but did not request a model because no server-side model provider is configured.`, actor: `luna:${worker.role.toLowerCase()}` });
    } else {
      const modelTrace = await createLunaToolCall({ userId: input.userId, missionId: mission.id, workerId: worker.id, toolName: "generate_bounded_worker_report", toolClass: "KNOWLEDGE", requestSummary: "Generate a bounded inferred working report from persisted context only.", provider: model.provider, rateLimitKey: `${model.provider}:mission`, actor: `luna:${worker.role.toLowerCase()}` });
      await updateLunaToolCall({ userId: input.userId, missionId: mission.id, toolCallId: modelTrace.id, status: "RUNNING", actor: `luna:${worker.role.toLowerCase()}` });
      const response = await model.generate({ messages: [{ role: "user", content: workerPrompt({ role: worker.role, objective: mission.objective, task: task?.details || worker.inputSummary, context: promptContext }) }] });
      output = response.content; modelRequestUsed = true; estimatedTokens = response.estimatedTokens;
      await updateLunaToolCall({ userId: input.userId, missionId: mission.id, toolCallId: modelTrace.id, status: "COMPLETED", resultSummary: `Generated bounded report using ${response.provider}/${response.model}; estimated payload tokens ${response.estimatedTokens}.`, actor: `luna:${worker.role.toLowerCase()}` });
    }

    const contract = workerContract(worker.role);
    if (!contract.allowedOutputs.includes("REPORT")) throw new Error(`${worker.role} is not permitted to create a worker handoff report.`);
    await assertWorkerNotCancelled({ userId: input.userId, missionId: mission.id, workerId: worker.id, stage: "before_report_persistence" });
    const report = await createKnowledgeObject({
      userId: input.userId, objectType: "NOTE", title: `Software worker handoff — ${worker.role.replace(/_/g, " ")}: ${mission.objective.slice(0, 150)}`,
      description: "Persisted software-worker handoff. This is a Luna-owned inferred working report, not provider evidence or scientific authority.",
      content: output.slice(0, REPORT_CHARACTER_LIMIT), sourceType: "AI_INFERENCE", truthState: "INFERRED",
      tags: ["luna-worker", worker.role.toLowerCase().replace(/_/g, "-"), "inferred"],
      provenance: { provider: "Luna durable worker", retrievedAt: new Date().toISOString(), note: `Mission ${mission.id}. Produced from bounded persisted context. No unrecorded external retrieval is represented.` },
      actor: workerActor,
      cognitiveMissionId: mission.id,
      reason: "Bounded software-worker handoff persisted from durable mission context.",
    });
    const resultAssessment = assessLunaWorkerResult(output);
    const validation = await createOrGetLunaResultValidation({
      userId: input.userId, missionId: mission.id, workerId: worker.id, reportObjectId: report.id,
      status: resultAssessment.status, outputHash: resultAssessment.outputHash, resultSummary: resultAssessment.resultSummary,
      checks: resultAssessment.checks, detail: resultAssessment.detail, actor: "luna:validator",
    });
    if (validation.validation.status !== "ACCEPTED") {
      await createLunaAttention({
        userId: input.userId, missionId: mission.id, severity: "WARNING", category: "KNOWLEDGE_GAP",
        title: "Luna worker result requires validation review", detail: validation.validation.detail, actor: "luna:validator",
      });
    }
    if (contract.allowedOutputs.includes("MEMORY") && validation.validation.status === "ACCEPTED") {
      const memory = await createLunaMemory({ userId: input.userId, memoryKind: "RESEARCH", content: `${worker.role} completed a validated persisted handoff for mission ${mission.id}: ${output.slice(0, 1_400)}`, importance: 3, truthState: "INFERENCE", sourceType: "LUNA", sourceObjectIds: [report.id], projectId: mission.projectId, missionId: mission.id, tags: ["worker-handoff", "validated-inference", worker.role.toLowerCase()], actor: workerActor });
      if (worker.role === "MEMORY_AGENT" && shouldCreateMemoryRevision({ objective: mission.objective, activity: snapshot.activity, workerId: worker.id })) {
        const revised = await updateLunaMemory({ userId: input.userId, memoryId: memory.id, content: `${memory.content}\n\nAutonomous acceptance revision: this non-scientific, Luna-owned test record was updated by the bounded worker and remains an INFERENCE.`, actor: "luna:acceptance", reason: "Autonomous memory version-and-rollback acceptance control." });
        await recordLunaRuntimeEvent({ userId: input.userId, action: "ACCEPTANCE_MEMORY_REVISION", subjectType: "MEMORY", subjectId: revised.id, missionId: mission.id, workerId: worker.id, actor: "luna:acceptance", detail: { control: "MEMORY_REVISION_ONCE", fromVersion: memory.currentVersion, toVersion: revised.currentVersion, truthState: "INFERENCE" } });
      }
    }
    await assertWorkerNotCancelled({ userId: input.userId, missionId: mission.id, workerId: worker.id, stage: "before_completion" });
    const nextWorker = snapshot.workers.find(item => item.missionId === mission.id && item.id !== worker.id && item.state === "QUEUED") ?? null;
    await updateLunaWorker({ userId: input.userId, workerId: worker.id, missionId: mission.id, state: "COMPLETED", outputSummary: output.slice(0, 1_200), handoffToRole: nextWorker?.role ?? null, actor: workerActor });
    if (task) await updateLunaTask({ userId: input.userId, taskId: task.id, status: "COMPLETED", actor: `luna:${worker.role.toLowerCase()}`, reason: "Worker completed a persisted bounded handoff." });
    await updateLunaMission({ userId: input.userId, missionId: mission.id, status: "RUNNING", currentFocus: nextWorker ? `Awaiting ${nextWorker.role} handoff` : "Awaiting durable task-graph evaluation", modelRequestsUsed: mission.modelRequestsUsed + (modelRequestUsed ? 1 : 0), tokenUsage: mission.tokenUsage + estimatedTokens, actor: `luna:${worker.role.toLowerCase()}`, reason: `Worker result, report, validation, and bounded learning records were persisted with validation status ${validation.validation.status}.` });
    return { workerId: worker.id, taskId: task?.id ?? null, reportObjectId: report.id, resultSummary: output.slice(0, 1_200), modelRequestUsed };
  } catch (error) {
    if (isLunaWorkerCancellationError(error)) throw error;
    const detail = error instanceof Error ? error.message : "Worker failed without an error message.";
    await updateLunaWorker({ userId: input.userId, workerId: worker.id, missionId: mission.id, state: "FAILED", errorMessage: detail, actor: `luna:${worker.role.toLowerCase()}` }).catch(() => undefined);
    if (task) await updateLunaTask({ userId: input.userId, taskId: task.id, status: "RECOVERY_REQUIRED", errorMessage: detail, actor: `luna:${worker.role.toLowerCase()}`, reason: "Worker failed; task requires recovery or reassignment." }).catch(() => undefined);
    await updateLunaMission({ userId: input.userId, missionId: mission.id, status: "RECOVERY_REQUIRED", currentFocus: "Worker recovery required", errorMessage: detail, actor: `luna:${worker.role.toLowerCase()}`, reason: "Worker failure was persisted for durable recovery." }).catch(() => undefined);
    await createLunaAttention({ userId: input.userId, missionId: mission.id, severity: "ACTION_REQUIRED", category: "MISSION", title: `${worker.role} worker failed`, detail, actor: `luna:${worker.role.toLowerCase()}` }).catch(() => undefined);
    throw error;
  }
}
