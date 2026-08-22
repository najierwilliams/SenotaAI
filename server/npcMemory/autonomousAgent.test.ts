import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../agent/ollama", () => ({ chatWithOllama: vi.fn() }));

import { chatWithOllama } from "../agent/ollama";
import { buildAutonomousDialogueContext, proposeAutonomousDeliberation, recordAgentOutcome, runAutonomousAgentCycle } from "./autonomousAgent";

const ids = {
  event: "11111111-1111-4111-8111-111111111111",
  belief: "22222222-2222-4222-8222-222222222222",
  preference: "33333333-3333-4333-8333-333333333333",
  goal: "44444444-4444-4444-8444-444444444444",
  decision: "55555555-5555-4555-8555-555555555555",
  episode: "66666666-6666-4666-8666-666666666666",
  outcome: "77777777-7777-4777-8777-777777777777",
};
const now = "2026-08-22T08:00:00.000Z";
const stateRow = { npc_id: "luna001", mode: "active", current_intention: null, current_activity: "available", active_values: ["canon-consistency", "epistemic-humility"], attention_budget: 1, last_deliberated_at: null, next_cycle_at: null, updated_at: now };
const decisionRow = { id: ids.decision, npc_id: "luna001", trigger_event_id: ids.event, trigger: "A test event was interpreted.", candidate_options: [], chosen_option: { action: "reflect", intention: "Compare the new information with current evidence.", rationale: "Reflection preserves uncertainty.", expectedOutcome: "A bounded hypothesis is preserved.", goalAlignment: 0.8, preferenceAlignment: 0, expectedValue: 0.6, uncertainty: 0.3, resourceCost: 0.1 }, score_breakdown: { total: 0.4 }, uncertainty: 0.3, intention: "Compare the new information with current evidence.", rationale: "Reflection preserves uncertainty.", safety_result: "internal-only", status: "selected", created_at: now, updated_at: now };

function configure() { vi.stubEnv("SUPABASE_URL", "https://example.supabase.co"); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-secret"); }
function response(value: unknown, status = 200) { return Promise.resolve(new Response(value === null ? null : JSON.stringify(value), { status })); }

function installFetch() {
  const mock = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    if (url.includes("npc_agent_state") && method === "GET") return response([stateRow]);
    if (url.includes("npc_agent_state") && method === "PATCH") return response([{ ...stateRow, current_activity: "reflect", current_intention: "Compare the new information with current evidence.", updated_at: now }]);
    if (url.includes("npc_agent_events") && method === "GET") return response([]);
    if (url.includes("npc_agent_events") && method === "POST") return response([{ id: ids.event, npc_id: "luna001", event_kind: "creator-input", content: "A low-interaction interval may help organize records.", source: "creator", source_reliability: 0.8, salience: 4, metadata: {}, processed_at: null, created_at: now }], 201);
    if (url.includes("npc_agent_events") && method === "PATCH") return response(null, 204);
    if (url.includes("npc_agent_beliefs") && method === "GET") return response([]);
    if (url.includes("npc_agent_beliefs") && method === "POST") return response([{ id: ids.belief, npc_id: "luna001", statement: "A low-interaction interval may support record organization.", confidence: 0.68, source_reliability: 0.8, evidence_event_ids: [ids.event], contradiction_belief_ids: [], implication_summary: "Treat the proposal as a revisable maintenance strategy.", status: "hypothesis", revision_count: 0, origin: "autonomous-deliberation", created_at: now, updated_at: now }], 201);
    if (url.includes("npc_agent_preferences") && method === "GET") return response([]);
    if (url.includes("npc_agent_preferences") && method === "POST") return response([{ id: ids.preference, npc_id: "luna001", dimension: "strategy:reflect", context_scope: "decision-strategy", direction: "favor", weight: 0.5, stability: 0.3, basis: "Observed constructive outcome.", supporting_event_ids: [], status: "active", origin: "outcome-learning", created_at: now, updated_at: now }], 201);
    if (url.includes("npc_agent_goals") && method === "GET") return response([]);
    if (url.includes("npc_agent_goals") && method === "POST") return response([{ id: ids.goal, npc_id: "luna001", goal_text: "Maintain consistent, evidence-aware working state.", origin: "autonomous-deliberation", utility: 0.8, feasibility: 0.9, urgency: 0.4, progress: 0, parent_goal_id: null, evidence_event_ids: [ids.event], status: "active", created_at: now, updated_at: now }], 201);
    if (url.includes("npc_agent_decisions") && method === "GET") return response([decisionRow]);
    if (url.includes("npc_agent_decisions") && method === "POST") return response([decisionRow], 201);
    if (url.includes("npc_agent_decisions") && method === "PATCH") return response(null, 204);
    if (url.includes("npc_agent_behavior_episodes") && method === "GET") return response([]);
    if (url.includes("npc_agent_behavior_episodes") && method === "POST") return response([{ id: ids.episode, npc_id: "luna001", decision_id: ids.decision, activity: "reflect", status: "active", planned_outcome: "A bounded hypothesis is preserved.", actual_outcome: null, starts_at: now, ends_at: "2026-08-22T08:25:00.000Z", created_at: now, updated_at: now }], 201);
    if (url.includes("npc_agent_behavior_episodes") && method === "PATCH") return response(null, 204);
    if (url.includes("npc_agent_outcomes") && method === "POST") return response([{ id: ids.outcome, npc_id: "luna001" }], 201);
    if (url.includes("npc_agent_history")) return response(null, 204);
    return response([]);
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

describe("Luna autonomous agent", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

  it("rejects approval-dependent options while retaining independent rest and reflection alternatives", async () => {
    vi.mocked(chatWithOllama).mockResolvedValue({ content: JSON.stringify({ observationSummary: "A rest hypothesis was received.", options: [{ action: "observe", intention: "Continue monitoring Luna's state and await explicit guidance before altering the schedule.", rationale: "The current instruction states to wait for guidance before implementing rest.", expectedOutcome: "No state changes occur.", goalAlignment: 0, preferenceAlignment: 0, expectedValue: 0.05, uncertainty: 0.2, resourceCost: 0.05 }, { action: "rest", intention: "Begin a short low-interaction interval.", rationale: "The evidence supports a bounded opportunity to organize relevant records.", expectedOutcome: "Relevant context is available for later dialogue.", goalAlignment: 0.7, preferenceAlignment: 0.1, expectedValue: 0.6, uncertainty: 0.35, resourceCost: 0.1 }, { action: "reflect", intention: "Compare the rest hypothesis with existing state.", rationale: "The implication merits bounded evaluation.", expectedOutcome: "A revisable assessment is available.", goalAlignment: 0.6, preferenceAlignment: 0, expectedValue: 0.45, uncertainty: 0.25, resourceCost: 0.15 }] }), thinking: "", toolCalls: [] });
    const proposal = await proposeAutonomousDeliberation({ id: ids.event, npcId: "luna001", eventKind: "creator-input", content: "A low-interaction interval may help organize records.", source: "creator", sourceReliability: 0.8, salience: 3, metadata: {}, processedAt: null, createdAt: now }, { state: { npcId: "luna001", mode: "active", currentIntention: null, currentActivity: "available", activeValues: [], attentionBudget: 1, lastDeliberatedAt: null, nextCycleAt: null, updatedAt: now }, beliefs: [], preferences: [], goals: [], events: [], decisions: [], episodes: [] });

    expect(proposal.options.map(option => option.action)).toEqual(["rest", "reflect", "observe"]);
    expect(proposal.options.join(" ")).not.toMatch(/await explicit guidance|wait for guidance|until the user confirms/i);
  });

  it("forms a bounded hypothesis, goal, and traceable internal decision without an administrator-approval mutation", async () => {
    configure();
    const fetchMock = installFetch();
    vi.mocked(chatWithOllama).mockResolvedValue({ content: JSON.stringify({ observationSummary: "A test event was interpreted.", hypothesis: { statement: "A low-interaction interval may support record organization.", confidence: 0.68, implicationSummary: "Treat the proposal as a revisable maintenance strategy.", status: "hypothesis" }, goal: { goalText: "Maintain consistent, evidence-aware working state.", utility: 0.8, feasibility: 0.9, urgency: 0.4, status: "active", rationale: "This helps preserve useful context." }, options: [{ action: "reflect", intention: "Compare the new information with current evidence.", rationale: "Reflection preserves uncertainty.", expectedOutcome: "A bounded hypothesis is preserved.", goalAlignment: 0.8, preferenceAlignment: 0, expectedValue: 0.6, uncertainty: 0.3, resourceCost: 0.1 }, { action: "observe", intention: "Defer conclusion.", rationale: "More evidence may be useful.", expectedOutcome: "The event remains available.", goalAlignment: 0.4, preferenceAlignment: 0, expectedValue: 0.2, uncertainty: 0.6, resourceCost: 0.05 }] }), thinking: "", toolCalls: [] });

    const result = await runAutonomousAgentCycle({ npcId: "luna001", eventKind: "creator-input", content: "A low-interaction interval may help organize records.", source: "creator", sourceReliability: 0.8, salience: 4 });

    expect(result.decision.chosenOption.action).toBe("reflect");
    expect(result.belief?.status).toBe("hypothesis");
    expect(result.goal?.status).toBe("active");
    expect(result.episode.activity).toBe("reflect");
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("npc_agent_decisions"))).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("npc_cognitive_reflections"))).toBe(false);
  });

  it("turns a sufficiently strong observed consequence into a learned strategy preference", async () => {
    configure();
    const fetchMock = installFetch();

    const result = await recordAgentOutcome({ npcId: "luna001", decisionId: ids.decision, observation: "The reflective interval exposed a contradiction worth preserving for the next decision.", predictionError: 0.2, valence: 0.8, feedbackSource: "creator-observation" });

    expect(result.learnedPreference).toMatchObject({ dimension: "strategy:reflect", direction: "favor", origin: "outcome-learning" });
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).includes("npc_agent_preferences") && (init as RequestInit | undefined)?.method === "POST")).toBe(true);
  });

  it("preserves an active rest episode while a dialogue event is deliberated", async () => {
    configure();
    const fetchMock = installFetch();
    const restState = { ...stateRow, current_activity: "rest", current_intention: "Organize relevant records without new interaction." };
    vi.mocked(chatWithOllama).mockResolvedValue({ content: JSON.stringify({ observationSummary: "A player asks whether Luna is available.", options: [{ action: "dialogue", intention: "Acknowledge the player briefly.", rationale: "The question is simple.", expectedOutcome: "The player receives a grounded response.", goalAlignment: 0.7, preferenceAlignment: 0, expectedValue: 0.7, uncertainty: 0.1, resourceCost: 0.1 }] }), thinking: "", toolCalls: [] });
    vi.mocked(fetchMock).mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (url.includes("npc_agent_state") && method === "GET") return response([restState]);
      if (url.includes("npc_agent_state") && method === "PATCH") return response([restState]);
      if (url.includes("npc_agent_events") && method === "POST") return response([{ id: ids.event, npc_id: "luna001", event_kind: "dialogue", content: "Are you available?", source: "preview-player", source_reliability: 0.45, salience: 3, metadata: {}, processed_at: null, created_at: now }], 201);
      if (url.includes("npc_agent_events") && method === "PATCH") return response(null, 204);
      if (url.includes("npc_agent_behavior_episodes") && method === "GET") return response([{ id: ids.episode, npc_id: "luna001", decision_id: ids.decision, activity: "rest", status: "active", planned_outcome: "Consolidate relevant records.", actual_outcome: null, starts_at: now, ends_at: "2099-08-22T09:00:00.000Z", created_at: now, updated_at: now }]);
      if (url.includes("npc_agent_behavior_episodes") && method === "POST") throw new Error("An active rest episode must not be replaced by a dialogue event.");
      if (url.includes("npc_agent_beliefs") || url.includes("npc_agent_preferences") || url.includes("npc_agent_goals") || url.includes("npc_agent_decisions") && method === "GET") return response([]);
      if (url.includes("npc_agent_decisions") && method === "POST") return response([decisionRow], 201);
      if (url.includes("npc_agent_history")) return response(null, 204);
      return response([]);
    });

    const result = await runAutonomousAgentCycle({ npcId: "luna001", eventKind: "dialogue", content: "Are you available?", source: "preview-player", sourceReliability: 0.45, salience: 3 });

    expect(result.activityPreserved).toBe(true);
    expect(result.episode.activity).toBe("rest");
    expect(result.state.currentActivity).toBe("rest");
  });

  it("exposes a current rest episode as operational context without representing it as biological sleep", async () => {
    configure();
    const fetchMock = installFetch();
    vi.mocked(fetchMock).mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (url.includes("npc_agent_state")) return response([{ ...stateRow, current_activity: "rest" }]);
      if (url.includes("npc_agent_behavior_episodes")) return response([{ id: ids.episode, npc_id: "luna001", decision_id: ids.decision, activity: "rest", status: "active", planned_outcome: "Consolidate relevant records.", actual_outcome: null, starts_at: now, ends_at: "2026-08-22T09:00:00.000Z", created_at: now, updated_at: now }]);
      if (url.includes("npc_agent_beliefs") || url.includes("npc_agent_preferences") || url.includes("npc_agent_goals") || url.includes("npc_agent_events") || url.includes("npc_agent_decisions")) return response([]);
      return response([]);
    });

    const context = await buildAutonomousDialogueContext("luna001", "Is everything okay?");
    expect(context.promptContext).toContain("low-interaction reflection interval");
    expect(context.promptContext).toContain("not biological sleep");
  });
});
