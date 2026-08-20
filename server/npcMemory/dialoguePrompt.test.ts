import { describe, expect, it } from "vitest";
import { buildNpcDialogueSystemPrompt } from "./dialoguePrompt";

describe("NPC dialogue prompt", () => {
  it("prioritizes canon voice and short direct answers over unsolicited poetic monologues", () => {
    const prompt = buildNpcDialogueSystemPrompt({
      displayName: "Luna",
      promptContext: "NPC canon for Luna.\nVoice tone directives:\n- Grounded and warm.\nConversational style directives:\n- Answer simply first.",
    });
    expect(prompt).toContain("Voice tone directives");
    expect(prompt).toContain("one short sentence");
    expect(prompt).toContain("Do not open with atmospheric imagery");
    expect(prompt).toContain("a short question deserves a short answer");
  });
});
