import { describe, expect, it, vi } from "vitest";

const listWorkspaceMemories = vi.fn();
const syncWorkspaceMemory = vi.fn();
const deactivateWorkspaceMemory = vi.fn();

vi.mock("../workspaceMemoryDb", () => ({
  listWorkspaceMemories,
  syncWorkspaceMemory,
  deactivateWorkspaceMemory,
}));

const { agentRouter } = await import("./agent");
const workspaceId = "3f5dc962-5f54-4fa4-b63e-af4b4db9ed8a";

describe("workspace memory cloud sync", () => {
  it("returns an explicit device-only state when a database is unavailable", async () => {
    listWorkspaceMemories.mockResolvedValueOnce(null);
    const caller = agentRouter.createCaller({ user: null } as never);

    await expect(caller.workspaceMemory.list({ workspaceId })).resolves.toEqual({ available: false, memories: [] });
  });

  it("syncs safe browser-owned records to a project-scoped workspace", async () => {
    syncWorkspaceMemory.mockResolvedValueOnce({ id: 1 });
    const caller = agentRouter.createCaller({ user: null } as never);

    await expect(caller.workspaceMemory.sync({
      workspaceId,
      memory: {
        id: "b9941d08-b2aa-43eb-95ca-e4b0e04450e0",
        category: "project",
        content: "The frontend uses React and Vite.",
        importance: 4,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    })).resolves.toEqual({ available: true });
    expect(syncWorkspaceMemory).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId,
      category: "project",
      source: "device-sync",
    }));
  });

  it("rejects token-like content before it can be sent to cloud memory", async () => {
    const caller = agentRouter.createCaller({ user: null } as never);

    await expect(caller.workspaceMemory.sync({
      workspaceId,
      memory: {
        id: "3f5dc962-5f54-4fa4-b63e-af4b4db9ed8b",
        category: "context",
        content: "GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz123456",
        importance: 3,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    })).rejects.toThrow("Sensitive values");
  });
});
