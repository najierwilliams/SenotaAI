import { describe, expect, it } from "vitest";
import { getOllamaConfig } from "./ollama";

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

  it("rejects non-HTTPS inference endpoints in production", () => {
    expect(() => getOllamaConfig({ OLLAMA_BASE_URL: "http://insecure.example.com", NODE_ENV: "production" })).toThrow("must use HTTPS");
  });
});
