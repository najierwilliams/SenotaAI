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
import { protectedProcedure, router } from "../_core/trpc";
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
  status: protectedProcedure.query(() => ({
    cloudReady: isKnowledgeSpaceCloudReady(),
    persistence: isKnowledgeSpaceCloudReady() ? "server-only-supabase" : "unavailable",
    scientificBoundary: "P33_NOT_ESTABLISHED_REMAINS_LOCKED",
  })),

  snapshot: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getKnowledgeWorkspaceSnapshot(ctx.user.id);
    } catch (error) {
      return databaseError(error);
    }
  }),

  object: router({
    get: protectedProcedure.input(z.object({ objectId: uuidSchema })).query(async ({ ctx, input }) => {
      try {
        const object = await getKnowledgeObjectForUser(ctx.user.id, input.objectId);
        if (!object) throw new TRPCError({ code: "NOT_FOUND", message: "Knowledge object not found." });
        return object;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return databaseError(error);
      }
    }),

    create: protectedProcedure.input(z.object({
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
        return await createKnowledgeObject({ userId: ctx.user.id, ...input });
      } catch (error) {
        return databaseError(error);
      }
    }),

    update: protectedProcedure.input(z.object({
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
          return await updateKnowledgeObject({ userId: ctx.user.id, ...input });
        } catch (error) {
          return databaseError(error);
        }
      }),

    trash: protectedProcedure.input(z.object({ objectId: uuidSchema })).mutation(async ({ ctx, input }) => {
      try {
        return await setKnowledgeObjectDeleted({ userId: ctx.user.id, objectId: input.objectId, deleted: true });
      } catch (error) {
        return databaseError(error);
      }
    }),

    restore: protectedProcedure.input(z.object({ objectId: uuidSchema })).mutation(async ({ ctx, input }) => {
      try {
        return await setKnowledgeObjectDeleted({ userId: ctx.user.id, objectId: input.objectId, deleted: false });
      } catch (error) {
        return databaseError(error);
      }
    }),

    move: protectedProcedure.input(z.object({ objectId: uuidSchema, parentObjectId: uuidSchema.nullable() })).mutation(async ({ ctx, input }) => {
      try {
        return await moveKnowledgeObject({ userId: ctx.user.id, ...input });
      } catch (error) {
        return databaseError(error);
      }
    }),

    reference: protectedProcedure.input(z.object({
      objectId: uuidSchema,
      parentObjectId: uuidSchema,
      label: boundedText(240).nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      try {
        return await createKnowledgeReference({ userId: ctx.user.id, ...input });
      } catch (error) {
        return databaseError(error);
      }
    }),

    versions: protectedProcedure.input(z.object({ objectId: uuidSchema })).query(async ({ ctx, input }) => {
      try {
        return await getKnowledgeVersions(ctx.user.id, input.objectId);
      } catch (error) {
        return databaseError(error);
      }
    }),
  }),

  relationship: router({
    create: protectedProcedure.input(z.object({
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
        return await createKnowledgeRelationship({ userId: ctx.user.id, ...input });
      } catch (error) {
        return databaseError(error);
      }
    }),

    graph: protectedProcedure.input(z.object({ focusObjectId: uuidSchema.optional() })).query(async ({ ctx, input }) => {
      try {
        return await getKnowledgeGraph(ctx.user.id, input.focusObjectId);
      } catch (error) {
        return databaseError(error);
      }
    }),
  }),

  search: protectedProcedure.input(z.object({ query: boundedText(120).optional() })).query(async ({ ctx, input }) => {
    try {
      return await searchKnowledge(ctx.user.id, input.query ?? "");
    } catch (error) {
      return databaseError(error);
    }
  }),

  audit: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(200).optional() })).query(async ({ ctx, input }) => {
    try {
      return await getKnowledgeAudit(ctx.user.id, input.limit);
    } catch (error) {
      return databaseError(error);
    }
  }),

  autonomy: router({
    update: protectedProcedure.input(z.object({
      autonomyLevel: autonomyLevelSchema.optional(),
      autonomyPaused: z.boolean().optional(),
    }).refine((input) => input.autonomyLevel !== undefined || input.autonomyPaused !== undefined, "Provide an autonomy setting."))
      .mutation(async ({ ctx, input }) => {
        try {
          return await updateKnowledgeAutonomy({ userId: ctx.user.id, ...input });
        } catch (error) {
          return databaseError(error);
        }
      }),
  }),

  mission: router({
    create: protectedProcedure.input(z.object({
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
        return await createKnowledgeMission({ userId: ctx.user.id, ...input });
      } catch (error) {
        return databaseError(error);
      }
    }),

    run: protectedProcedure.input(z.object({ missionId: uuidSchema })).mutation(async ({ ctx, input }) => {
      try {
        const mission = await getKnowledgeMissionForUser(ctx.user.id, input.missionId);
        if (!mission) throw new TRPCError({ code: "NOT_FOUND", message: "Knowledge worker mission not found." });
        return await runKnowledgeMission(ctx.user.id, mission.id);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return databaseError(error);
      }
    }),

    stop: protectedProcedure.input(z.object({ missionId: uuidSchema })).mutation(async ({ ctx, input }) => {
      try {
        return await updateKnowledgeMission({ userId: ctx.user.id, missionId: input.missionId, state: "CANCELLED", stopRequested: true, errorMessage: "Stopped by user." });
      } catch (error) {
        return databaseError(error);
      }
    }),

    stopAll: protectedProcedure.mutation(async ({ ctx }) => {
      try {
        return await stopKnowledgeMissions({ userId: ctx.user.id });
      } catch (error) {
        return databaseError(error);
      }
    }),

    clearQueue: protectedProcedure.mutation(async ({ ctx }) => {
      try {
        return await stopKnowledgeMissions({ userId: ctx.user.id, queuedOnly: true });
      } catch (error) {
        return databaseError(error);
      }
    }),

    update: protectedProcedure.input(z.object({
      missionId: uuidSchema,
      state: missionStateSchema.optional(),
      currentStep: z.number().int().min(0).max(50).optional(),
      stopRequested: z.boolean().optional(),
      errorMessage: boundedText(4_000).nullable().optional(),
      reportObjectId: uuidSchema.nullable().optional(),
    }).refine((input) => Object.keys(input).some((key) => key !== "missionId"), "Provide a mission update."))
      .mutation(async ({ ctx, input }) => {
        try {
          return await updateKnowledgeMission({ userId: ctx.user.id, ...input });
        } catch (error) {
          return databaseError(error);
        }
      }),

    activity: protectedProcedure.input(z.object({
      missionId: uuidSchema,
      workerRole: workerRoleSchema,
      eventType: boundedText(80).min(1),
      message: boundedText(4_000).min(1),
      detail: z.record(z.string(), z.unknown()).optional(),
    })).mutation(async ({ ctx, input }) => {
      try {
        return await appendKnowledgeMissionActivity({ userId: ctx.user.id, ...input });
      } catch (error) {
        return databaseError(error);
      }
    }),
  }),

  approval: router({
    create: protectedProcedure.input(z.object({
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
        return await createKnowledgeApproval({ userId: ctx.user.id, ...input });
      } catch (error) {
        return databaseError(error);
      }
    }),
  }),
});
