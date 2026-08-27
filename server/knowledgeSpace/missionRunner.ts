import { chatWithOllama } from "../agent/ollama";
import {
  appendKnowledgeMissionActivity,
  createKnowledgeObject,
  getKnowledgeMissionForUser,
  getKnowledgeObjectForUser,
  updateKnowledgeMission,
} from "./supabase";

const REPORT_LIMIT = 18_000;

function presentContext(object: Awaited<ReturnType<typeof getKnowledgeObjectForUser>>) {
  if (!object) return "No individual target object was selected. Work at the Knowledge Space level using the stated mission objective only.";
  return [
    `Title: ${object.title}`,
    `Object type: ${object.objectType}`,
    `Source type: ${object.sourceType}`,
    `Truth state: ${object.truthState}`,
    `Description: ${object.description || "(none)"}`,
    `Working content: ${object.content || "(none)"}`,
    `Scientific context: ${JSON.stringify(object.scientificMetadata)}`,
    `Provenance: ${JSON.stringify(object.provenance)}`,
  ].join("\n");
}

export function createKnowledgeWorkerReportPrompt(input: { objective: string; role: string; context: string }) {
  return `You are a bounded Knowledge Space worker in SenotaAI. Your role is ${input.role}. Produce a concise working report strictly from the workspace context below. Do not browse, fetch, claim access to, or invent external sources. Do not change any record yourself. Do not promote an inference to VERIFIED or PROVIDER_CONFIRMED. Distinguish facts supplied in the context from proposed inferences and open questions.

Scientific safety is mandatory. The HRA visual GLB has P33 registration status NOT_ESTABLISHED for MNI ICBM 152 2009c Nonlinear Asymmetric. Julich structure mapping is separate from spatial registration and remains 0 authoritative / 0 probabilistic / 0 requires-domain-review / 102 unmapped. The worker must not propose a transform, targeting coordinate, medical use, physical nanotechnology, tissue/cellular/molecular intervention, or biological capability. A Knowledge Space object is not a biological target.

Write in these sections when applicable: Summary; Evidence retained; Inferences (explicitly labeled); Open questions or contradictions; Suggested non-authoritative next steps. If source evidence is missing, say so plainly.

Mission objective:
${input.objective}

Workspace context:
${input.context}`;
}

/**
 * Runs one strictly bounded, user-dispatched knowledge mission.
 * It creates a separate inferred report; it never mutates source/provider objects or scientific truth states.
 */
export async function runKnowledgeMission(userId: number, missionId: string) {
  const mission = await getKnowledgeMissionForUser(userId, missionId);
  if (!mission) throw new Error("Knowledge worker mission was not found in this owner workspace.");
  if (mission.stopRequested || mission.state === "CANCELLED") {
    throw new Error("Knowledge worker mission is stopped.");
  }
  if (mission.state !== "QUEUED") {
    throw new Error("Only a queued Knowledge Space mission may be started.");
  }
  if (mission.currentStep >= mission.maxSteps || mission.maxSpawnedWorkers !== 1) {
    await updateKnowledgeMission({ userId, missionId, state: "MISSION_LIMIT_REACHED", currentStep: mission.currentStep });
    await appendKnowledgeMissionActivity({
      userId,
      missionId,
      workerRole: mission.workerRole,
      eventType: "MISSION_LIMIT_REACHED",
      message: "The mission did not run because its bounded execution limits were reached or invalid.",
    });
    throw new Error("Knowledge worker mission limits were reached.");
  }

  const startedAt = Date.now();
  await updateKnowledgeMission({ userId, missionId, state: "RESEARCHING", currentStep: 1 });
  await appendKnowledgeMissionActivity({
    userId,
    missionId,
    workerRole: mission.workerRole,
    eventType: "MISSION_STARTED",
    message: `${mission.workerRole.replace(/_/g, " ")} began a bounded on-demand knowledge review.`,
    detail: { maxSteps: mission.maxSteps, maxDurationSeconds: mission.maxDurationSeconds, maxSpawnedWorkers: mission.maxSpawnedWorkers },
  });

  try {
    const latest = await getKnowledgeMissionForUser(userId, missionId);
    if (!latest || latest.stopRequested) throw new Error("Knowledge worker mission was stopped before work began.");
    const target = mission.targetObjectId ? await getKnowledgeObjectForUser(userId, mission.targetObjectId) : null;
    const result = await chatWithOllama({
      messages: [{ role: "user", content: createKnowledgeWorkerReportPrompt({ objective: mission.objective, role: mission.workerRole, context: presentContext(target) }) }],
    });
    const elapsedSeconds = (Date.now() - startedAt) / 1_000;
    const afterModel = await getKnowledgeMissionForUser(userId, missionId);
    if (!afterModel || afterModel.stopRequested) throw new Error("Knowledge worker mission was stopped before report creation.");
    if (elapsedSeconds > mission.maxDurationSeconds) {
      await updateKnowledgeMission({ userId, missionId, state: "MISSION_LIMIT_REACHED", currentStep: mission.currentStep + 1, errorMessage: "Maximum mission duration elapsed before the report could be persisted." });
      await appendKnowledgeMissionActivity({ userId, missionId, workerRole: mission.workerRole, eventType: "MISSION_LIMIT_REACHED", message: "The mission reached its maximum duration before it could persist a report." });
      throw new Error("Knowledge worker mission reached its maximum duration.");
    }

    await updateKnowledgeMission({ userId, missionId, state: "REPORTING", currentStep: 2 });
    const report = await createKnowledgeObject({
      userId,
      objectType: "NANOBOT_REPORT",
      title: `${mission.workerRole.replace(/_/g, " ")} report: ${mission.objective.slice(0, 150)}`,
      description: "On-demand Knowledge Space worker report. This output is an explicitly inferred working document; it does not modify provider evidence, scientific identity, spatial registration, or biological capability.",
      content: result.content.slice(0, REPORT_LIMIT),
      sourceType: "AI_INFERENCE",
      truthState: "INFERRED",
      tags: ["knowledge-worker", mission.workerRole.toLowerCase().replace(/_/g, "-"), "inferred"],
      provenance: {
        provider: "SenotaAI Knowledge Worker",
        retrievedAt: new Date().toISOString(),
        note: `Generated from the selected Knowledge Space context for mission ${mission.id}; no provider query or external browse was performed.`,
      },
    });
    await updateKnowledgeMission({ userId, missionId, state: "COMPLETED", currentStep: 3, reportObjectId: report.id });
    await appendKnowledgeMissionActivity({
      userId,
      missionId,
      workerRole: mission.workerRole,
      eventType: "MISSION_COMPLETED",
      message: "The worker saved an inferred report to Knowledge Space. Source records and authoritative scientific state were not changed.",
      detail: { reportObjectId: report.id, elapsedSeconds: Number(elapsedSeconds.toFixed(2)) },
    });
    return { missionId, report };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Knowledge worker failed without a report.";
    const current = await getKnowledgeMissionForUser(userId, missionId).catch(() => null);
    if (current && !["COMPLETED", "MISSION_LIMIT_REACHED", "CANCELLED"].includes(current.state)) {
      await updateKnowledgeMission({ userId, missionId, state: "FAILED", errorMessage: message, currentStep: Math.min(current.currentStep + 1, current.maxSteps) }).catch(() => undefined);
      await appendKnowledgeMissionActivity({ userId, missionId, workerRole: mission.workerRole, eventType: "MISSION_FAILED", message: `The worker did not create a report: ${message}` }).catch(() => undefined);
    }
    throw error;
  }
}
