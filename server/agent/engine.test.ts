import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTask: vi.fn(),
  settings: vi.fn(),
  memories: vi.fn(),
  approvals: vi.fn(),
  createStep: vi.fn(),
  updateStep: vi.fn(),
  updateTask: vi.fn(),
  createApproval: vi.fn(),
  createMemory: vi.fn(),
  recordNotification: vi.fn(),
  stream: vi.fn(),
  tools: vi.fn(),
  executeTool: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("./db", () => ({
  getAgentTaskForUser: mocks.getTask,
  getOrCreateAgentSettings: mocks.settings,
  listAgentMemories: mocks.memories,
  listTaskApprovals: mocks.approvals,
  createAgentStep: mocks.createStep,
  updateAgentStep: mocks.updateStep,
  updateAgentTask: mocks.updateTask,
  createAgentApproval: mocks.createApproval,
  createAgentMemory: mocks.createMemory,
  recordAgentNotification: mocks.recordNotification,
}));
vi.mock("./ollama", () => ({ streamChatWithOllama: mocks.stream }));
vi.mock("./connectors", () => ({ getAgentToolDefinitions: mocks.tools, executeConnectorTool: mocks.executeTool }));
vi.mock("../_core/notification", () => ({ notifyOwner: mocks.notify }));

import { runAutonomousTask } from "./engine";

const task = {
  id: 7,
  userId: 1,
  goal: "Make a focused repository improvement",
  repository: "najierwilliams/SenotaAI",
  model: "llama3",
  executionMode: "confirm",
  status: "queued",
  retryCount: 0,
  cancelRequested: false,
  pauseRequested: false,
} as const;

describe("autonomous agent control loop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTask.mockResolvedValue(task);
    mocks.settings.mockResolvedValue({ defaultMaxRetries: 0 });
    mocks.memories.mockResolvedValue([]);
    mocks.approvals.mockResolvedValue([]);
    mocks.createStep.mockImplementation(async (input: { sequence: number; kind: string; status: string; title: string; detail?: string }) => ({ id: input.sequence, ...input }));
    mocks.updateStep.mockResolvedValue(undefined);
    mocks.updateTask.mockResolvedValue(undefined);
    mocks.createApproval.mockResolvedValue({ id: 1 });
    mocks.createMemory.mockResolvedValue(undefined);
    mocks.recordNotification.mockResolvedValue(undefined);
    mocks.notify.mockResolvedValue(true);
    mocks.tools.mockReturnValue([]);
    mocks.executeTool.mockResolvedValue({ ok: true });
  });

  it("pauses before a branch write in confirm-first mode", async () => {
    mocks.stream.mockResolvedValue({
      content: "I will update the source file.",
      thinking: "",
      toolCalls: [{ function: { name: "write_repository_file", arguments: { path: "client/src/App.tsx", content: "export default {}", message: "Refine application" } } }],
    });

    const result = await runAutonomousTask({ taskId: 7, userId: 1 });

    expect(result.status).toBe("awaiting_approval");
    expect(mocks.createApproval).toHaveBeenCalledTimes(1);
    expect(mocks.executeTool).not.toHaveBeenCalled();
    expect(mocks.updateTask).toHaveBeenCalledWith(7, expect.objectContaining({ status: "awaiting_approval" }));
  });

  it("stops after the finite tool-turn budget and records a failure outcome", async () => {
    mocks.getTask.mockResolvedValue({ ...task, executionMode: "auto" });
    mocks.stream.mockResolvedValue({
      content: "Continue inspecting.",
      thinking: "",
      toolCalls: [{ function: { name: "list_repository_files", arguments: {} } }],
    });

    const result = await runAutonomousTask({ taskId: 7, userId: 1 });

    expect(result.status).toBe("failed");
    expect(mocks.executeTool).toHaveBeenCalledTimes(12);
    expect(mocks.updateTask).toHaveBeenCalledWith(7, expect.objectContaining({ status: "failed" }));
  });
});
