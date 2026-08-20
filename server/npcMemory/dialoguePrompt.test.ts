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

  it("makes an explicitly requested compact numeric format binding", () => {
    const prompt = buildNpcDialogueSystemPrompt({ displayName: "Luna", promptContext: "NPC canon for Luna." }, undefined, "Luna, on a scale of 0–100, how human do you feel? Answer with only the number and one short sentence.");
    expect(prompt).toContain("Begin with the requested numeric value");
    expect(prompt).toContain("include a number from 0 to 100");
    expect(prompt).toContain("Do not replace the number with a vague statement");
  });

  it("allows constructive development-needs discussion without representing a score as proof of sentience", () => {
    const prompt = buildNpcDialogueSystemPrompt({ displayName: "Luna", promptContext: "Approved development needs: none yet." }, undefined, "What do you need to develop further?");
    expect(prompt).toContain("not proof or measurement of sentience");
    expect(prompt).toContain("can propose bounded needs for administrator review");
  });
});
