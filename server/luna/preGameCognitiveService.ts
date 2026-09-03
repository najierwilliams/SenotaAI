import { createHash } from "node:crypto";
import type { LunaCognitiveInputType, LunaWorldEventInput } from "@shared/lunaCognitive";
import {
  allocateLunaFocus,
  assessLunaCognitiveInput,
  canPromoteInferredSelfModel,
  deriveInternalStateChanges,
  isWithinCooldown,
  LUNA_COGNITIVE_COOLDOWN_MS,
  LUNA_COGNITIVE_MAX_DERIVATIONS_PER_CYCLE,
  LUNA_COGNITIVE_MAX_ITEMS_PER_CYCLE,
  maintenanceStopsAfter,
  normalizeLunaCognitiveText,
} from "./preGameCognitive";
import {
  createLunaInternalStateObservation,
  createLunaLearningRecord,
  createLunaMemory,
  listLunaMemories,
  createLunaMaintenanceReport,
  createLunaReasoningArtifact,
  createLunaSocialInteraction,
  createLunaKnowledgeGap,
  addLunaSelfModelEvidence,
  createOrGetLunaCognitiveInput,
  createOrGetLunaCognitiveCycle,
  createOrGetLunaExperience,
  createOrGetLunaNovelty,
  createOrGetLunaRelationship,
  createOrGetLunaWorldEvent,
  createOrUpdateLunaContradiction,
  createOrUpdateLunaAttentionAssessment,
  createOrUpdateLunaCuriosityAssessment,
  createOrUpdateLunaGapProfile,
  createOrUpdateLunaSelfModelFact,
  createOrUpdateLunaUncertainty,
  getLunaCognitiveSnapshot,
  listLunaPreGameCognitiveSnapshot,
  replaceLunaFocusAssignments,
} from "./supabase";
import { lunaMem0Adapter } from "./mem0Adapter";

function deterministicKey(prefix: string, values: string[]) {
  return `${prefix}:${createHash("sha256").update(values.join("\u001f")).digest("hex")}`;
}

function derivedCountFor(assessment: ReturnType<typeof assessLunaCognitiveInput>) {
  if (assessment.relevance !== "RELEVANT") return 0;
  return Math.min(
    LUNA_COGNITIVE_MAX_DERIVATIONS_PER_CYCLE,
    6 + (assessment.detectedQuestion ? 2 : 0) + (assessment.detectedCorrection ? 2 : 0),
  );
}

async function processMem0Candidates(input: { userId: number; workspaceId: string; sourceInputId: string; experienceId: string; experienceSummary: string; experienceKind: string; projectId: string | null; missionId: string | null; importance: number; confidence: number; actor: string }) {
  const candidates = await lunaMem0Adapter.addExperience({
    workspaceId: input.workspaceId,
    messages: input.experienceSummary,
    sourceType: "LUNA_EXPERIENCE",
    sourceId: input.experienceId,
    metadata: { sourceInputId: input.sourceInputId, experienceKind: input.experienceKind },
  });
  if (!candidates.length) return { accepted: 0, rejected: 0 };
  const existing = await listLunaMemories(input.userId, 200);
  const existingContent = new Set(existing.map(memory => normalizeLunaCognitiveText(memory.content)));
  let accepted = 0;
  let rejected = 0;
  for (const candidate of candidates.slice(0, 8)) {
    const content = candidate.content.replace(/\s+/g, " ").trim();
    const normalized = normalizeLunaCognitiveText(content);
    if (content.length < 3 || content.length > 16_000 || !normalized || existingContent.has(normalized)) {
      rejected += 1;
      continue;
    }
    const memory = await createLunaMemory({
      userId: input.userId,
      memoryKind: "EPISODIC",
      content,
      importance: input.importance,
      truthState: "PROPOSED",
      sourceType: "LUNA",
      sourceObjectIds: [input.sourceInputId, input.experienceId],
      projectId: input.projectId,
      missionId: input.missionId,
      tags: ["mem0-candidate", input.experienceKind.toLowerCase()],
      provenance: { method: "mem0-oss-candidate", note: `Mem0 candidate ${candidate.id} accepted by Luna validation; Mem0 is not authoritative.` },
      actor: input.actor,
    });
    await createLunaLearningRecord({
      userId: input.userId,
      learningKind: "PATTERN",
      sourceInputId: input.sourceInputId,
      experienceId: input.experienceId,
      targetType: "MEMORY",
      targetId: memory.id,
      summary: "A Mem0 candidate was accepted as proposed episodic memory after Luna validation and duplicate suppression.",
      confidenceDelta: 0,
      provenance: { method: "mem0-oss-candidate-acceptance", note: `Candidate ${candidate.id}; source experience ${input.experienceId}.` },
      actor: input.actor,
    });
    existingContent.add(normalized);
    accepted += 1;
  }
  return { accepted, rejected };
}

export type LunaInputIngestion = {
  userId: number;
  sourceKey?: string;
  inputType: LunaCognitiveInputType;
  content: string;
  participantIdentity?: string | null;
  projectId?: string | null;
  goalId?: string | null;
  missionId?: string | null;
  workerId?: string | null;
  declaredImportance?: number;
  declaredConfidence?: number;
  correctionTarget?: { type: string; id: string } | null;
  provenance?: Record<string, unknown>;
  actor?: string;
};

/**
 * Persists an actual source input and bounded deterministic derivatives. It deliberately
 * does not call the Queue, planner, worker executor, external tools, or model APIs.
 * It also never turns an ordinary conversation into a Luna memory automatically.
 */
export async function ingestLunaCognitiveInput(input: LunaInputIngestion) {
  const existing = await listLunaPreGameCognitiveSnapshot(input.userId);
  const sourceKey = input.sourceKey ?? deterministicKey("input", [input.inputType, input.participantIdentity ?? "owner", normalizeLunaCognitiveText(input.content)]);
  const assessment = assessLunaCognitiveInput({ content: input.content, existingNormalizedSummaries: existing.inputs.map(item => item.summary), declaredImportance: input.declaredImportance, declaredConfidence: input.declaredConfidence });
  const stored = await createOrGetLunaCognitiveInput({
    userId: input.userId,
    sourceKey,
    inputType: input.inputType,
    summary: assessment.summary,
    relevance: assessment.relevance,
    projectId: input.projectId ?? null,
    goalId: input.goalId ?? null,
    missionId: input.missionId ?? null,
    workerId: input.workerId ?? null,
    provenance: { ...(input.provenance ?? {}), method: "bounded-deterministic-input-assessment", participantIdentity: input.participantIdentity ?? null },
    actor: input.actor ?? "luna:input",
  });
  if (!stored.created) return { input: stored.input, assessment, created: false, derived: { experiences: 0, attention: 0, gaps: 0, curiosity: 0, learning: 0, focus: 0 } };

  const derivationCount = derivedCountFor(assessment);
  const cycle = await createOrGetLunaCognitiveCycle({
    userId: input.userId,
    cycleKey: deterministicKey("cycle", [sourceKey, "v1"]),
    cycleType: input.inputType === "CONVERSATION" ? "CONVERSATION" : input.inputType === "WORLD_EVENT" ? "WORLD_EVENT" : "MANUAL",
    inputId: stored.input.id,
    status: derivationCount >= LUNA_COGNITIVE_MAX_DERIVATIONS_PER_CYCLE ? "STOPPED" : "COMPLETED",
    evaluatedCount: 1,
    derivedCount: derivationCount,
    stopReason: derivationCount >= LUNA_COGNITIVE_MAX_DERIVATIONS_PER_CYCLE ? "Per-input derivation cap reached." : null,
    actor: input.actor ?? "luna:cycle",
  });

  if (assessment.relevance !== "RELEVANT") {
    return { input: stored.input, assessment, cycle: cycle.cycle, created: true, derived: { experiences: 0, attention: 0, gaps: 0, curiosity: 0, learning: 0, focus: 0 } };
  }

  const experience = await createOrGetLunaExperience({
    userId: input.userId,
    inputId: stored.input.id,
    experienceKind: input.inputType === "USER_CORRECTION" ? "CORRECTION" : input.inputType === "WORLD_EVENT" ? "WORLD_EVENT" : input.inputType === "WORKER_RESULT" ? "WORKER_OUTCOME" : input.inputType === "PROJECT_OUTCOME" ? "PROJECT_OUTCOME" : "CONVERSATION",
    summary: assessment.summary,
    importance: assessment.importance,
    confidence: assessment.confidence,
    projectId: input.projectId ?? null,
    goalId: input.goalId ?? null,
    missionId: input.missionId ?? null,
    workerId: input.workerId ?? null,
    provenance: { ...(input.provenance ?? {}), sourceInputId: stored.input.id },
    actor: input.actor ?? "luna:experience",
  });
  await createOrGetLunaNovelty({
    userId: input.userId,
    targetType: "EXPERIENCE",
    targetId: experience.experience.id,
    noveltyKey: deterministicKey("novelty", [input.inputType, normalizeLunaCognitiveText(input.content)]),
    score: assessment.noveltyScore,
    rationale: assessment.noveltyScore <= 0.1 ? "Exact normalized input was already known; novelty remains suppressed." : "Novelty is a bounded lexical/source-key assessment, not a factual claim.",
    sourceInputId: stored.input.id,
    actor: input.actor ?? "luna:novelty",
  });
  const uncertainty = await createOrUpdateLunaUncertainty({
    userId: input.userId,
    targetType: "EXPERIENCE",
    targetId: experience.experience.id,
    score: assessment.uncertaintyScore,
    importance: assessment.importance,
    evidenceBasis: assessment.reasoning.uncertaintySummary,
    provenance: { sourceInputId: stored.input.id, method: "declared-confidence-and-signal-assessment" },
    actor: input.actor ?? "luna:uncertainty",
    reason: "Input confidence and explicit correction/question signals were assessed deterministically.",
  });
  const attention = await createOrUpdateLunaAttentionAssessment({
    userId: input.userId,
    sourceType: "EXPERIENCE",
    sourceId: experience.experience.id,
    targetType: "EXPERIENCE",
    targetId: experience.experience.id,
    severity: assessment.attentionScore >= 0.85 ? "ACTION_REQUIRED" : assessment.attentionScore >= 0.55 ? "WARNING" : "INFO",
    score: assessment.attentionScore,
    factors: { importance: assessment.importance, uncertainty: assessment.uncertaintyScore, novelty: assessment.noveltyScore, risk: /\b(?:security|privacy|clinical|medical|physical|financial|destructive|account)\b/i.test(input.content) ? 1 : 0 },
    actor: input.actor ?? "luna:attention",
    reason: "Attention was derived from explicit importance, uncertainty, novelty, and risk factors.",
  });

  let gapCount = 0;
  let curiosityCount = 0;
  if (assessment.recommendedGapCategory) {
    const normalizedGapKey = deterministicKey("gap", [assessment.recommendedGapCategory, normalizeLunaCognitiveText(input.content)]);
    const duplicateProfile = existing.gapProfiles.find(profile => profile.normalizedKey === normalizedGapKey);
    if (!duplicateProfile) {
      const gap = await createLunaKnowledgeGap({
        userId: input.userId,
        title: assessment.recommendedGapCategory === "CONTRADICTION" ? "Source correction requires evidence review" : "Source context requires bounded review",
        question: input.content,
        rationale: assessment.reasoning.recommendation,
        severity: assessment.attentionScore >= 0.85 ? "ACTION_REQUIRED" : assessment.attentionScore >= 0.55 ? "WARNING" : "INFO",
        projectId: input.projectId ?? null,
        provenance: { sourceInputId: stored.input.id, cycleId: cycle.cycle.id, method: "bounded-input-gap-discovery" },
        sourceType: "LUNA",
        actor: input.actor ?? "luna:gap",
      });
      await createOrUpdateLunaGapProfile({
        userId: input.userId,
        gapId: gap.id,
        category: assessment.recommendedGapCategory,
        confidence: assessment.confidence,
        normalizedKey: normalizedGapKey,
        cooldownUntil: new Date(Date.now() + LUNA_COGNITIVE_COOLDOWN_MS).toISOString(),
        actor: input.actor ?? "luna:gap",
        reason: "A source-backed gap profile was created after duplicate suppression.",
      });
      gapCount = 1;
      if (assessment.detectedQuestion || assessment.detectedCorrection) {
        await createOrUpdateLunaCuriosityAssessment({
          userId: input.userId,
          gapId: gap.id,
          triggerType: "GAP",
          triggerId: gap.id,
          expectedInformationValue: assessment.uncertaintyScore,
          noveltyScore: assessment.noveltyScore,
          importance: assessment.importance,
          cooldownUntil: new Date(Date.now() + LUNA_COGNITIVE_COOLDOWN_MS).toISOString(),
          cycleId: cycle.cycle.id,
          rationale: "An unresolved source question or correction may justify bounded investigation after existing action policy review.",
          actor: input.actor ?? "luna:curiosity",
          reason: "Gap-based curiosity candidate created within the per-input cap.",
        });
        curiosityCount = 1;
      }
    }
  }

  const stateChanges = deriveInternalStateChanges(assessment);
  for (const state of stateChanges.slice(0, 4)) {
    await createLunaInternalStateObservation({ userId: input.userId, ...state, inputId: stored.input.id, experienceId: experience.experience.id, cycleId: cycle.cycle.id, actor: input.actor ?? "luna:state" });
  }
  await createLunaReasoningArtifact({
    userId: input.userId,
    cycleId: cycle.cycle.id,
    subjectType: "EXPERIENCE",
    subjectId: experience.experience.id,
    conclusion: assessment.reasoning.conclusion,
    confidence: assessment.confidence,
    uncertaintySummary: assessment.reasoning.uncertaintySummary,
    options: assessment.reasoning.options,
    recommendation: assessment.reasoning.recommendation,
    evidenceIds: [stored.input.id, experience.experience.id, uncertainty.id],
    actor: input.actor ?? "luna:reasoning",
  });

  let learningCount = 0;
  let mem0AcceptedCount = 0;
  let mem0RejectedCount = 0;
  const mem0Eligible = assessment.detectedCorrection || ["WORKER_RESULT", "PROJECT_OUTCOME", "WORLD_EVENT"].includes(input.inputType);
  if (mem0Eligible) {
    const processed = await processMem0Candidates({
      userId: input.userId,
      workspaceId: experience.experience.workspaceId,
      sourceInputId: stored.input.id,
      experienceId: experience.experience.id,
      experienceSummary: experience.experience.summary,
      experienceKind: experience.experience.experienceKind,
      projectId: experience.experience.projectId,
      missionId: experience.experience.missionId,
      importance: experience.experience.importance,
      confidence: experience.experience.confidence,
      actor: input.actor ?? "luna:mem0",
    });
    mem0AcceptedCount = processed.accepted;
    mem0RejectedCount = processed.rejected;
    learningCount += processed.accepted;
  }
  if (assessment.detectedCorrection) {
    await createLunaLearningRecord({
      userId: input.userId,
      learningKind: "CORRECTION",
      sourceInputId: stored.input.id,
      experienceId: experience.experience.id,
      targetType: input.correctionTarget?.type ?? "COGNITIVE_INPUT",
      targetId: input.correctionTarget?.id ?? stored.input.id,
      summary: "An explicit correction was retained. It reduces confidence only for the identified target; no claim winner is selected automatically.",
      confidenceDelta: -Math.min(0.5, assessment.uncertaintyScore),
      provenance: { sourceInputId: stored.input.id, correctionTarget: input.correctionTarget ?? null },
      actor: input.actor ?? "luna:learning",
    });
    learningCount = 1;
    if (input.correctionTarget) {
      await createOrUpdateLunaContradiction({
        userId: input.userId,
        anchorAType: input.correctionTarget.type,
        anchorAId: input.correctionTarget.id,
        anchorBType: "COGNITIVE_INPUT",
        anchorBId: stored.input.id,
        summary: "An owner-authorized source explicitly corrected the identified persisted target. The contradiction remains unresolved pending evidence review.",
        impact: assessment.attentionScore,
        projectId: input.projectId ?? null,
        goalId: input.goalId ?? null,
        provenance: { sourceInputId: stored.input.id, correctionTarget: input.correctionTarget },
        actor: input.actor ?? "luna:contradiction",
        reason: "Explicit user correction created a persistent contradiction record without selecting a winner.",
      });
    }
  }

  // Inferred self development is deliberately narrow and requires three distinct
  // source-backed experiences across at least two recorded cycles. It describes a
  // demonstrable computational operating pattern, not consciousness or personality.
  const comparable = existing.experiences.filter(item => item.experienceKind === experience.experience.experienceKind).slice(0, 2);
  const comparableInputIds = new Set([stored.input.id, ...comparable.map(item => item.inputId).filter((id): id is string => Boolean(id))]);
  const comparableCycles = new Set(existing.cycles.filter(item => item.inputId && comparableInputIds.has(item.inputId)).map(item => item.id));
  comparableCycles.add(cycle.cycle.id);
  const selfEvidenceCount = comparable.length + 1;
  if (canPromoteInferredSelfModel({ factKind: "INFERRED", evidenceCount: selfEvidenceCount, distinctCycleCount: comparableCycles.size, averageConfidence: (assessment.confidence + comparable.reduce((sum, item) => sum + item.confidence, 0)) / selfEvidenceCount })) {
    const fact = await createOrUpdateLunaSelfModelFact({
      userId: input.userId,
      factKind: "INFERRED",
      facet: `bounded_${experience.experience.experienceKind.toLowerCase()}_processing`,
      statement: `Luna has repeatedly processed ${experience.experience.experienceKind.toLowerCase()} source inputs as bounded, owner-scoped cognitive events.`,
      confidence: 0.7,
      evidenceCount: selfEvidenceCount,
      actor: input.actor ?? "luna:self-model",
      reason: "Repeated source-backed experiences across distinct cycles met the conservative inferred self-model threshold.",
    });
    for (const prior of [...comparable, experience.experience]) {
      await addLunaSelfModelEvidence({ userId: input.userId, selfFactId: fact.id, sourceType: "EXPERIENCE", sourceId: prior.id, cycleId: prior.id === experience.experience.id ? cycle.cycle.id : null, confidence: prior.confidence, actor: input.actor ?? "luna:self-model" });
    }
  }

  if (input.participantIdentity) {
    const relationship = await createOrGetLunaRelationship({ userId: input.userId, agentIdentity: "luna", participantIdentity: input.participantIdentity, actor: input.actor ?? "luna:relationship" });
    await createLunaSocialInteraction({ userId: input.userId, relationshipId: relationship.relationship.id, inputId: stored.input.id, experienceId: experience.experience.id, interactionKind: "CONVERSATION", summary: "A source-backed conversation interaction was observed; no social trait or outcome was fabricated.", impact: 0, provenance: { sourceInputId: stored.input.id }, actor: input.actor ?? "luna:relationship" });
  }

  const fresh = await listLunaPreGameCognitiveSnapshot(input.userId);
  const focus = allocateLunaFocus(fresh.attentionAssessments.filter(item => item.state === "ACTIVE"));
  const focusAssignments = await replaceLunaFocusAssignments({
    userId: input.userId,
    assignments: focus.map(item => {
      const source = fresh.attentionAssessments.find(attentionItem => attentionItem.id === item.attentionId);
      if (!source) throw new Error("Focus source assessment disappeared during deterministic allocation.");
      return { attentionId: item.attentionId, targetType: source.targetType, targetId: source.targetId, tier: item.tier, rank: item.rank, score: item.score };
    }),
    cycleId: cycle.cycle.id,
    actor: input.actor ?? "luna:attention",
  });

  return { input: stored.input, assessment, cycle: cycle.cycle, experience: experience.experience, attention, created: true, derived: { experiences: 1, attention: 1, gaps: gapCount, curiosity: curiosityCount, learning: learningCount, mem0Accepted: mem0AcceptedCount, mem0Rejected: mem0RejectedCount, focus: focusAssignments.length } };
}

/** World adapter ingress only; it records a neutral event and then uses the same bounded input path. */
export async function ingestLunaWorldEvent(input: { userId: number; event: LunaWorldEventInput; projectId?: string | null; goalId?: string | null; actor?: string }) {
  const sourceKey = `world:${input.event.sourceKey}`;
  const outcome = await ingestLunaCognitiveInput({ userId: input.userId, sourceKey, inputType: "WORLD_EVENT", content: input.event.summary, projectId: input.projectId ?? null, goalId: input.goalId ?? null, provenance: { method: "world-agnostic-adapter", eventType: input.event.eventType }, actor: input.actor ?? "luna:world" });
  const event = await createOrGetLunaWorldEvent({ userId: input.userId, ...input.event, sourceKey: input.event.sourceKey, inputId: outcome.input.id, actor: input.actor ?? "luna:world" });
  return { ...outcome, worldEvent: event.event, worldEventCreated: event.created };
}

/**
 * Runs a bounded, owner-triggered maintenance reconciliation. It does not schedule itself,
 * invoke an external tool, create a mission, or change scientific/provider data.
 */
export async function runLunaCognitiveMaintenance(input: { userId: number; actor?: string }) {
  const state = await listLunaPreGameCognitiveSnapshot(input.userId);
  const evaluatedCount = Math.min(LUNA_COGNITIVE_MAX_ITEMS_PER_CYCLE, state.attentionAssessments.length + state.curiosityAssessments.length + state.gapProfiles.length + state.contradictions.length);
  const expiredAttention = state.attentionAssessments.filter(item => item.state === "ACTIVE" && item.expiresAt && Date.parse(item.expiresAt) <= Date.now()).slice(0, LUNA_COGNITIVE_MAX_DERIVATIONS_PER_CYCLE);
  for (const item of expiredAttention) {
    await createOrUpdateLunaAttentionAssessment({ userId: input.userId, sourceType: item.sourceType, sourceId: item.sourceId, targetType: item.targetType, targetId: item.targetId, severity: item.severity, score: item.score, factors: item.factors, state: "EXPIRED", focusTier: null, suppressionReason: "Expired by bounded maintenance reconciliation.", expiresAt: item.expiresAt, actor: input.actor ?? "luna:maintenance", reason: "Attention expiry was reached; historical assessment is retained through version/audit streams." });
  }
  const fresh = await listLunaPreGameCognitiveSnapshot(input.userId);
  const focus = allocateLunaFocus(fresh.attentionAssessments.filter(item => item.state === "ACTIVE"));
  const assignments = await replaceLunaFocusAssignments({ userId: input.userId, assignments: focus.map(item => {
    const source = fresh.attentionAssessments.find(attentionItem => attentionItem.id === item.attentionId);
    if (!source) throw new Error("Active attention source disappeared during maintenance focus allocation.");
    return { attentionId: item.attentionId, targetType: source.targetType, targetId: source.targetId, tier: item.tier, rank: item.rank, score: item.score };
  }), actor: input.actor ?? "luna:maintenance" });
  const issueCount = fresh.contradictions.filter(item => item.status === "UNRESOLVED" || item.status === "UNDER_INVESTIGATION").length + fresh.uncertaintyRecords.filter(item => item.status === "OPEN" && item.importance >= 0.7).length;
  const updatedCount = expiredAttention.length + assignments.length;
  const stopped = maintenanceStopsAfter({ evaluatedCount, derivedCount: updatedCount });
  const cycle = await createOrGetLunaCognitiveCycle({ userId: input.userId, cycleKey: deterministicKey("maintenance", [new Date().toISOString().slice(0, 13)]), cycleType: "MAINTENANCE", status: stopped ? "STOPPED" : "COMPLETED", evaluatedCount, derivedCount: Math.min(updatedCount, LUNA_COGNITIVE_MAX_DERIVATIONS_PER_CYCLE), stopReason: stopped ? "Maintenance evaluation or derivation cap reached." : null, actor: input.actor ?? "luna:maintenance" });
  const report = await createLunaMaintenanceReport({ userId: input.userId, cycleId: cycle.cycle.id, scope: "pre-game-cognitive-reconciliation", evaluatedCount, updatedCount: Math.min(updatedCount, LUNA_COGNITIVE_MAX_DERIVATIONS_PER_CYCLE), issueCount, status: stopped ? "STOPPED" : "COMPLETED", stopReason: stopped ? "Maintenance evaluation or derivation cap reached." : null, summary: `Reconciled ${evaluatedCount} bounded cognitive records; expired ${expiredAttention.length} attention assessment(s), assigned ${assignments.length} focus slot(s), and observed ${issueCount} unresolved high-relevance issue(s).`, actor: input.actor ?? "luna:maintenance" });
  return { cycle: cycle.cycle, report, evaluatedCount, updatedCount, issueCount, expiredAttention: expiredAttention.length, focusAssignments: assignments.length };
}
