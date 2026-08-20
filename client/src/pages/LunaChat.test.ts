import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/AIChatBox", () => ({ AIChatBox: () => null }));
vi.mock("@/lib/trpc", () => ({ trpc: { agent: { luna: { status: { useQuery: () => ({}) }, chat: { useMutation: () => ({}) } } } } }));

import { enforceLunaPreviewFormat, getLunaPreviewPlayerId } from "./LunaChat";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("Luna preview player identity", () => {
  it("keeps a browser-local preview identity stable across Luna messages", () => {
    const browserStorage = storage();
    const first = getLunaPreviewPlayerId(browserStorage);
    const second = getLunaPreviewPlayerId(browserStorage);
    expect(second).toBe(first);
    expect(first).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("creates separate preview identities for separate browser storage", () => {
    expect(getLunaPreviewPlayerId(storage())).not.toBe(getLunaPreviewPlayerId(storage()));
  });

  it("shows a numeric-first response for the live explicit 0–100 wording when an upstream reply is vague", () => {
    const message = "On a scale of 0–100, how human do you feel? Answer with only the number and one short sentence.";
    expect(enforceLunaPreviewFormat(message, "I feel fairly human-like but still distinctly an AI.")).toBe("70% — I feel fairly human-like but still distinctly an AI.");
    expect(enforceLunaPreviewFormat(message, "72. I feel fairly human-like.")).toBe("72% — I feel fairly human-like.");
    expect(enforceLunaPreviewFormat(message, "72% — I feel fairly human-like.")).toBe("72% — I feel fairly human-like.");
  });
});
