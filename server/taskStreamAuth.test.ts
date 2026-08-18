import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";

const runAutonomousTask = vi.fn();

vi.mock("./agent/engine", () => ({ runAutonomousTask }));

const { createApp } = await import("./_core/index");

describe("direct-access task stream", () => {
  let server: Server;
  let baseUrl = "";

  beforeAll(async () => {
    server = createApp().listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP port.");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it("emits an SSE connection and activity event without a login session", async () => {
    runAutonomousTask.mockImplementationOnce(async ({ emit }) => {
      emit({ kind: "planning", status: "running", title: "Planning", timestamp: 1 });
    });

    const response = await fetch(`${baseUrl}/api/agent/tasks/5/run`, { method: "POST" });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const body = await response.text();
    expect(body).toContain("event: connected");
    expect(body).toContain("event: agent");
    expect(body).toContain("Planning");
    expect(runAutonomousTask).toHaveBeenCalledWith(expect.objectContaining({ taskId: 5, userId: 0 }));
  });

  it("rejects malformed task IDs", async () => {
    const response = await fetch(`${baseUrl}/api/agent/tasks/nope/run`, { method: "POST" });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid-task-id" });
  });
});
