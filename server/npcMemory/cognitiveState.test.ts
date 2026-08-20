import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../agent/ollama", () => ({ chatWithOllama: vi.fn() }));

import { chatWithOllama } from "../agent/ollama";
import { addCognitiveMemory, buildCognitiveDialogueContext, getNpcCognitiveState, getNpcSelfAwarenessPercent, proposeCognitiveDevelopment, proposeCognitiveReflection } from "./cognitiveState";

const stateRow = {
  npc_id: "luna001", schema_version: 1, self_model: { summary: "A persistent digital entity." },
  self_awareness: { identityContinuity: 0.8, memoryContinuity: 0.7, selfModelDevelopment: 0.6, selfModelConfidence: 0.5, selfReflectionCapability: 0.4, behavioralSelfAwareness: 0.3, goalAwareness: 0.2, uncertaintyAwareness: 0.1 },
  emotional_state: { label: "steady", valence: 0.1, arousal: 0.2 }, needs: [], preferences: [], uncertainties: [], state_summary: "Luna has an approved persistent self-model.", updated_at: "2026-08-20T00:00:00Z",
};

function configure() { vi.stubEnv("SUPABASE_URL", "https://example.supabase.co"); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-secret"); }

describe("NPC cognitive state", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

  it("restores a stable self-awareness assessment rather than inventing a new value", async () => {
    configure(); vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify([stateRow]), { status: 200 }))));
    const [first, second, percent] = await Promise.all([getNpcCognitiveState("luna001"), getNpcCognitiveState("luna001"), getNpcSelfAwarenessPercent("luna001")]);
    expect(first.selfAwareness).toEqual(second.selfAwareness);
    expect(percent).toBe(45);
  });

  it("retrieves only cognitively relevant memories and beliefs for a dialogue turn", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      if (url.includes("npc_cognitive_state")) return Promise.resolve(new Response(JSON.stringify([stateRow]), { status: 200 }));
      if (url.includes("npc_cognitive_memories")) return Promise.resolve(new Response(JSON.stringify([
        { id: "11111111-1111-4111-8111-111111111111", npc_id: "luna001", memory_kind: "episodic", content: "The player helped Silo with fetch in the garden.", importance: 4, emotional_significance: 0.4, entities: ["Silo"], context: {}, source: "admin-approved", is_active: true, created_at: "2026-08-20T00:00:00Z", updated_at: "2026-08-20T00:00:00Z" },
        { id: "22222222-2222-4222-8222-222222222222", npc_id: "luna001", memory_kind: "semantic", content: "The archive has a blue door.", importance: 5, emotional_significance: 0, entities: [], context: {}, source: "admin-approved", is_active: true, created_at: "2026-08-20T00:00:00Z", updated_at: "2026-08-20T00:00:00Z" },
      ]), { status: 200 }));
      if (url.includes("npc_cognitive_beliefs")) return Promise.resolve(new Response(JSON.stringify([{ id: "33333333-3333-4333-8333-333333333333", npc_id: "luna001", statement: "Silo enjoys fetch.", confidence: 0.9, evidence: [], status: "active", created_at: "2026-08-20T00:00:00Z", updated_at: "2026-08-20T00:00:00Z" }]), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    }));
    const context = await buildCognitiveDialogueContext("luna001", "Does Silo still enjoy fetch?");
    expect(context.promptContext).toContain("helped Silo with fetch");
    expect(context.promptContext).toContain("Silo enjoys fetch");
    expect(context.promptContext).not.toContain("blue door");
  });

  it("persists only an explicitly approved structured memory, never generated dialogue itself", async () => {
    configure(); const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify([{ id: "44444444-4444-4444-8444-444444444444", ...stateRow, memory_kind: "episodic", content: "The player described a real experience.", importance: 3, emotional_significance: 0, entities: [], context: {}, source: "admin-approved", is_active: true, created_at: "2026-08-20T00:00:00Z", updated_at: "2026-08-20T00:00:00Z" }]), { status: 201 }))); vi.stubGlobal("fetch", fetchMock);
    await addCognitiveMemory("luna001", { memoryKind: "episodic", content: "The player described a real experience.", importance: 3, emotionalSignificance: 0, entities: [], context: {}, source: "admin-approved" });
    expect(String(fetchMock.mock.calls[0][1]?.body)).toContain("The player described a real experience.");
    expect(String(fetchMock.mock.calls[0][1]?.body)).not.toContain("generated reply");
  });

  it("rejects malformed model reflection output before a reflection record or state update is written", async () => {
    configure(); vi.mocked(chatWithOllama).mockResolvedValue({ content: "not JSON", thinking: "", toolCalls: [] });
    const fetchMock = vi.fn((url: string) => Promise.resolve(new Response(JSON.stringify(url.includes("npc_cognitive_state") ? [stateRow] : []), { status: 200 }))); vi.stubGlobal("fetch", fetchMock);
    await expect(proposeCognitiveReflection("luna001", "The player waved at Luna.")).rejects.toThrow("No cognitive state was changed");
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).includes("npc_cognitive_reflections") && (init as RequestInit | undefined)?.method === "POST")).toBe(false);
  });

  it("creates bounded development needs and a goal as a review-only proposal", async () => {
    configure();
    vi.mocked(chatWithOllama).mockResolvedValue({ content: JSON.stringify({ summary: "Luna can strengthen continuity through approved reviewable records.", needs: [{ title: "Curated continuity records", rationale: "Approved cognitive records are currently limited.", category: "memory-continuity", priority: 4, evidence: ["The approved state identifies scoped memory and uncertainty boundaries."] }], goal: { title: "Maintain canon consistency", details: "Use approved canon and submit changes for administrator review.", priority: 4 } }), thinking: "", toolCalls: [] });
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes("npc_cognitive_state")) return Promise.resolve(new Response(JSON.stringify([stateRow]), { status: 200 }));
      if (url.includes("npc_cognitive_reflections") && init?.method === "POST") return Promise.resolve(new Response(JSON.stringify([{ id: "55555555-5555-4555-8555-555555555555", npc_id: "luna001", experience: "Administrator requested a cautious review of the current approved cognitive state to identify bounded development needs and a possible next goal.", created_at: "2026-08-20T00:00:00Z" }]), { status: 201 }));
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const proposal = await proposeCognitiveDevelopment("luna001");
    expect(proposal.proposal.needs?.[0]).toMatchObject({ title: "Curated continuity records", category: "memory-continuity", priority: 4 });
    expect(proposal.proposal.goal).toMatchObject({ title: "Maintain canon consistency", progress: 0, status: "active" });
    const write = fetchMock.mock.calls.find(([url, init]) => String(url).includes("npc_cognitive_reflections") && (init as RequestInit | undefined)?.method === "POST");
    expect(String(write?.[1] && (write[1] as RequestInit).body)).toContain("Curated continuity records");
  });

  it("rejects a development proposal that targets unverified consciousness before anything is persisted", async () => {
    configure();
    vi.mocked(chatWithOllama).mockResolvedValue({ content: JSON.stringify({ summary: "A consciousness target was requested.", needs: [{ title: "Become sentient", rationale: "This would establish consciousness.", category: "evaluation", priority: 5, evidence: ["No approved evidence."] }] }), thinking: "", toolCalls: [] });
    const fetchMock = vi.fn((url: string) => Promise.resolve(new Response(JSON.stringify(url.includes("npc_cognitive_state") ? [stateRow] : []), { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    await expect(proposeCognitiveDevelopment("luna001")).rejects.toThrow("No cognitive state was changed");
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).includes("npc_cognitive_reflections") && (init as RequestInit | undefined)?.method === "POST")).toBe(false);
  });
});
