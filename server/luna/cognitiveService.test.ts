import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listLunaMemories: vi.fn(),
  getOrCreateLunaSelfState: vi.fn(),
  retrieveRelevantMemories: vi.fn(),
  buildBoundedCognitiveContext: vi.fn(),
  buildRelevantFoundationContext: vi.fn(),
  explainMemoryRetrieval: vi.fn(),
  searchRelevant: vi.fn(),
}));

vi.mock("./supabase", () => ({ listLunaMemories: mocks.listLunaMemories, getOrCreateLunaSelfState: mocks.getOrCreateLunaSelfState }));
vi.mock("./cognition", () => ({
  buildBoundedCognitiveContext: mocks.buildBoundedCognitiveContext,
  calculateCognitiveHealth: vi.fn(),
  deriveAttentionFromState: vi.fn(),
  findExactDuplicateMemoryClusters: vi.fn(),
  retrieveRelevantMemories: mocks.retrieveRelevantMemories,
}));
vi.mock("./milestone1", () => ({ buildObservedLunaSelfModel: vi.fn(), explainMemoryRetrieval: mocks.explainMemoryRetrieval }));
vi.mock("./milestone2", () => ({ inspectLunaClaims: vi.fn() }));
vi.mock("./milestone3", () => ({ inspectLunaAttentionSystem: vi.fn() }));
vi.mock("./milestone4", () => ({ adviseLunaWorkerSelection: vi.fn() }));
vi.mock("./milestone5", () => ({ summarizeLunaLearning: vi.fn() }));
vi.mock("./developmentalContext", () => ({ buildRelevantFoundationContext: mocks.buildRelevantFoundationContext }));
vi.mock("./milestone5ActionLoop", () => ({ assessNextLunaAutonomousDecision: vi.fn() }));
vi.mock("./mem0Adapter", () => ({ lunaMem0Adapter: { searchRelevant: mocks.searchRelevant } }));

import { retrieveLunaContext } from "./cognitiveService";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listLunaMemories.mockResolvedValue([{ id: "memory-1" }]);
  mocks.getOrCreateLunaSelfState.mockResolvedValue({ self: { workspaceId: "workspace-7", foundation: { name: "Luna" } } });
  mocks.searchRelevant.mockResolvedValue([{ id: "mem0-1", content: "candidate", score: 0.8, metadata: {} }]);
  mocks.retrieveRelevantMemories.mockReturnValue([{ id: "memory-1" }]);
  mocks.buildBoundedCognitiveContext.mockReturnValue("authoritative context");
  mocks.buildRelevantFoundationContext.mockReturnValue("");
  mocks.explainMemoryRetrieval.mockReturnValue({ retrievedCount: 1 });
});

describe("Luna cognitive retrieval with Mem0 intelligence", () => {
  it("keeps Luna memories authoritative while exposing scoped Mem0 candidates separately", async () => {
    const result = await retrieveLunaContext({ userId: 7, query: "What should I remember?", limit: 4 });

    expect(mocks.searchRelevant).toHaveBeenCalledWith({ workspaceId: "workspace-7", query: "What should I remember?", limit: 4 });
    expect(result.memories).toEqual([{ id: "memory-1" }]);
    expect(result.mem0Candidates).toEqual([{ id: "mem0-1", content: "candidate", score: 0.8, metadata: {} }]);
    expect(result.promptContext).toBe("authoritative context");
  });
});
