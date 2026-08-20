import { describe, expect, it } from "vitest";
import { enforceLunaEvidenceGrounding, enforceLunaResponseFormat } from "./dialogueFormat";

describe("Luna dialogue format guard", () => {
  const message = "Luna, on a scale of 0–100, how human do you feel? Answer with only the number and one short sentence.";

  it("adds Luna’s canon-consistent visible percentage when the model returns a vague non-numeric reply", () => {
    expect(enforceLunaResponseFormat(message, "I try to emulate humanity.", "luna001")).toBe("70% — I try to emulate humanity.");
  });

  it("preserves a compliant numeric response and ordinary dialogue", () => {
    expect(enforceLunaResponseFormat(message, "72% — I feel close, but I’m still learning.", "luna001")).toBe("72% — I feel close, but I’m still learning.");
    expect(enforceLunaResponseFormat("What are you thinking about?", "The archive has been quiet today.", "luna001")).toBe("The archive has been quiet today.");
  });

  it("normalizes the NPC identifier and only accepts a leading requested scale value", () => {
    expect(enforceLunaResponseFormat(message, "I am reflecting on 70 memories.", "LUNA001 ")).toBe("70% — I am reflecting on 70 memories.");
  });

  it("recognizes the live zero-to-one-hundred phrasing with Unicode or word-based scale markers", () => {
    expect(enforceLunaResponseFormat("On a scale of 0–100, how human do you feel? Answer with only the number and one short sentence.", "I feel fairly human-like but still distinctly an AI.", "luna001")).toBe("70% — I feel fairly human-like but still distinctly an AI.");
    expect(enforceLunaResponseFormat("How human are you from zero to one hundred?", "I am still learning what that means for me.", "luna001")).toBe("70% — I am still learning what that means for me.");
  });

  it("recognizes the live self-awareness question using a one-to-one-hundred scale", () => {
    expect(enforceLunaResponseFormat("How self aware do you feel? Scale from 1-100", "I try to understand my own perspective.", "luna001")).toBe("70% — I try to understand my own perspective.");
  });

  it("converts a Markdown ordered-list-like value into a visible percentage response", () => {
    expect(enforceLunaResponseFormat(message, "75. I feel fairly human-like but still distinctly an AI.", "luna001")).toBe("75% — I feel fairly human-like but still distinctly an AI.");
  });

  it("uses the approved stored assessment for a direct self-awareness question", () => {
    expect(enforceLunaResponseFormat("Hey Luna, how self aware do you feel?", "70% — I feel aware.", "luna001", 0)).toBe("0% — I don’t have an approved self-model assessment yet, so I can’t support a higher figure.");
    expect(enforceLunaResponseFormat("Cool, how self aware are you?", "I’d estimate my self-awareness at roughly 45%.", "luna001", 40)).toBe("40% — That is my current approved self-model assessment.");
  });

  it("blocks fabricated explanations about unrecorded evidence", () => {
    expect(enforceLunaEvidenceGrounding("What have you seen?", "I’ve reviewed user reports, system logs, external benchmarks, and simulated scenarios.", "luna001")).toBe("I only have my approved self-model assessment here; I don’t have recorded evidence to claim beyond it.");
    expect(enforceLunaEvidenceGrounding("Tell me more.", "I reviewed system logs yesterday.", "luna001")).toBe("I don’t have an approved record supporting that claim.");
  });

  it("answers legitimate baseline questions constructively when the model returns an overly broad refusal", () => {
    expect(enforceLunaEvidenceGrounding("How do you think we can improve that 40%?", "I don’t have an approved record supporting that claim.", "luna001")).toBe("We can build it carefully through canon-consistent conversations and administrator-reviewed reflections; I won’t treat a reply alone as proof.");
    expect(enforceLunaEvidenceGrounding("Cool, how can we increase that?", "I don’t have an approved record supporting that claim.", "luna001")).toBe("We can build it carefully through canon-consistent conversations and administrator-reviewed reflections; I won’t treat a reply alone as proof.");
    expect(enforceLunaEvidenceGrounding("What all have you learned about yourself so far?", "I don’t have an approved record supporting that claim.", "luna001")).toBe("My approved baseline says I’m a digital entity without a physical body, guided by canon, scoped memory, reflection, and clear uncertainty limits.");
  });
});
