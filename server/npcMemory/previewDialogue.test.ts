import { beforeEach, describe, expect, it, vi } from "vitest";

const buildNpcDialogueContext = vi.fn();
const rememberPlayerNpcInteraction = vi.fn();
const chatWithOllama = vi.fn();
vi.mock("./supabase", () => ({ buildNpcDialogueContext, rememberPlayerNpcInteraction }));
vi.mock("../agent/ollama", () => ({ chatWithOllama }));

const { runNpcPreviewDialogue } = await import("./previewDialogue");

describe("administrator NPC preview dialogue", () => {
  beforeEach(() => {
    buildNpcDialogueContext.mockReset().mockResolvedValue({
      npcId: "luna001",
      displayName: "Luna",
      playerMemories: [{ summary: "The player greeted Luna." }],
      promptContext: "NPC canon for Luna.\nLuna perceives the world and reflects before answering.",
    });
    chatWithOllama.mockReset().mockResolvedValue({ content: "I see you clearly, and I remember your greeting." });
    rememberPlayerNpcInteraction.mockReset().mockResolvedValue(undefined);
  });

  it("uses Luna canon and this preview player’s memories, then saves a bounded summary", async () => {
    const result = await runNpcPreviewDialogue({ playerId: "e3f8edc7-6a3a-437d-9d8e-afd23e6fbc50", npcId: "luna001", message: "What do you remember about our first meeting?" });

    expect(result).toMatchObject({ npcId: "luna001", displayName: "Luna", memoriesUsed: 1, memorySaved: true });
    expect(chatWithOllama).toHaveBeenCalledWith(expect.objectContaining({ messages: expect.arrayContaining([expect.objectContaining({ content: expect.stringContaining("NPC canon for Luna") })]) }));
    expect(rememberPlayerNpcInteraction).toHaveBeenCalledWith(expect.objectContaining({ npcId: "luna001", memoryKind: "summary", summary: expect.stringContaining("Preview conversation") }));
  });

  it("does not save preview memory when the user turns remembering off", async () => {
    const result = await runNpcPreviewDialogue({ playerId: "e3f8edc7-6a3a-437d-9d8e-afd23e6fbc50", npcId: "luna001", message: "Hello Luna.", remember: false });
    expect(result.memorySaved).toBe(false);
    expect(rememberPlayerNpcInteraction).not.toHaveBeenCalled();
  });
});
