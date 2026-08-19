import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { noop } = vi.hoisted(() => ({ noop: vi.fn() }));

vi.mock("@/components/AIChatBox", () => ({ AIChatBox: () => <div>Chat workspace</div> }));
vi.mock("@/contexts/ChatSessionsContext", () => ({
  useChatSessions: () => ({
    activeSession: { id: "session-1", title: "New conversation", messages: [{ role: "user", content: "Mira trusts the archivist." }], createdAt: 1, updatedAt: 1 },
    updateMessages: noop,
  }),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    agent: {
      chat: { useMutation: () => ({ mutate: noop, isPending: false, error: null }) },
      connections: { useQuery: () => ({ data: { ollamaConfigured: true, githubConfigured: true, vercelConfigured: true, npcMemoryConfigured: true } }) },
      workspaceMemory: {
        list: { useQuery: () => ({ data: { available: false, memories: [] } }) },
        sync: { useMutation: () => ({ mutate: noop }) },
        remove: { useMutation: () => ({ mutate: noop }) },
      },
      canon: {
        targets: { useQuery: () => ({ data: { targets: [] }, isLoading: false, refetch: noop }) },
        draftBatch: { useMutation: () => ({ mutate: noop, isPending: false }) },
        validate: { useMutation: () => ({ mutate: noop, isPending: false }) },
        publish: { useMutation: () => ({ mutate: noop, isPending: false }) },
      },
    },
  },
}));
vi.mock("@/lib/workspaceMemory", () => ({
  getWorkspaceId: () => "12b3fbe7-8cb5-4a66-a5c2-e357a3c6d2f6",
  loadWorkspaceMemories: () => [],
  mergeWorkspaceMemories: (current: unknown[]) => current,
  persistWorkspaceMemories: noop,
  findRelevantMemories: () => [],
  createWorkspaceMemory: () => ({ id: "memory", category: "context", content: "note", importance: 3, createdAt: 1, updatedAt: 1 }),
  addWorkspaceMemory: (current: unknown[]) => current,
}));

import Home, { canonRequestFromSelectedMessage } from "./Home";

describe("direct chat canon drafting entry point", () => {
  it("renders a visible review-first control beside the chat workspace", () => {
    Object.assign(globalThis, { React });
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain("Turn a chat idea into NPC canon");
    expect(html).toContain("Unlock NPC management first");
    expect(html).toContain("you can edit, approve, or discard it before anything is published");
  });

  it("seeds the draft from the exact selected request rather than prior or later chat text", () => {
    const selected = "Mira must never reveal the archivist's name until trust is earned.";
    const previousDraft = "Older pending canon idea.";
    const latestMessage = "A different recent user request.";

    expect(canonRequestFromSelectedMessage(selected, previousDraft, latestMessage)).toBe(selected);
    expect(canonRequestFromSelectedMessage(selected, previousDraft, latestMessage)).not.toBe(previousDraft);
    expect(canonRequestFromSelectedMessage(selected, previousDraft, latestMessage)).not.toBe(latestMessage);
  });
});
