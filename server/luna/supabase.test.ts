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
});
