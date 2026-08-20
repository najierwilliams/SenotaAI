// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_NPC_CANON_REQUEST_CHARS } from "@shared/const";

const { noop, createDraftMutate, validateDraftMutate, publishDraftMutate } = vi.hoisted(() => ({
  noop: vi.fn(),
  createDraftMutate: vi.fn(),
  validateDraftMutate: vi.fn(),
  publishDraftMutate: vi.fn(),
}));
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
        targets: { useQuery: () => ({ data: { targets: [{ npcId: "mira-vale", displayName: "Mira Vale", path: "NPCs/mira-vale.md" }] }, isLoading: false, refetch: noop }) },
        draftBatch: { useMutation: () => ({ mutate: createDraftMutate, isPending: false }) },
        validate: { useMutation: () => ({ mutate: validateDraftMutate, isPending: false }) },
        publish: { useMutation: () => ({ mutate: publishDraftMutate, isPending: false }) },
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  createDraftMutate.mockReset();
  validateDraftMutate.mockReset();
  publishDraftMutate.mockReset();
});

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

  it("offers the documented high-capacity canon request limit with an accurate counter", async () => {
    Object.assign(globalThis, { React });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ authenticated: true }) }));
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: `Use selected request for NPC canon: ${selectedRequests[0]}` }));
    const draftRequest = await screen.findByLabelText("What should be permanent NPC canon?") as HTMLTextAreaElement;
    expect(draftRequest.maxLength).toBe(MAX_NPC_CANON_REQUEST_CHARS);
    fireEvent.change(draftRequest, { target: { value: "a".repeat(MAX_NPC_CANON_REQUEST_CHARS) } });
    expect(screen.getByText(`60,000 / 60,000 characters`)).toBeTruthy();
    expect(screen.getByText(/Detailed canon requests up to 60,000 characters are supported/)).toBeTruthy();
  });

  it("submits selected existing and typed new NPC targets together for batch drafting", async () => {
    Object.assign(globalThis, { React });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ authenticated: true }) }));
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: `Use selected request for NPC canon: ${selectedRequests[0]}` }));
    await waitFor(() => expect(screen.getByLabelText("What should be permanent NPC canon?")).toBeTruthy());
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("NPC ID"), { target: { value: "orion-vale" } });
    fireEvent.change(screen.getByLabelText("NPC display name"), { target: { value: "Orion Vale" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate 2 review drafts" }));

    expect(createDraftMutate).toHaveBeenCalledWith({
      targets: [
        { npcId: "mira-vale", displayName: "Mira Vale" },
        { npcId: "orion-vale", displayName: "Orion Vale" },
      ],
      request: selectedRequests[0],
    }, expect.any(Object));
  });

  it("blocks an invalid edited note during preflight before a vault publish request", async () => {
    Object.assign(globalThis, { React });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ authenticated: true }) }));
    createDraftMutate.mockImplementation((_input, options) => options.onSuccess?.({ drafts: [{
      npcId: "mira-vale", displayName: "Mira Vale", path: "NPCs/mira-vale.md", sourceSha: null, excerptLength: 30,
      summary: "Creates a small Mira canon note.",
      noteContent: "---\nnpc_id: mira-vale\ndisplay_name: Mira Vale\n---\n\n## Runtime excerpt\nMira is a baker.",
      conflicts: [],
    }] }));
    validateDraftMutate.mockImplementation((_input, options) => options.onError?.(new Error("Obsidian NPC note needs a meaningful Runtime excerpt or canon body.")));
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: `Use selected request for NPC canon: ${selectedRequests[0]}` }));
    fireEvent.change(screen.getByLabelText("NPC ID"), { target: { value: "mira-vale" } });
    fireEvent.change(screen.getByLabelText("NPC display name"), { target: { value: "Mira Vale" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate 1 review draft" }));
    await waitFor(() => expect(screen.getByLabelText("Review and edit the complete Obsidian note")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Review and edit the complete Obsidian note"), { target: { value: "---\nnpc_id: mira-vale\ndisplay_name: Mira Vale\n---\n" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm and send to NPC canon" }));

    await waitFor(() => expect(screen.getByText(/This note is not ready to publish/)).toBeTruthy());
    expect(validateDraftMutate).toHaveBeenCalledTimes(1);
    expect(publishDraftMutate).not.toHaveBeenCalled();
  });

  it("publishes the latest edited review text rather than an earlier draft snapshot", async () => {
    Object.assign(globalThis, { React });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ authenticated: true }) }));
    const original = "---\nnpc_id: mira-vale\ndisplay_name: Mira Vale\n---\n\n## Runtime excerpt\nMira has a blue lantern.";
    const edited = "---\nnpc_id: mira-vale\ndisplay_name: Mira Vale\n---\n\n## Runtime excerpt\nMira has a green lantern.\nMira protects the archive.";
    createDraftMutate.mockImplementation((_input, options) => options.onSuccess?.({ drafts: [{
      npcId: "mira-vale", displayName: "Mira Vale", path: "NPCs/mira-vale.md", sourceSha: "draft-sha", excerptLength: 30,
      summary: "Creates a small Mira canon note.", noteContent: original, conflicts: [],
    }] }));
    validateDraftMutate.mockImplementation((_input, options) => options.onSuccess?.({ valid: true }));
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: `Use selected request for NPC canon: ${selectedRequests[0]}` }));
    fireEvent.change(screen.getByLabelText("NPC ID"), { target: { value: "mira-vale" } });
    fireEvent.change(screen.getByLabelText("NPC display name"), { target: { value: "Mira Vale" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate 1 review draft" }));
    await waitFor(() => expect(screen.getByLabelText("Review and edit the complete Obsidian note")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Review and edit the complete Obsidian note"), { target: { value: edited } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm and send to NPC canon" }));

    expect(validateDraftMutate).toHaveBeenCalledWith(expect.objectContaining({ noteContent: edited, sourceSha: "draft-sha" }), expect.any(Object));
    expect(publishDraftMutate).toHaveBeenCalledWith(expect.objectContaining({ noteContent: edited, sourceSha: "draft-sha" }), expect.any(Object));
  });
});
