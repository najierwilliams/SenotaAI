import { afterEach, describe, expect, it, vi } from "vitest";

const workspace = {
  id: "168a5359-e2c0-49d6-ad0c-cd886d6074d4",
  ownerScope: "senota-user-1",
};

vi.mock("../knowledgeSpace/supabase", () => ({
  getOrCreateKnowledgeWorkspace: vi.fn(async () => workspace),
}));

function cognitiveStateRow() {
  return {
    workspace_id: workspace.id,
    owner_scope: workspace.ownerScope,
    identity_summary: "Luna is a bounded software cognitive environment.",
    capabilities: ["Persistent Knowledge Space"],
    limitations: ["No unestablished coordinates."],
    current_focus: null,
    active_goal_ids: [],
    uncertainty_summary: "Uncertainty remains explicit.",
    autonomy_enabled: true,
    maintenance_enabled: false,
    current_version: 1,
    updated_at: "2026-08-27T00:00:00.000Z",
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Luna cognitive persistence", () => {
  it("recovers from concurrent first-load state creation without fabricating a failure", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
    const row = cognitiveStateRow();
    let stateReadCount = 0;
    let stateInsertCount = 0;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (url.includes("luna_cognitive_state") && method === "GET") {
        stateReadCount += 1;
        return new Response(JSON.stringify(stateReadCount <= 2 ? [] : [row]), { status: 200 });
      }
      if (url.includes("luna_cognitive_state") && method === "POST") {
        stateInsertCount += 1;
        if (stateInsertCount === 1) return new Response(JSON.stringify([row]), { status: 201 });
        return new Response(JSON.stringify({ code: "23505", message: "duplicate key value violates unique constraint" }), { status: 409 });
      }
      if (url.includes("luna_cognitive_versions") || url.includes("luna_cognitive_audit_events")) {
        return new Response(JSON.stringify([{ id: "created" }]), { status: 201 });
      }
      throw new Error(`Unexpected request: ${method} ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { getOrCreateLunaSelfState } = await import("./supabase");
    const [first, second] = await Promise.all([
      getOrCreateLunaSelfState(1),
      getOrCreateLunaSelfState(1),
    ]);

    expect(stateInsertCount).toBe(2);
    expect(first.self.workspaceId).toBe(workspace.id);
    expect(second.self.workspaceId).toBe(workspace.id);
    expect(first.self.identitySummary).toBe(second.self.identitySummary);
  });

  it("persists and reloads every creator-controlled Foundation field from the Luna cognitive state", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
    let persisted = {
      ...cognitiveStateRow(),
      luna_name: "Luna",
      luna_starting_age: 0,
      luna_current_age: 0,
      luna_native_language: "English",
      luna_personality_foundation: "Curious, reflective, kind, and safety bounded.",
      luna_personality_knowledge: "Creator-provided foundational context.",
      luna_appearance_reference: "Creator controlled appearance reference.",
    };
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (url.includes("luna_cognitive_state") && method === "GET") return new Response(JSON.stringify([persisted]), { status: 200 });
      if (url.includes("luna_cognitive_state") && method === "PATCH") {
        const patch = JSON.parse(String(init?.body));
        persisted = { ...persisted, ...patch };
        return new Response(JSON.stringify([persisted]), { status: 200 });
      }
      if (url.includes("luna_cognitive_versions") || url.includes("luna_cognitive_audit_events")) return new Response(JSON.stringify([{ id: "recorded" }]), { status: 201 });
      throw new Error(`Unexpected request: ${method} ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { getOrCreateLunaSelfState, updateLunaSelfState } = await import("./supabase");
    const foundation = {
      name: "Nova",
      currentAge: 12,
      nativeLanguage: "Spanish",
      personalityFoundation: "Thoughtful, curious, kind, and explicit about uncertainty.",
      personalityKnowledge: "The creator provided this starting context for ongoing development.",
      appearanceReference: "Creator-controlled reference: silver hair and amber eyes.",
    };
    const updated = await updateLunaSelfState({ userId: 1, foundation, reason: "Creator updated Luna Foundation starting context.", actor: "knowledge-owner" });
    const reloaded = await getOrCreateLunaSelfState(1);

    expect(updated.self.foundation).toEqual(foundation);
    expect(reloaded.self.foundation).toEqual(foundation);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("luna_cognitive_state"), expect.objectContaining({ method: "PATCH" }));
  });

  it("rejects an autonomous decision whose source is not in the verified owner workspace before writing", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if ((init?.method ?? "GET") === "GET" && url.includes("luna_knowledge_gaps")) return new Response(JSON.stringify([]), { status: 200 });
      throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createOrGetLunaAutonomousDecision } = await import("./supabase");
    await expect(createOrGetLunaAutonomousDecision({
      userId: 1, sourceType: "KNOWLEDGE_GAP", sourceId: "gap-outside-owner", decisionKey: "a".repeat(64),
      objective: "Resolve a bounded persisted owner-scoped knowledge gap.", status: "RECOMMENDED", outcome: "NO_ACTION",
      priorityScore: 0.8, policyVersion: "luna-m5-v1", rationale: "A deterministic owner-scoped test decision.", evidence: {},
      budget: { maxWorkers: 4, maxSteps: 24, maxRetries: 2, maxDurationSeconds: 900, maxModelRequests: 12, maxTokenBudget: 24_000 },
    })).rejects.toThrow("Autonomous decision source is unavailable in this owner workspace.");
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("luna_autonomous_decisions"), expect.objectContaining({ method: "POST" }));
  });

  it("rejects a result validation when its worker is not in the specified owner-scoped mission", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if ((init?.method ?? "GET") !== "GET") throw new Error(`Unexpected write: ${init?.method} ${url}`);
      if (url.includes("luna_missions")) return new Response(JSON.stringify([{ id: "mission-1" }]), { status: 200 });
      if (url.includes("luna_workers")) return new Response(JSON.stringify([{ mission_id: "other-mission" }]), { status: 200 });
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createOrGetLunaResultValidation } = await import("./supabase");
    await expect(createOrGetLunaResultValidation({
      userId: 1, missionId: "mission-1", workerId: "worker-outside-mission", status: "ACCEPTED", outputHash: "b".repeat(64),
      resultSummary: "Bounded validation test.", checks: { nonEmpty: true }, detail: "The validation worker must belong to the persisted mission.",
    })).rejects.toThrow("Validation worker is unavailable in the specified owner-scoped mission.");
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("luna_result_validations"), expect.objectContaining({ method: "POST" }));
  });
});
