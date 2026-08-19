import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/AIChatBox", () => ({ AIChatBox: () => null }));
vi.mock("@/lib/trpc", () => ({ trpc: { agent: { luna: { status: { useQuery: () => ({}) }, chat: { useMutation: () => ({}) } } } } }));

import { getLunaPreviewPlayerId } from "./LunaChat";

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
});
