export const AGENT_TASK_STATUSES = [
  "queued",
  "planning",
  "running",
  "awaiting_approval",
  "paused",
  "cancelled",
  "completed",
  "failed",
] as const;

export type AgentTaskStatus = (typeof AGENT_TASK_STATUSES)[number];
export type ExecutionMode = "confirm" | "auto";
export type AgentStepStatus = "pending" | "running" | "completed" | "failed" | "skipped";
export type ApprovalStatus = "requested" | "approved" | "rejected" | "expired";

export type AgentEvent = {
  type: "status" | "step" | "text" | "error" | "complete";
  taskId: number;
  status?: AgentTaskStatus;
  step?: {
    id?: number;
    sequence: number;
    kind: string;
    title: string;
    status: AgentStepStatus;
    detail?: string | null;
  };
  message?: string;
  timestamp: number;
};

export type AgentEmitter = (event: AgentEvent) => void | Promise<void>;

export type AgentToolCall = {
  id?: string;
  type?: string;
  function: {
    name: string;
    arguments: Record<string, unknown> | string;
  };
};

export type OllamaMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: AgentToolCall[];
  tool_name?: string;
};

export type AgentToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ToolExecutionContext = {
  taskId: number;
  userId: number;
  repository: string;
  workBranch: string;
  vercelProject?: string | null;
  onProgress?: (message: string) => void | Promise<void>;
};
