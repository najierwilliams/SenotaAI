import { describe, expect, it } from "vitest";
import { enforceLunaResponseFormat } from "./dialogueFormat";

describe("Luna dialogue format guard", () => {
  const message = "Luna, on a scale of 0–100, how human do you feel? Answer with only the number and one short sentence.";

  it("adds Luna’s canon-consistent percentage when the model returns a vague non-numeric reply", () => {
    expect(enforceLunaResponseFormat(message, "I try to emulate humanity.", "luna001")).toBe("70% — I try to emulate humanity.");
  });

  it("preserves a compliant numeric response and ordinary dialogue", () => {
    expect(enforceLunaResponseFormat(message, "72% — I feel close, but I’m still learning.", "luna001")).toBe("72% — I feel close, but I’m still learning.");
    expect(enforceLunaResponseFormat("What are you thinking about?", "The archive has been quiet today.", "luna001")).toBe("The archive has been quiet today.");
  });
});
