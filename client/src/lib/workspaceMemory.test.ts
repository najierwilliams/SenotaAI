import { describe, expect, it } from "vitest";
import { addWorkspaceMemory, createWorkspaceMemory, findRelevantMemories, hasSensitiveMemoryContent } from "./workspaceMemory";

describe("workspace memory", () => {
  it("blocks secret-like content before it can become durable memory", () => {
    expect(hasSensitiveMemoryContent("GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz123456")).toBe(true);
    expect(() => createWorkspaceMemory({ category: "context", content: "api_key: hidden-value", importance: 3 })).toThrow("do not save");
  });

  it("recalls the most relevant saved project fact", () => {
    const memories = addWorkspaceMemory([], createWorkspaceMemory({
      category: "project",
      content: "The SenotaAI frontend uses React, Vite, and Tailwind.",
      importance: 4,
    }));
    memories.push(createWorkspaceMemory({
      category: "preference",
      content: "Use confirmation before destructive deployment actions.",
      importance: 3,
    }));

    expect(findRelevantMemories(memories, "Can you update the React frontend?", 1)[0]?.content).toContain("React");
  });
});
