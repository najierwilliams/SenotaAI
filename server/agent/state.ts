import type { AgentTaskStatus } from "./contracts";

export const MAX_AGENT_TOOL_TURNS = 12;
export const MAX_AGENT_RETRIES = 2;

const TERMINAL_STATUSES = new Set<AgentTaskStatus>(["completed", "cancelled", "failed"]);

export function isTerminalTaskStatus(status: AgentTaskStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function mayStartTask(status: AgentTaskStatus): boolean {
  return !isTerminalTaskStatus(status) && status !== "awaiting_approval";
}

export function agentTurnAvailable(turn: number): boolean {
  return turn >= 0 && turn < MAX_AGENT_TOOL_TURNS;
}

export function boundedRetryCount(configuredRetries: number): number {
  return Math.max(0, Math.min(configuredRetries, MAX_AGENT_RETRIES));
}

export function statusAfterApprovalDecision(approved: boolean): Extract<AgentTaskStatus, "queued" | "paused"> {
  return approved ? "queued" : "paused";
}
