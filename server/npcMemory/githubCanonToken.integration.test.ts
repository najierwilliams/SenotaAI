import { describe, expect, it } from "vitest";

describe("dedicated private canon vault credential", () => {
  it("can read the Obsidian canon template from the configured private repository", async () => {
    const token = process.env.NPC_CANON_GITHUB_TOKEN;
    expect(token).toBeTruthy();
    const response = await fetch("https://api.github.com/repos/najierwilliams/SenotaAI-NPC-Canon/contents/NPCs/_template.md", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "SenotaAI-canon-token-validation",
      },
    });
    expect(response.status).toBe(200);
    const file = await response.json() as { type?: string; content?: string; encoding?: string };
    expect(file.type).toBe("file");
    expect(file.encoding).toBe("base64");
    expect(file.content).toBeTruthy();
  });
});
