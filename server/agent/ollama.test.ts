import { describe, expect, it, vi } from "vitest";
import { getOllamaConfig, streamChatWithOllama } from "./ollama";

describe("Ollama configuration", () => {
  it("requires an endpoint before an agent can execute", () => {
    expect(() => getOllamaConfig({})).toThrow("OLLAMA_BASE_URL");
  });

  it("normalizes a configured HTTPS endpoint and optional key", () => {
    expect(getOllamaConfig({
      OLLAMA_BASE_URL: "https://models.example.com/",
      OLLAMA_API_KEY: "secret-token",
      OLLAMA_DEFAULT_MODEL: "qwen3-coder",
      NODE_ENV: "production",
    })).toEqual({
      baseUrl: "https://models.example.com",
      apiKey: "secret-token",
      defaultModel: "qwen3-coder",
    });
  });

  it("uses GLM-5.3-Flash by default and supports the deep model override", () => {
    expect(getOllamaConfig({ OLLAMA_BASE_URL: "https://ollama.com" }).defaultModel).toBe("glm-5.3-flash:cloud");
    expect(getOllamaConfig({ OLLAMA_BASE_URL: "https://ollama.com", OLLAMA_DEFAULT_MODEL: "glm-5.3:cloud" }).defaultModel).toBe("glm-5.3:cloud");
  });

  it("uses the Flash default and forwards conversation context in a streamed request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"message":{"content":"hello"}}\n{"done":true}\n', { status: 200, headers: { "Content-Type": "application/x-ndjson" } }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("OLLAMA_BASE_URL", "https://ollama.com");
    await expect(streamChatWithOllama({ messages: [{ role: "user", content: "Remember the persisted context." }] }, () => undefined)).resolves.toMatchObject({ content: "hello" });
    const request = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as { model: string; messages: unknown[]; stream: boolean };
    expect(request.model).toBe("glm-5.3-flash:cloud");
    expect(request.messages).toEqual([{ role: "user", content: "Remember the persisted context." }]);
    expect(request.stream).toBe(true);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("rejects non-HTTPS inference endpoints in production", () => {
    expect(() => getOllamaConfig({ OLLAMA_BASE_URL: "http://insecure.example.com", NODE_ENV: "production" })).toThrow("must use HTTPS");
  });
});
