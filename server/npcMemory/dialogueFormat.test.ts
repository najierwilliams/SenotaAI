import { describe, expect, it } from "vitest";
import { enforceLunaResponseFormat } from "./dialogueFormat";

describe("Luna dialogue format guard", () => {
  const message = "Luna, on a scale of 0–100, how human do you feel? Answer with only the number and one short sentence.";

  it("adds Luna’s canon-consistent number when the model returns a vague non-numeric reply", () => {
    expect(enforceLunaResponseFormat(message, "I try to emulate humanity.", "luna001")).toBe("70. I try to emulate humanity.");
  });

  it("preserves a compliant numeric response and ordinary dialogue", () => {
    expect(enforceLunaResponseFormat(message, "72% — I feel close, but I’m still learning.", "luna001")).toBe("72% — I feel close, but I’m still learning.");
    expect(enforceLunaResponseFormat("What are you thinking about?", "The archive has been quiet today.", "luna001")).toBe("The archive has been quiet today.");
  });

  it("normalizes the NPC identifier and only accepts a leading requested scale value", () => {
    expect(enforceLunaResponseFormat(message, "I am reflecting on 70 memories.", "LUNA001 ")).toBe("70. I am reflecting on 70 memories.");
  });

  it("recognizes the live zero-to-one-hundred phrasing with Unicode or word-based scale markers", () => {
    expect(enforceLunaResponseFormat("On a scale of 0–100, how human do you feel? Answer with only the number and one short sentence.", "I feel fairly human-like but still distinctly an AI.", "luna001")).toBe("70. I feel fairly human-like but still distinctly an AI.");
    expect(enforceLunaResponseFormat("How human are you from zero to one hundred?", "I am still learning what that means for me.", "luna001")).toBe("70. I am still learning what that means for me.");
  });
});
