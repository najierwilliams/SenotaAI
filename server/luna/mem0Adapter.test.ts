import { afterEach, describe, expect, it, vi } from "vitest";
import { createLunaMem0Adapter } from "./mem0Adapter";

const originalEnabled = process.env.MEM0_ENABLED;
const originalKey = process.env.MEM0_OPENAI_API_KEY;

afterEach(() => {
  if (originalEnabled === undefined) delete process.env.MEM0_ENABLED;
  else process.env.MEM0_ENABLED = originalEnabled;
  if (originalKey === undefined) delete process.env.MEM0_OPENAI_API_KEY;
  else process.env.MEM0_OPENAI_API_KEY = originalKey;
});

describe("Luna Mem0 memory-intelligence adapter", () => {
  it("fails closed when Mem0 is not configured", async () => {
    delete process.env.MEM0_ENABLED;
    delete process.env.MEM0_OPENAI_API_KEY;
    const factory = vi.fn();
    const adapter = createLunaMem0Adapter(factory);

    await expect(adapter.searchRelevant({ workspaceId: "workspace-1", query: "remember" })).resolves.toEqual([]);
    await expect(adapter.addExperience({ workspaceId: "workspace-1", messages: "A bounded experience", sourceType: "LUNA" })).resolves.toEqual([]);
    expect(factory).not.toHaveBeenCalled();
  });

  it("scopes candidate extraction and retrieval to the Luna workspace without persisting authority in Mem0", async () => {
    process.env.MEM0_ENABLED = "true";
    process.env.MEM0_OPENAI_API_KEY = "test-key";
    const add = vi.fn().mockResolvedValue({ results: [{ id: "candidate-1", memory: "A candidate", score: 0.8, metadata: { kind: "candidate" } }] });
    const search = vi.fn().mockResolvedValue({ results: [{ id: "candidate-2", memory: "A relevant candidate", score: 0.9 }] });
    const adapter = createLunaMem0Adapter(() => ({ add, search } as never));

    await expect(adapter.addExperience({ workspaceId: "workspace-7", messages: "An experience", sourceType: "USER", sourceId: "experience-1" })).resolves.toEqual([
      { id: "candidate-1", content: "A candidate", score: 0.8, metadata: { kind: "candidate" } },
    ]);
    await expect(adapter.searchRelevant({ workspaceId: "workspace-7", query: "candidate", limit: 4 })).resolves.toEqual([
      { id: "candidate-2", content: "A relevant candidate", score: 0.9, metadata: {} },
    ]);

    expect(add).toHaveBeenCalledWith("An experience", expect.objectContaining({ userId: "workspace-7", infer: true, metadata: { sourceType: "USER", sourceId: "experience-1" } }));
    expect(search).toHaveBeenCalledWith("candidate", { topK: 4, filters: { user_id: "workspace-7" } });
  });
});
