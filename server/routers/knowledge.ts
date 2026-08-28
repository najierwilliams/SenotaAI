import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  KNOWLEDGE_AUTONOMY_LEVELS,
  KNOWLEDGE_MISSION_STATES,
  KNOWLEDGE_OBJECT_TYPES,
  KNOWLEDGE_RELATIONSHIP_TYPES,
  KNOWLEDGE_SOURCE_TYPES,
  KNOWLEDGE_TRUTH_STATES,
  KNOWLEDGE_WORKER_ROLES,
  isScientificTruthStateUserAssignable,
} from "@shared/knowledgeSpace";
import { LUNA_CLAIM_EVIDENCE_ROLES, LUNA_CLAIM_LIFECYCLE_STATES, LUNA_MEMORY_KINDS, LUNA_PRIORITY_TARGET_TYPES, LUNA_TRUTH_STATES } from "@shared/lunaCognitive";
import { publicProcedure, router } from "../_core/trpc";
import { KNOWLEDGE_OWNER_COOKIE, KNOWLEDGE_OWNER_ID, createKnowledgeOwnerSession, isKnowledgeOwnerConfigured, isValidKnowledgeOwnerPassword, isValidKnowledgeOwnerSession, readKnowledgeCookie } from "../knowledgeSpace/ownerAuth";
import { getSessionCookieOptions } from "../_core/cookies";
import {
  appendKnowledgeMissionActivity,
  createKnowledgeApproval,
  createKnowledgeMission,
  createKnowledgeObject,
  createKnowledgeReference,
  createKnowledgeRelationship,
  getKnowledgeAudit,
  getKnowledgeGraph,
  getKnowledgeMissionForUser,
  getKnowledgeObjectForUser,
  getKnowledgeVersions,
  getKnowledgeWorkspaceSnapshot,
  isKnowledgeSpaceCloudReady,
  moveKnowledgeObject,
  searchKnowledge,
  stopKnowledgeMissions,
  setKnowledgeObjectDeleted,
  updateKnowledgeAutonomy,
  updateKnowledgeMission,
  updateKnowledgeObject,
} from "../knowledgeSpace/supabase";
import { runKnowledgeMission } from "../knowledgeSpace/missionRunner";
import { consolidateLunaOwnedExactDuplicateMemories, getLunaActivitySummary, getLunaCognitiveHome, reconcileLunaAttention, retrieveLunaContext } from "../luna/cognitiveService";
import { cancelLunaMission, dispatchLunaMission, pauseLunaMission, planLunaMission, resumeLunaMission, runLunaRecoverySweep } from "../luna/orchestrator";
import { getLunaRuntimeAvailability } from "../luna/runtime";
import { assessAndDispatchLunaCognitiveAction } from "../luna/cognitiveActionService";
import { ingestLunaCognitiveInput, ingestLunaWorldEvent, runLunaCognitiveMaintenance } from "../luna/preGameCognitiveService";
import { archiveDuplicateLunaMemory, createLunaClaim, createLunaClaimEvidence, createLunaCommitment, createLunaCuriosityCandidate, createLunaGoal, createLunaGoalDependency, createLunaHypothesis, createLunaKnowledgeGap, createLunaMemory, createLunaPlanRevision, createOrUpdateLunaPreference, createLunaPriorityAssessment, createLunaProject, createOrUpdateLunaGoalProfile, createOrUpdateLunaSelfModelFact, getLunaCognitiveSnapshot, mergeLunaKnowledgeGaps, listLunaPreGameCognitiveSnapshot, reopenLunaKnowledgeGap, reviseLunaClaim, rollbackLunaOwnedMemory, updateLunaKnowledgeGap, updateLunaMemory, updateLunaSelfState } from "../luna/supabase";

const knowledgeOwnerProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const token = readKnowledgeCookie(ctx.req.header("cookie"));
  if (!await isValidKnowledgeOwnerSession(token)) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Knowledge Space requires the single-owner administrator session." });
  }
  return next({ ctx });
});

const objectTypeSchema = z.enum(KNOWLEDGE_OBJECT_TYPES);
const sourceTypeSchema = z.enum(KNOWLEDGE_SOURCE_TYPES);
const truthStateSchema = z.enum(KNOWLEDGE_TRUTH_STATES);
const relationshipTypeSchema = z.enum(KNOWLEDGE_RELATIONSHIP_TYPES);
const autonomyLevelSchema = z.enum(KNOWLEDGE_AUTONOMY_LEVELS);
const workerRoleSchema = z.enum(KNOWLEDGE_WORKER_ROLES);
const missionStateSchema = z.enum(KNOWLEDGE_MISSION_STATES);
const uuidSchema = z.string().uuid();
const boundedText = (max: number) => z.string().trim().max(max);
const tagsSchema = z.array(z.string().trim().min(1).max(48)).max(24);
const lunaMemoryKindSchema = z.enum(LUNA_MEMORY_KINDS);
const lunaTruthStateSchema = z.enum(LUNA_TRUTH_STATES);
const lunaClaimLifecycleSchema = z.enum(LUNA_CLAIM_LIFECYCLE_STATES);
const lunaClaimEvidenceRoleSchema = z.enum(LUNA_CLAIM_EVIDENCE_ROLES);
const lunaPriorityTargetTypeSchema = z.enum(LUNA_PRIORITY_TARGET_TYPES);

function prohibitLunaTruthElevation(truthState: z.infer<typeof lunaTruthStateSchema>) {
  if (["FACT", "EVIDENCE", "VALIDATED", "PROVIDER_CONFIRMED"].includes(truthState)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Luna cognitive notes may not be promoted to factual, evidence, validated, or provider-confirmed scientific authority. Use the immutable provider/reference registry for source facts." });
  }
}

const scientificMetadataSchema = z.object({
  provider: boundedText(160).optional(),
  dataset: boundedText(240).optional(),
  datasetVersion: boundedText(120).optional(),
  referenceSpace: boundedText(240).optional(),
  coordinate: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    z: z.number().finite(),
    units: boundedText(40).min(1),
  }).nullable().optional(),
  region: boundedText(240).optional(),
  map: boundedText(240).optional(),
  uncertainty: boundedText(2_000).optional(),
  evidenceTier: boundedText(120).optional(),
  license: boundedText(240).optional(),
  sourceUrl: z.string().url().max(2_000).optional(),
}).strict();

const provenanceSchema = z.object({
  provider: boundedText(160).optional(),
  sourceUrl: z.string().url().max(2_000).optional(),
  datasetVersion: boundedText(120).optional(),
  retrievedAt: z.string().datetime().optional(),
  citation: boundedText(4_000).optional(),
  note: boundedText(4_000).optional(),
}).strict();

function prohibitUnsupportedScientificElevation(input: {
  truthState: z.infer<typeof truthStateSchema>;
  sourceType: z.infer<typeof sourceTypeSchema>;
}) {
  if (!isScientificTruthStateUserAssignable(input.truthState)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User and worker actions cannot assign VERIFIED or PROVIDER_CONFIRMED. Preserve provider records or create a proposed, inferred, user-approved, or review-required record instead.",
    });
  }
  if (
    input.sourceType === "VALIDATED_RELATIONSHIP" &&
    input.truthState !== "USER_APPROVED"
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only existing validated source imports may carry VALIDATED_RELATIONSHIP provenance; user-created records must remain non-authoritative.",
    });
  }
}

function databaseError(error: unknown): never {
  const message = error instanceof Error ? error.message : "Knowledge Space persistence request failed.";
  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message,
  });
}

export const knowledgeRouter = router({
  owner: router({
    status: publicProcedure.query(async ({ ctx }) => {
      const token = readKnowledgeCookie(ctx.req.header("cookie"));
      return { configured: isKnowledgeOwnerConfigured(), authenticated: await isValidKnowledgeOwnerSession(token) };
    }),
    unlock: publicProcedure.input(z.object({ password: z.string().min(1).max(1_000) })).mutation(async ({ ctx, input }) => {
      if (!isKnowledgeOwnerConfigured()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Knowledge Space administrator unlock is not configured." });
      if (!isValidKnowledgeOwnerPassword(input.password)) throw new TRPCError({ code: "UNAUTHORIZED", message: "The administrator password is incorrect." });
      ctx.res.cookie(KNOWLEDGE_OWNER_COOKIE, await createKnowledgeOwnerSession(), { ...getSessionCookieOptions(ctx.req), maxAge: 8 * 60 * 60 * 1000 });
      return { authenticated: true, expiresInHours: 8 } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(KNOWLEDGE_OWNER_COOKIE, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { authenticated: false } as const;
    }),
  }),

  status: publicProcedure.query(() => ({
    cloudReady: isKnowledgeSpaceCloudReady(),
    persistence: isKnowledgeSpaceCloudReady() ? "server-only-supabase" : "unavailable",
    scientificBoundary: "P33_NOT_ESTABLISHED_REMAINS_LOCKED",
  })),

  snapshot: knowledgeOwnerProcedure.query(async ({ ctx }) => {
    try {
      return await getKnowledgeWorkspaceSnapshot(KNOWLEDGE_OWNER_ID);
    } catch (error) {
      return databaseError(error);
    }
  }),

  object: router({
    get: knowledgeOwnerProcedure.input(z.object({ objectId: uuidSchema })).query(async ({ ctx, input }) => {
      try {
        const object = await getKnowledgeObjectForUser(KNOWLEDGE_OWNER_ID, input.objectId);
        if (!object) throw new TRPCError({ code: "NOT_FOUND", message: "Knowledge object not found." });
        return object;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return databaseError(error);
      }
    }),

    create: knowledgeOwnerProcedure.input(z.object({
      objectType: objectTypeSchema,
      title: boundedText(240).min(1),
      description: boundedText(12_000).optional(),
      content: boundedText(200_000).optional(),
      sourceType: sourceTypeSchema.default("USER_NOTE"),
      truthState: truthStateSchema.default("USER_APPROVED"),
      tags: tagsSchema.optional(),
      scientificMetadata: scientificMetadataSchema.optional(),
      provenance: provenanceSchema.optional(),
      parentObjectId: uuidSchema.nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      prohibitUnsupportedScientificElevation(input);
      try {
        return await createKnowledgeObject({ userId: KNOWLEDGE_OWNER_ID, ...input });
      } catch (error) {
        return databaseError(error);
      }
    }),

    update: knowledgeOwnerProcedure.input(z.object({
      objectId: uuidSchema,
      title: boundedText(240).min(1).optional(),
      description: boundedText(12_000).optional(),
      content: boundedText(200_000).optional(),
      tags: tagsSchema.optional(),
      status: z.enum(["ACTIVE", "ARCHIVED", "NEEDS_ATTENTION"]).optional(),
      isPinned: z.boolean().optional(),
      isFavorite: z.boolean().optional(),
      reason: boundedText(1_000).min(1),
    }).refine((input) => Object.keys(input).some((key) => !["objectId", "reason"].includes(key)), "Provide at least one editable field."))
      .mutation(async ({ ctx, input }) => {
        try {
          return await updateKnowledgeObject({ userId: KNOWLEDGE_OWNER_ID, ...input });
        } catch (error) {
          return databaseError(error);
        }
      }),

    trash: knowledgeOwnerProcedure.input(z.object({ objectId: uuidSchema })).mutation(async ({ ctx, input }) => {
      try {
        return await setKnowledgeObjectDeleted({ userId: KNOWLEDGE_OWNER_ID, objectId: input.objectId, deleted: true });
      } catch (error) {
        return databaseError(error);
      }
    }),

    restore: knowledgeOwnerProcedure.input(z.object({ objectId: uuidSchema })).mutation(async ({ ctx, input }) => {
      try {
        return await setKnowledgeObjectDeleted({ userId: KNOWLEDGE_OWNER_ID, objectId: input.objectId, deleted: false });
      } catch (error) {
        return databaseError(error);
      }
    }),

    move: knowledgeOwnerProcedure.input(z.object({ objectId: uuidSchema, parentObjectId: uuidSchema.nullable() })).mutation(async ({ ctx, input }) => {
      try {
        return await moveKnowledgeObject({ userId: KNOWLEDGE_OWNER_ID, ...input });
      } catch (error) {
        return databaseError(error);
      }
    }),

    reference: knowledgeOwnerProcedure.input(z.object({
      objectId: uuidSchema,
      parentObjectId: uuidSchema,
      label: boundedText(240).nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      try {
        return await createKnowledgeReference({ userId: KNOWLEDGE_OWNER_ID, ...input });
      } catch (error) {
        return databaseError(error);
      }
    }),

    versions: knowledgeOwnerProcedure.input(z.object({ objectId: uuidSchema })).query(async ({ ctx, input }) => {
      try {
        return await getKnowledgeVersions(KNOWLEDGE_OWNER_ID, input.objectId);
      } catch (error) {
        return databaseError(error);
      }
    }),
  }),

  relationship: router({
    create: knowledgeOwnerProcedure.input(z.object({
      sourceObjectId: uuidSchema,
      targetObjectId: uuidSchema,
      relationshipType: relationshipTypeSchema,
      sourceType: sourceTypeSchema.default("USER_NOTE"),
      truthState: truthStateSchema.default("PROPOSED"),
      confidence: z.number().min(0).max(1).nullable().optional(),
      evidence: z.record(z.string(), z.unknown()).optional(),
      provenance: provenanceSchema.optional(),
    })).mutation(async ({ ctx, input }) => {
      prohibitUnsupportedScientificElevation(input);
      try {
        return await createKnowledgeRelationship({ userId: KNOWLEDGE_OWNER_ID, ...input });
      } catch (error) {
        return databaseError(error);
      }
    }),

    graph: knowledgeOwnerProcedure.input(z.object({ focusObjectId: uuidSchema.optional() })).query(async ({ ctx, input }) => {
      try {
        return await getKnowledgeGraph(KNOWLEDGE_OWNER_ID, input.focusObjectId);
      } catch (error) {
        return databaseError(error);
      }
    }),
  }),

  search: knowledgeOwnerProcedure.input(z.object({ query: boundedText(120).optional() })).query(async ({ ctx, input }) => {
    try {
      return await searchKnowledge(KNOWLEDGE_OWNER_ID, input.query ?? "");
    } catch (error) {
      return databaseError(error);
    }
  }),

  audit: knowledgeOwnerProcedure.input(z.object({ limit: z.number().int().min(1).max(200).optional() })).query(async ({ ctx, input }) => {
    try {
      return await getKnowledgeAudit(KNOWLEDGE_OWNER_ID, input.limit);
    } catch (error) {
      return databaseError(error);
    }
  }),

  autonomy: router({
    update: knowledgeOwnerProcedure.input(z.object({
      autonomyLevel: autonomyLevelSchema.optional(),
      autonomyPaused: z.boolean().optional(),
    }).refine((input) => input.autonomyLevel !== undefined || input.autonomyPaused !== undefined, "Provide an autonomy setting."))
      .mutation(async ({ ctx, input }) => {
        try {
          return await updateKnowledgeAutonomy({ userId: KNOWLEDGE_OWNER_ID, ...input });
        } catch (error) {
          return databaseError(error);
        }
      }),
  }),

  mission: router({
    create: knowledgeOwnerProcedure.input(z.object({
      targetObjectId: uuidSchema.nullable().optional(),
      workerRole: workerRoleSchema,
      objective: boundedText(12_000).min(1),
      autonomyLevel: autonomyLevelSchema.default("ON_DEMAND"),
      maxSteps: z.number().int().min(1).max(50).optional(),
      maxRetries: z.number().int().min(0).max(5).optional(),
      maxDurationSeconds: z.number().int().min(10).max(900).optional(),
      maxSpawnedWorkers: z.number().int().min(0).max(4).optional(),
      inputContext: z.record(z.string(), z.unknown()).optional(),
    })).mutation(async ({ ctx, input }) => {
      try {
        return await createKnowledgeMission({ userId: KNOWLEDGE_OWNER_ID, ...input });
      } catch (error) {
        return databaseError(error);
      }
    }),

    run: knowledgeOwnerProcedure.input(z.object({ missionId: uuidSchema })).mutation(async ({ ctx, input }) => {
      try {
        const mission = await getKnowledgeMissionForUser(KNOWLEDGE_OWNER_ID, input.missionId);
        if (!mission) throw new TRPCError({ code: "NOT_FOUND", message: "Knowledge worker mission not found." });
        return await runKnowledgeMission(KNOWLEDGE_OWNER_ID, mission.id);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return databaseError(error);
      }
    }),

    stop: knowledgeOwnerProcedure.input(z.object({ missionId: uuidSchema })).mutation(async ({ ctx, input }) => {
      try {
        return await updateKnowledgeMission({ userId: KNOWLEDGE_OWNER_ID, missionId: input.missionId, state: "CANCELLED", stopRequested: true, errorMessage: "Stopped by user." });
      } catch (error) {
        return databaseError(error);
      }
    }),

    stopAll: knowledgeOwnerProcedure.mutation(async ({ ctx }) => {
      try {
        return await stopKnowledgeMissions({ userId: KNOWLEDGE_OWNER_ID });
      } catch (error) {
        return databaseError(error);
      }
    }),

    clearQueue: knowledgeOwnerProcedure.mutation(async ({ ctx }) => {
      try {
        return await stopKnowledgeMissions({ userId: KNOWLEDGE_OWNER_ID, queuedOnly: true });
      } catch (error) {
        return databaseError(error);
      }
    }),

    update: knowledgeOwnerProcedure.input(z.object({
      missionId: uuidSchema,
      state: missionStateSchema.optional(),
      currentStep: z.number().int().min(0).max(50).optional(),
      stopRequested: z.boolean().optional(),
      errorMessage: boundedText(4_000).nullable().optional(),
      reportObjectId: uuidSchema.nullable().optional(),
    }).refine((input) => Object.keys(input).some((key) => key !== "missionId"), "Provide a mission update."))
      .mutation(async ({ ctx, input }) => {
        try {
          return await updateKnowledgeMission({ userId: KNOWLEDGE_OWNER_ID, ...input });
        } catch (error) {
          return databaseError(error);
        }
      }),

    activity: knowledgeOwnerProcedure.input(z.object({
      missionId: uuidSchema,
      workerRole: workerRoleSchema,
      eventType: boundedText(80).min(1),
      message: boundedText(4_000).min(1),
      detail: z.record(z.string(), z.unknown()).optional(),
    })).mutation(async ({ ctx, input }) => {
      try {
        return await appendKnowledgeMissionActivity({ userId: KNOWLEDGE_OWNER_ID, ...input });
      } catch (error) {
        return databaseError(error);
      }
    }),
  }),

  approval: router({
    create: knowledgeOwnerProcedure.input(z.object({
      missionId: uuidSchema.nullable().optional(),
      targetObjectId: uuidSchema.nullable().optional(),
      actionType: boundedText(100).min(1),
      title: boundedText(240).min(1),
      rationale: boundedText(4_000).default(""),
      sourceSummary: boundedText(4_000).default(""),
      evidence: z.record(z.string(), z.unknown()).optional(),
      oldValue: z.record(z.string(), z.unknown()).nullable().optional(),
      newValue: z.record(z.string(), z.unknown()).nullable().optional(),
      confidence: z.number().min(0).max(1).nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      try {
        return await createKnowledgeApproval({ userId: KNOWLEDGE_OWNER_ID, ...input });
      } catch (error) {
        return databaseError(error);
      }
    }),
  }),

  cognitive: router({
    status: publicProcedure.query(async () => ({
      cloudReady: isKnowledgeSpaceCloudReady(),
      runtime: await getLunaRuntimeAvailability(),
      executionBoundary: "A durable provider must return a real run ID before Luna reports unattended mission execution.",
      scientificBoundary: "P33_NOT_ESTABLISHED_AND_JULICH_UNMAPPED_REMAIN_LOCKED",
      biologicalBoundary: "SOFTWARE_WORKERS_ONLY_NO_PHYSICAL_OR_BIOLOGICAL_NANOBOT_OPERATIONS",
    })),

    snapshot: knowledgeOwnerProcedure.query(async () => {
      try {
        const [snapshot, preGame] = await Promise.all([getLunaCognitiveSnapshot(KNOWLEDGE_OWNER_ID), listLunaPreGameCognitiveSnapshot(KNOWLEDGE_OWNER_ID)]);
        return { ...snapshot, preGame };
      } catch (error) { return databaseError(error); }
    }),

    home: knowledgeOwnerProcedure.query(async () => {
      try { return await getLunaCognitiveHome(KNOWLEDGE_OWNER_ID); } catch (error) { return databaseError(error); }
    }),

    activity: knowledgeOwnerProcedure.query(async () => {
      try { return await getLunaActivitySummary(KNOWLEDGE_OWNER_ID); } catch (error) { return databaseError(error); }
    }),

    context: knowledgeOwnerProcedure.input(z.object({ query: boundedText(2_000).min(1), projectId: uuidSchema.nullable().optional(), limit: z.number().int().min(1).max(20).optional() })).query(async ({ input }) => {
      try { return await retrieveLunaContext({ userId: KNOWLEDGE_OWNER_ID, ...input }); } catch (error) { return databaseError(error); }
    }),

    self: router({
      update: knowledgeOwnerProcedure.input(z.object({
        currentFocus: boundedText(1_000).nullable().optional(),
        autonomyEnabled: z.boolean().optional(),
        maintenanceEnabled: z.boolean().optional(),
        cognitiveActionsEnabled: z.boolean().optional(),
        identitySummary: boundedText(4_000).optional(),
        capabilities: z.array(boundedText(400).min(1)).max(30).optional(),
        limitations: z.array(boundedText(400).min(1)).max(30).optional(),
        uncertaintySummary: boundedText(4_000).optional(),
        reason: boundedText(1_000).min(3),
      }).refine(input => Object.keys(input).some(key => key !== "reason"), "Provide a cognitive-state update.")).mutation(async ({ input }) => {
        try { return await updateLunaSelfState({ userId: KNOWLEDGE_OWNER_ID, ...input }); } catch (error) { return databaseError(error); }
      }),
    }),

    attention: router({
      gap: router({
        create: knowledgeOwnerProcedure.input(z.object({
          title: boundedText(240).min(1), question: boundedText(4_000).min(1), requestedEvidence: boundedText(4_000).optional(), rationale: boundedText(8_000).optional(),
          severity: z.enum(["INFO", "WARNING", "ACTION_REQUIRED"]).optional(), projectId: uuidSchema.nullable().optional(), claimId: uuidSchema.nullable().optional(), relatedObjectId: uuidSchema.nullable().optional(), provenance: z.record(z.string(), z.unknown()).optional(),
        })).mutation(async ({ input }) => { try { return await createLunaKnowledgeGap({ userId: KNOWLEDGE_OWNER_ID, ...input, sourceType: "OWNER", actor: "knowledge-owner" }); } catch (error) { return databaseError(error); } }),
        dismissTemporaryAcceptance: knowledgeOwnerProcedure.input(z.object({ gapId: uuidSchema })).mutation(async ({ input }) => {
          try {
            const snapshot = await getLunaCognitiveSnapshot(KNOWLEDGE_OWNER_ID);
            const gap = snapshot.knowledgeGaps.find(item => item.id === input.gapId);
            if (!gap || gap.provenance?.method !== "MILESTONE_5_USER_ACCEPTANCE_TEST") {
              throw new TRPCError({ code: "FORBIDDEN", message: "Only the labelled temporary Milestone 5 acceptance condition can be dismissed here." });
            }
            if (gap.status === "DISMISSED") return gap;
            return await updateLunaKnowledgeGap({
              userId: KNOWLEDGE_OWNER_ID,
              gapId: gap.id,
              status: "DISMISSED",
              actor: "knowledge-owner",
              reason: "Owner dismissed the completed temporary Milestone 5 user acceptance condition.",
            });
          } catch (error) {
            if (error instanceof TRPCError) throw error;
            return databaseError(error);
          }
        }),
      }),
      curiosity: router({
        create: knowledgeOwnerProcedure.input(z.object({ gapId: uuidSchema, proposedAction: boundedText(4_000).min(1), rationale: boundedText(4_000).optional(), estimatedCost: z.enum(["LOW", "MODERATE", "HIGH"]) })).mutation(async ({ input }) => { try { return await createLunaCuriosityCandidate({ userId: KNOWLEDGE_OWNER_ID, ...input, createdBy: "OWNER", actor: "knowledge-owner" }); } catch (error) { return databaseError(error); } }),
      }),
      priority: router({
        assess: knowledgeOwnerProcedure.input(z.object({ targetType: lunaPriorityTargetTypeSchema, targetId: uuidSchema, urgencyScore: z.number().finite().min(0).max(1), impactScore: z.number().finite().min(0).max(1), evidenceScore: z.number().finite().min(0).max(1), unblockScore: z.number().finite().min(0).max(1), riskScore: z.number().finite().min(0).max(1), assumptions: z.array(boundedText(1_000).min(1)).max(30).optional() })).mutation(async ({ input }) => { try { return await createLunaPriorityAssessment({ userId: KNOWLEDGE_OWNER_ID, ...input, actor: "knowledge-owner" }); } catch (error) { return databaseError(error); } }),
      }),
    }),

    claim: router({
      create: knowledgeOwnerProcedure.input(z.object({
        subject: boundedText(1_000).min(1),
        predicate: boundedText(1_000).min(1),
        objectText: boundedText(12_000).min(1),
        statement: boundedText(16_000).min(1),
        truthState: lunaTruthStateSchema.default("INFERENCE"),
        confidence: z.number().finite().min(0).max(1).optional(),
        assumptions: z.array(boundedText(1_000).min(1)).max(30).optional(),
        provenance: z.record(z.string(), z.unknown()).optional(),
        projectId: uuidSchema.nullable().optional(),
        missionId: uuidSchema.nullable().optional(),
      })).mutation(async ({ input }) => {
        prohibitLunaTruthElevation(input.truthState);
        try { return await createLunaClaim({ userId: KNOWLEDGE_OWNER_ID, ...input, actor: "knowledge-owner" }); } catch (error) { return databaseError(error); }
      }),
      revise: knowledgeOwnerProcedure.input(z.object({
        claimId: uuidSchema,
        statement: boundedText(16_000).min(1).optional(),
        truthState: lunaTruthStateSchema.optional(),
        confidence: z.number().finite().min(0).max(1).optional(),
        lifecycleState: lunaClaimLifecycleSchema.optional(),
        assumptions: z.array(boundedText(1_000).min(1)).max(30).optional(),
        reason: boundedText(4_000).min(3),
      }).refine(input => Object.keys(input).some(key => key !== "claimId" && key !== "reason"), "Provide a claim revision.")).mutation(async ({ input }) => {
        if (input.truthState) prohibitLunaTruthElevation(input.truthState);
        try { return await reviseLunaClaim({ userId: KNOWLEDGE_OWNER_ID, ...input, actor: "knowledge-owner" }); } catch (error) { return databaseError(error); }
      }),
      evidence: knowledgeOwnerProcedure.input(z.object({
        claimId: uuidSchema,
        sourceMemoryId: uuidSchema.nullable().optional(),
        sourceObjectId: uuidSchema.nullable().optional(),
        sourceRelationshipId: uuidSchema.nullable().optional(),
        evidenceRole: lunaClaimEvidenceRoleSchema,
        sourceExcerpt: boundedText(4_000).optional(),
        confidence: z.number().finite().min(0).max(1).nullable().optional(),
        provenance: z.record(z.string(), z.unknown()).optional(),
      }).refine(input => [input.sourceMemoryId, input.sourceObjectId, input.sourceRelationshipId].filter(Boolean).length === 1, "Claim evidence must reference exactly one persisted source.")).mutation(async ({ input }) => {
        try { return await createLunaClaimEvidence({ userId: KNOWLEDGE_OWNER_ID, ...input, actor: "knowledge-owner" }); } catch (error) { return databaseError(error); }
      }),
    }),

    memory: router({
      create: knowledgeOwnerProcedure.input(z.object({
        memoryKind: lunaMemoryKindSchema,
        content: boundedText(16_000).min(1),
        importance: z.number().int().min(1).max(5).optional(),
        truthState: lunaTruthStateSchema.default("INFERENCE"),
        sourceType: z.enum(["USER", "LUNA", "SYSTEM"]),
        sourceObjectIds: z.array(uuidSchema).max(100).optional(),
        projectId: uuidSchema.nullable().optional(),
        tags: tagsSchema.optional(),
        provenance: z.record(z.string(), z.unknown()).optional(),
      })).mutation(async ({ input }) => {
        prohibitLunaTruthElevation(input.truthState);
        try { return await createLunaMemory({ userId: KNOWLEDGE_OWNER_ID, ...input }); } catch (error) { return databaseError(error); }
      }),
      archive: knowledgeOwnerProcedure.input(z.object({
        memoryId: uuidSchema,
        reason: boundedText(1_000).min(3),
      })).mutation(async ({ input }) => {
        try {
          return await updateLunaMemory({
            userId: KNOWLEDGE_OWNER_ID,
            memoryId: input.memoryId,
            active: false,
            archived: true,
            actor: "knowledge-owner",
            reason: input.reason,
          });
        } catch (error) { return databaseError(error); }
      }),
      rollback: knowledgeOwnerProcedure.input(z.object({
        memoryId: uuidSchema,
        version: z.number().int().min(1),
        reason: boundedText(1_000).min(3),
      })).mutation(async ({ input }) => {
        try { return await rollbackLunaOwnedMemory({ userId: KNOWLEDGE_OWNER_ID, ...input }); } catch (error) { return databaseError(error); }
      }),
      consolidateExactDuplicates: knowledgeOwnerProcedure.mutation(async () => {
        try { return await consolidateLunaOwnedExactDuplicateMemories({ userId: KNOWLEDGE_OWNER_ID }); } catch (error) { return databaseError(error); }
      }),
    }),

    project: router({
      create: knowledgeOwnerProcedure.input(z.object({ title: boundedText(240).min(1), summary: boundedText(16_000).optional(), priority: z.number().int().min(1).max(5).optional(), focusObjectId: uuidSchema.nullable().optional() })).mutation(async ({ input }) => {
        try { return await createLunaProject({ userId: KNOWLEDGE_OWNER_ID, ...input, createdBy: "USER" }); } catch (error) { return databaseError(error); }
      }),
    }),

    goal: router({
      create: knowledgeOwnerProcedure.input(z.object({ title: boundedText(240).min(1), rationale: boundedText(16_000).min(1), projectId: uuidSchema.nullable().optional(), parentGoalId: uuidSchema.nullable().optional(), priority: z.number().int().min(1).max(5).optional(), truthState: lunaTruthStateSchema.default("PROPOSED") })).mutation(async ({ input }) => {
        prohibitLunaTruthElevation(input.truthState);
        try { return await createLunaGoal({ userId: KNOWLEDGE_OWNER_ID, ...input, actor: "owner" }); } catch (error) { return databaseError(error); }
      }),
    }),

    mission: router({
      plan: knowledgeOwnerProcedure.input(z.object({ objective: boundedText(12_000).min(3), projectTitle: boundedText(240).optional(), focusObjectId: uuidSchema.nullable().optional(), priority: z.number().int().min(1).max(5).optional(), maxWorkers: z.number().int().min(1).max(12).optional(), maxModelRequests: z.number().int().min(0).max(100).optional(), maxTokenBudget: z.number().int().min(0).max(1_000_000).optional() })).mutation(async ({ input }) => {
        try { return await planLunaMission({ userId: KNOWLEDGE_OWNER_ID, ...input }); } catch (error) { return databaseError(error); }
      }),
      dispatch: knowledgeOwnerProcedure.input(z.object({ missionId: uuidSchema })).mutation(async ({ input }) => {
        try { return await dispatchLunaMission({ userId: KNOWLEDGE_OWNER_ID, missionId: input.missionId }); } catch (error) { return databaseError(error); }
      }),
      pause: knowledgeOwnerProcedure.input(z.object({ missionId: uuidSchema })).mutation(async ({ input }) => {
        try { return await pauseLunaMission(KNOWLEDGE_OWNER_ID, input.missionId); } catch (error) { return databaseError(error); }
      }),
      cancel: knowledgeOwnerProcedure.input(z.object({ missionId: uuidSchema })).mutation(async ({ input }) => {
        try { return await cancelLunaMission(KNOWLEDGE_OWNER_ID, input.missionId); } catch (error) { return databaseError(error); }
      }),
      resume: knowledgeOwnerProcedure.input(z.object({ missionId: uuidSchema })).mutation(async ({ input }) => {
        try { return await resumeLunaMission(KNOWLEDGE_OWNER_ID, input.missionId); } catch (error) { return databaseError(error); }
      }),
      recover: knowledgeOwnerProcedure.mutation(async () => {
        try { return await runLunaRecoverySweep(KNOWLEDGE_OWNER_ID); } catch (error) { return databaseError(error); }
      }),
    }),

    action: router({
      assessAndDispatch: knowledgeOwnerProcedure.mutation(async () => {
        try { return await assessAndDispatchLunaCognitiveAction({ userId: KNOWLEDGE_OWNER_ID }); } catch (error) { return databaseError(error); }
      }),
      command: knowledgeOwnerProcedure.input(z.object({ message: boundedText(1_000).min(3) })).mutation(async ({ input }) => {
        const normalized = input.message.toLowerCase().replace(/\s+/g, " ").trim();
        if (!/^(run|assess|review|dispatch)\b/.test(normalized) || !/(cognitive|knowledge gap|attention)/.test(normalized)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cognitive commands are limited to an owner-scoped request to run, assess, review, or dispatch the next bounded cognitive action." });
        }
        try { return await assessAndDispatchLunaCognitiveAction({ userId: KNOWLEDGE_OWNER_ID }); } catch (error) { return databaseError(error); }
      }),
    }),

    preGame: router({
      snapshot: knowledgeOwnerProcedure.query(async () => {
        try { return await listLunaPreGameCognitiveSnapshot(KNOWLEDGE_OWNER_ID); } catch (error) { return databaseError(error); }
      }),
      input: router({
        ingest: knowledgeOwnerProcedure.input(z.object({
          inputType: z.enum(["CONVERSATION", "USER_CORRECTION", "OWNER_NOTE", "PROJECT_OUTCOME"]),
          content: boundedText(4_000).min(1), participantIdentity: boundedText(120).min(1).nullable().optional(),
          projectId: uuidSchema.nullable().optional(), goalId: uuidSchema.nullable().optional(),
          correctionTarget: z.object({ type: boundedText(80).min(1), id: uuidSchema }).nullable().optional(),
          declaredImportance: z.number().finite().min(0).max(1).optional(), declaredConfidence: z.number().finite().min(0).max(1).optional(),
        })).mutation(async ({ input }) => {
          try { return await ingestLunaCognitiveInput({ userId: KNOWLEDGE_OWNER_ID, ...input, actor: "knowledge-owner" }); } catch (error) { return databaseError(error); }
        }),
      }),
      world: router({
        ingest: knowledgeOwnerProcedure.input(z.object({
          sourceKey: boundedText(240).min(8), eventType: boundedText(120).min(1), summary: boundedText(1_600).min(1),
          subjectIdentity: boundedText(120).min(1).nullable().optional(), objectIdentity: boundedText(120).min(1).nullable().optional(), locationRef: boundedText(240).min(1).nullable().optional(), occurredAt: z.string().datetime().nullable().optional(),
          constraints: z.record(z.string(), z.unknown()).optional(), consequences: z.record(z.string(), z.unknown()).optional(), projectId: uuidSchema.nullable().optional(), goalId: uuidSchema.nullable().optional(),
        })).mutation(async ({ input }) => {
          try {
            const { projectId, goalId, ...event } = input;
            return await ingestLunaWorldEvent({ userId: KNOWLEDGE_OWNER_ID, event, projectId, goalId, actor: "knowledge-owner" });
          } catch (error) { return databaseError(error); }
        }),
      }),
      preference: router({
        set: knowledgeOwnerProcedure.input(z.object({
          preferenceKind: z.enum(["USER", "TASK", "TEMPORARY", "CONTEXTUAL"]), subject: boundedText(240).min(1), value: boundedText(1_600).min(1), context: z.record(z.string(), z.unknown()).optional(), confidence: z.number().finite().min(0).max(1).default(1), reason: boundedText(1_000).min(3),
        })).mutation(async ({ input }) => {
          try { return await createOrUpdateLunaPreference({ userId: KNOWLEDGE_OWNER_ID, ...input, evidenceCount: 1, provenance: { method: "owner-explicit-preference" }, actor: "knowledge-owner" }); } catch (error) { return databaseError(error); }
        }),
      }),
      selfModel: router({
        assertOwnerFact: knowledgeOwnerProcedure.input(z.object({ facet: boundedText(120).min(1), statement: boundedText(1_600).min(1), confidence: z.number().finite().min(0).max(1).default(1), reason: boundedText(1_000).min(3) })).mutation(async ({ input }) => {
          try { return await createOrUpdateLunaSelfModelFact({ userId: KNOWLEDGE_OWNER_ID, ...input, factKind: "USER_ASSERTED", evidenceCount: 1, actor: "knowledge-owner" }); } catch (error) { return databaseError(error); }
        }),
      }),
      goal: router({
        profile: knowledgeOwnerProcedure.input(z.object({ goalId: uuidSchema, importance: z.number().finite().min(0).max(1), motivation: boundedText(1_600).optional(), deadlineAt: z.string().datetime().nullable().optional(), successCriteria: boundedText(1_600).optional(), failureCriteria: boundedText(1_600).optional(), status: z.enum(["PROPOSED", "ACTIVE", "PAUSED", "COMPLETED", "ABANDONED", "SUPERSEDED", "BLOCKED"]).optional(), reason: boundedText(1_000).min(3) })).mutation(async ({ input }) => {
          try { return await createOrUpdateLunaGoalProfile({ userId: KNOWLEDGE_OWNER_ID, ...input, origin: "OWNER", actor: "knowledge-owner" }); } catch (error) { return databaseError(error); }
        }),
        addDependency: knowledgeOwnerProcedure.input(z.object({ goalId: uuidSchema, dependsOnGoalId: uuidSchema, dependencyKind: z.enum(["REQUIRES", "BLOCKS", "SUPPORTS"]) })).mutation(async ({ input }) => {
          try { return await createLunaGoalDependency({ userId: KNOWLEDGE_OWNER_ID, ...input, actor: "knowledge-owner" }); } catch (error) { return databaseError(error); }
        }),
      }),
      gap: router({
        merge: knowledgeOwnerProcedure.input(z.object({ sourceGapId: uuidSchema, canonicalGapId: uuidSchema, reason: boundedText(1_000).min(3) })).mutation(async ({ input }) => {
          try { return await mergeLunaKnowledgeGaps({ userId: KNOWLEDGE_OWNER_ID, ...input, actor: "knowledge-owner" }); } catch (error) { return databaseError(error); }
        }),
        reopen: knowledgeOwnerProcedure.input(z.object({ gapId: uuidSchema, reason: boundedText(1_000).min(3) })).mutation(async ({ input }) => {
          try { return await reopenLunaKnowledgeGap({ userId: KNOWLEDGE_OWNER_ID, ...input, actor: "knowledge-owner" }); } catch (error) { return databaseError(error); }
        }),
      }),
      commitment: router({
        create: knowledgeOwnerProcedure.input(z.object({ title: boundedText(240).min(1), detail: boundedText(1_600).optional(), projectId: uuidSchema.nullable().optional(), goalId: uuidSchema.nullable().optional(), relationshipId: uuidSchema.nullable().optional(), dueAt: z.string().datetime().nullable().optional(), confidence: z.number().finite().min(0).max(1).optional(), externalActionRequired: z.boolean().optional() })).mutation(async ({ input }) => {
          try { return await createLunaCommitment({ userId: KNOWLEDGE_OWNER_ID, ...input, actor: "knowledge-owner" }); } catch (error) { return databaseError(error); }
        }),
      }),
      hypothesis: router({
        create: knowledgeOwnerProcedure.input(z.object({ statement: boundedText(1_600).min(1), plannedTest: boundedText(1_600).optional(), confidence: z.number().finite().min(0).max(1).optional(), projectId: uuidSchema.nullable().optional(), goalId: uuidSchema.nullable().optional(), gapId: uuidSchema.nullable().optional() })).mutation(async ({ input }) => {
          try { return await createLunaHypothesis({ userId: KNOWLEDGE_OWNER_ID, ...input, actor: "knowledge-owner" }); } catch (error) { return databaseError(error); }
        }),
      }),
      plan: router({
        record: knowledgeOwnerProcedure.input(z.object({ goalId: uuidSchema.nullable().optional(), missionId: uuidSchema.nullable().optional(), revisionKind: z.enum(["CREATED", "REVISED", "DEFERRED", "SUPERSEDED"]), summary: boundedText(1_600).min(1), reason: boundedText(1_600).min(3), alternatives: z.array(boundedText(600).min(1)).max(5).optional() })).mutation(async ({ input }) => {
          try { return await createLunaPlanRevision({ userId: KNOWLEDGE_OWNER_ID, ...input, actor: "knowledge-owner" }); } catch (error) { return databaseError(error); }
        }),
      }),
    }),
    maintenance: router({
      reconcile: knowledgeOwnerProcedure.mutation(async () => {
        try { return await reconcileLunaAttention({ userId: KNOWLEDGE_OWNER_ID }); } catch (error) { return databaseError(error); }
      }),
      run: knowledgeOwnerProcedure.mutation(async () => {
        try { return await runLunaCognitiveMaintenance({ userId: KNOWLEDGE_OWNER_ID, actor: "knowledge-owner" }); } catch (error) { return databaseError(error); }
      }),
    }),
  }),
});
