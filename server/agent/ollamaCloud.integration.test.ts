import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

describe("configured Ollama Cloud endpoint", () => {
  it("authenticates and lists models through the native Ollama API without exposing the key", async () => {
    const baseUrl = process.env.OLLAMA_BASE_URL?.replace(/\/$/, "");
    const apiKey = process.env.OLLAMA_API_KEY;
    expect(baseUrl).toBe("https://ollama.com");
    expect(apiKey).toBeTruthy();

    let stdout: string;
    try {
      ({ stdout } = await execFileAsync("curl", [
        "-4", "--retry", "2", "--retry-all-errors", "--retry-delay", "1", "--connect-timeout", "8", "--max-time", "15", "-sS", "-o", "/dev/null", "-w", "%{http_code}",
        "-H", `Authorization: Bearer ${apiKey}`,
        `${baseUrl}/api/tags`,
      ]));
    } catch {
      throw new Error("Ollama Cloud model-list validation encountered a transient transport failure.");
    }
    expect(stdout.trim()).toBe("200");
  }, 45_000);
});
