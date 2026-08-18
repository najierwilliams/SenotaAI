import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const noop = vi.fn();
const completedTask = {
  id: 7, goal: "Review the accessibility flow", model: "llama3", executionMode: "confirm", status: "awaiting_approval", createdAt: Date.now(), currentPhase: "Awaiting approval", retryCount: 0, errorMessage: null, finalSummary: null,
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ agent: { tasks: { list: { invalidate: noop }, get: { invalidate: noop } }, dashboard: { invalidate: noop }, memories: { list: { invalidate: noop } }, settings: { get: { invalidate: noop } }, schedules: { list: { invalidate: noop } } } }),
    agent: {
      tasks: {
        get: { useQuery: () => ({ data: { task: completedTask, steps: [{ id: 1, kind: "write_repository_file", title: "Updated authentication form", status: "completed", detail: "A focused branch change was prepared.", createdAt: Date.now(), sequence: 1 }], approvals: [{ id: 5, status: "requested", title: "Write repository files", description: "Action: write_repository_file" }] }, isLoading: false, refetch: noop }) },
        list: { useQuery: () => ({ data: [completedTask], isLoading: false }) },
        pause: { useMutation: () => ({ mutate: noop }) }, resume: { useMutation: () => ({ mutate: noop }) }, cancel: { useMutation: () => ({ mutate: noop }) },
      },
      approvals: { decide: { useMutation: () => ({ mutate: noop }) } },
      settings: { get: { useQuery: () => ({ data: { defaultModel: "llama3", defaultExecutionMode: "confirm", defaultMaxRetries: 2, githubRepository: "najierwilliams/SenotaAI", vercelProject: null, notificationsEnabled: true } }) }, update: { useMutation: () => ({ mutate: noop, isPending: false }) } },
      connections: { useQuery: () => ({ data: { ollamaConfigured: false, githubConfigured: true, vercelConfigured: true } }) },
      schedules: { list: { useQuery: () => ({ data: [{ id: 2, goal: "Audit weekly", cronExpression: "0 0 9 * * 1", status: "active", runs: [{ id: 10, status: "completed" }] }] }) }, create: { useMutation: () => ({ mutate: noop, isPending: false }) } },
    },
  },
}));
vi.mock("wouter", () => ({ useLocation: () => ["/", noop] }));

import TaskDetail from "./TaskDetail";
import TaskHistory from "./TaskHistory";
import Settings from "./Settings";

describe("agent workspace screen states", () => {
  it("renders a task approval block and persisted trace event", () => {
    Object.assign(globalThis, { React });
    const html = renderToStaticMarkup(<TaskDetail taskId={7} />);
    expect(html).toContain("Approval required");
    expect(html).toContain("Updated authentication form");
  });

  it("renders a stored task in task history", () => {
    Object.assign(globalThis, { React });
    const html = renderToStaticMarkup(<TaskHistory />);
    expect(html).toContain("Review the accessibility flow");
    expect(html).toContain("RUN-0007");
  });

  it("renders recorded schedule-run history", () => {
    Object.assign(globalThis, { React });
    const html = renderToStaticMarkup(<Settings />);
    expect(html).toContain("1 stored run");
    expect(html).toContain("latest completed");
  });
});
