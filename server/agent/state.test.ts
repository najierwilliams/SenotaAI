import { describe, expect, it } from "vitest";
import { agentTurnAvailable, boundedRetryCount, isTerminalTaskStatus, mayStartTask, MAX_AGENT_TOOL_TURNS, statusAfterApprovalDecision } from "./state";

describe("agent lifecycle state", () => {
  it("recognizes terminal task states and prevents restarting them", () => {
    expect(isTerminalTaskStatus("completed")).toBe(true);
    expect(isTerminalTaskStatus("cancelled")).toBe(true);
    expect(isTerminalTaskStatus("failed")).toBe(true);
    expect(mayStartTask("completed")).toBe(false);
    expect(mayStartTask("queued")).toBe(true);
  });

  it("holds agent work while a pending approval exists", () => {
    expect(mayStartTask("awaiting_approval")).toBe(false);
  });

  it("returns an approved task to the queue and pauses a rejected action", () => {
    expect(statusAfterApprovalDecision(true)).toBe("queued");
    expect(statusAfterApprovalDecision(false)).toBe("paused");
  });

  it("enforces a strict finite tool-turn budget", () => {
    expect(agentTurnAvailable(0)).toBe(true);
    expect(agentTurnAvailable(MAX_AGENT_TOOL_TURNS - 1)).toBe(true);
    expect(agentTurnAvailable(MAX_AGENT_TOOL_TURNS)).toBe(false);
  });

  it("bounds retries even when a user preference is larger", () => {
    expect(boundedRetryCount(-1)).toBe(0);
    expect(boundedRetryCount(1)).toBe(1);
    expect(boundedRetryCount(99)).toBe(2);
  });
});
