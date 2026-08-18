import { describe, expect, it, vi } from "vitest";

const chatWithOllama = vi.fn();
vi.mock("../agent/ollama", () => ({ chatWithOllama }));

const { agentRouter } = await import("./agent");

describe("direct Ollama chat", () => {
  it("accepts a public conversation without a database-backed owner session", async () => {
    chatWithOllama.mockResolvedValueOnce({ content: "I can help you build that.", thinking: "" });
    const caller = agentRouter.createCaller({ user: null } as never);

    await expect(caller.chat({ messages: [{ role: "user", content: "Help me plan a web app." }] }))
      .resolves.toEqual({ content: "I can help you build that.", thinking: "" });
    expect(chatWithOllama).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([expect.objectContaining({ role: "system" }), expect.objectContaining({ role: "user" })]),
    }));
  });
});
