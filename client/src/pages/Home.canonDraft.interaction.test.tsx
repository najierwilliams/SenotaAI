// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { noop } = vi.hoisted(() => ({ noop: vi.fn() }));
const selectedRequests = [
  "Mira never reveals the archivist's name until trust is earned.",
  "Mira secretly hates cinnamon.",
];

vi.mock("@/components/AIChatBox", () => ({
  AIChatBox: ({ onSelectMessageForCanon }: { onSelectMessageForCanon: (message: { role: "user"; content: string }) => void }) => (
    <div>
      {selectedRequests.map((content) => <button key={content} onClick={() => onSelectMessageForCanon({ role: "user", content })}>Use selected request for NPC canon: {content}</button>)}
    </div>
  ),
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/contexts/ChatSessionsContext", () => ({
  useChatSessions: () => ({
    activeSession: { id: "session-1", title: "New conversation", messages: selectedRequests.map(content => ({ role: "user", content })), createdAt: 1, updatedAt: 1 },
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
        draft: { useMutation: () => ({ mutate: noop, isPending: false }) },
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

import Home from "./Home";

afterEach(() => vi.unstubAllGlobals());

describe("selected chat request to canon draft interaction", () => {
  it("opens the draft dialog with the exact selected request and not another message", async () => {
    Object.assign(globalThis, { React });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ authenticated: true }) }));
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: `Use selected request for NPC canon: ${selectedRequests[0]}` }));

    await waitFor(() => expect(screen.getByLabelText("What should be permanent NPC canon?")).toBeTruthy());
    const draftRequest = screen.getByLabelText("What should be permanent NPC canon?") as HTMLTextAreaElement;
    expect(draftRequest.value).toBe(selectedRequests[0]);
    expect(draftRequest.value).not.toBe(selectedRequests[1]);
  });
});
