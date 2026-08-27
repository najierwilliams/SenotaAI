import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { TrpcContext } from "../_core/context";
import { knowledgeRouter } from "../routers/knowledge";
import { calculateKnowledgeHealth, isKnowledgeSpaceCloudReady } from "./supabase";
import { createKnowledgeWorkerReportPrompt } from "./missionRunner";
import type { KnowledgeObject, KnowledgeRelationship } from "@shared/knowledgeSpace";

function context(): TrpcContext {
  return {
    user: {
      id: 902,
      openId: "knowledge-test-owner",
      email: "owner@example.test",
      name: "Knowledge Test Owner",
      loginMethod: "test",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const object = (overrides: Partial<KnowledgeObject> = {}): KnowledgeObject => ({
  id: "00000000-0000-4000-8000-000000000011",
  workspaceId: "00000000-0000-4000-8000-000000000001",
  objectType: "NOTE",
  title: "Test note",
  description: "",
  content: "",
  sourceType: "USER_NOTE",
  truthState: "USER_APPROVED",
  status: "ACTIVE",
  tags: [],
  scientificMetadata: {},
  provenance: {},
  immutableProviderSnapshot: false,
  currentVersion: 1,
  isPinned: false,
  isFavorite: false,
  deletedAt: null,
  createdAt: "2026-08-27T00:00:00.000Z",
  updatedAt: "2026-08-27T00:00:00.000Z",
  ...overrides,
});

describe("Knowledge Space boundaries", () => {
  it("never lets an owner-created object assert VERIFIED scientific truth", async () => {
    const caller = knowledgeRouter.createCaller(context());
    await expect(caller.object.create({
      objectType: "SCIENTIFIC_STRUCTURE",
      title: "Unsupported verification",
      sourceType: "USER_FACT",
      truthState: "VERIFIED",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("never lets an owner-created relationship assert PROVIDER_CONFIRMED", async () => {
    const caller = knowledgeRouter.createCaller(context());
    await expect(caller.relationship.create({
      sourceObjectId: "00000000-0000-4000-8000-000000000011",
      targetObjectId: "00000000-0000-4000-8000-000000000012",
      relationshipType: "MAPPED_TO",
      sourceType: "USER_NOTE",
      truthState: "PROVIDER_CONFIRMED",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not substitute browser-local storage when server persistence is unavailable", async () => {
    expect(isKnowledgeSpaceCloudReady()).toBe(false);
    const caller = knowledgeRouter.createCaller(context());
    await expect(caller.snapshot()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("keeps evidence gaps and active worker states visible in health metrics", () => {
    const relationship: KnowledgeRelationship = {
      id: "00000000-0000-4000-8000-000000000031",
      workspaceId: "00000000-0000-4000-8000-000000000001",
      sourceObjectId: "00000000-0000-4000-8000-000000000011",
      targetObjectId: "00000000-0000-4000-8000-000000000012",
      relationshipType: "UNMAPPED_TO",
      sourceType: "PUBLISHED_EVIDENCE",
      truthState: "UNMAPPED",
      confidence: null,
      evidence: {},
      provenance: {},
      createdAt: "2026-08-27T00:00:00.000Z",
      updatedAt: "2026-08-27T00:00:00.000Z",
    };
    const health = calculateKnowledgeHealth({
      objects: [
        object({ objectType: "FOLDER" }),
        object({ id: "00000000-0000-4000-8000-000000000012", objectType: "SCIENTIFIC_STRUCTURE", truthState: "NOT_ESTABLISHED" }),
        object({ id: "00000000-0000-4000-8000-000000000013", objectType: "RESEARCH_QUESTION" }),
      ],
      relationships: [relationship],
      missions: [{ id: "mission-1", state: "RESEARCHING" }, { id: "mission-2", state: "MISSION_LIMIT_REACHED" }] as never,
      approvals: [{ id: "approval-1", status: "REQUESTED" }] as never,
    });
    expect(health).toMatchObject({
      totalObjects: 3,
      folders: 1,
      scientificRecords: 1,
      openQuestions: 1,
      unresolvedRelationships: 1,
      pendingApprovals: 1,
      activeMissions: 1,
      failedMissions: 1,
      evidenceGaps: 1,
      requiresAttention: 1,
    });
  });

  it("bounds every on-demand worker to existing context and preserved scientific safety", () => {
    const prompt = createKnowledgeWorkerReportPrompt({
      objective: "Organize hippocampus research.",
      role: "RESEARCHER",
      context: "A reviewed local note.",
    });
    expect(prompt).toContain("strictly from the workspace context");
    expect(prompt).toContain("Do not browse, fetch, claim access to, or invent external sources");
    expect(prompt).toContain("NOT_ESTABLISHED");
    expect(prompt).toContain("0 authoritative / 0 probabilistic / 0 requires-domain-review / 102 unmapped");
    expect(prompt).toContain("targeting coordinate");
    expect(prompt).toContain("physical nanotechnology");
    expect(prompt).toContain("A Knowledge Space object is not a biological target");
  });

  it("ships a dedicated migration with RLS and immutable audit-event enforcement", () => {
    const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/20260827_knowledge_space.sql"), "utf8");
    expect(sql).toContain("create table if not exists public.luna_knowledge_objects");
    expect(sql).toContain("create table if not exists public.luna_knowledge_audit_events");
    expect(sql).toContain("create table if not exists public.luna_knowledge_missions");
    expect(sql).toContain("luna_prevent_audit_mutation");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("No browser-facing policies are created");
  });
});
