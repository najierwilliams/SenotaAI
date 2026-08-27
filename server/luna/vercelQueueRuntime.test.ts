import { describe, expect, it } from "vitest";
import { buildCognitivePlan } from "./cognition";
import { lunaQueueRetry } from "./vercelQueueConsumer";
import { VercelQueueLunaDurableRuntime } from "./vercelQueueRuntime";

const metadata = (deliveryCount: number) => ({
  messageId: `queue-message-${deliveryCount}`,
  deliveryCount,
  createdAt: new Date("2026-08-27T00:00:00.000Z"),
  expiresAt: new Date("2026-08-28T00:00:00.000Z"),
  topicName: "luna_worker_v1",
  consumerGroup: "test",
  region: "iad1",
});

describe("Vercel Queue Luna durable runtime", () => {
  it("does not emulate a durable runtime outside a Vercel deployment", async () => {
    const runtime = new VercelQueueLunaDurableRuntime({ send: async () => ({ messageId: "must-not-send" }) }, () => false);
    await expect(runtime.getStatus()).resolves.toMatchObject({ status: "UNAVAILABLE" });
    await expect(runtime.dispatch({ missionId: "mission", workspaceId: "workspace", idempotencyKey: "mission:test" })).resolves.toMatchObject({ accepted: false, runId: null });
  });

  it("uses the provider-issued queue message ID as the durable mission run ID", async () => {
    const sent: unknown[] = [];
    const runtime = new VercelQueueLunaDurableRuntime({ send: async (topic, payload, options) => {
      sent.push({ topic, payload, options });
      return { messageId: "vqs_real_message_42" };
    } }, () => true);
    const result = await runtime.dispatch({ missionId: "mission-id", workspaceId: "workspace-id", idempotencyKey: "mission:mission-id:initial" });
    expect(result).toEqual({ accepted: true, runtimeStatus: "CONFIGURED", runId: "vqs_real_message_42", message: "Vercel Queues accepted the durable Luna mission dispatch." });
    expect(sent).toEqual([{ topic: "luna_worker_v1", payload: { version: 1, kind: "MISSION_START", missionId: "mission-id", workspaceId: "workspace-id" }, options: { idempotencyKey: "mission:mission-id:initial", retentionSeconds: 604800 } }]);
  });

  it("fails closed when the provider accepts publication without an actual message ID", async () => {
    const runtime = new VercelQueueLunaDurableRuntime({ send: async () => ({ messageId: null }) }, () => true);
    await expect(runtime.dispatch({ missionId: "mission", workspaceId: "workspace", idempotencyKey: "mission:initial" })).resolves.toEqual({
      accepted: false,
      runtimeStatus: "DEGRADED",
      runId: null,
      message: "Vercel Queues accepted the request without a message ID. Luna will not represent it as a durable mission run until the provider returns an actual identifier.",
    });
  });

  it("supports the required distinct role chain and bounded Scout parallelism", () => {
    const tasks = buildCognitivePlan("Verify durable queue handoffs.").tasks;
    expect(tasks.map(task => task.role)).toEqual(["PLANNER_AGENT", "MEMORY_AGENT", "SCOUT", "SCOUT", "RESEARCHER", "VALIDATOR", "SYNTHESIS_AGENT", "REFLECTION_AGENT"]);
    expect(tasks.find(task => task.key === "research")?.dependsOnKeys).toEqual(["scout_context", "scout_gaps"]);
  });

  it("retries only retryable queue failures and acknowledges terminal failures", () => {
    expect(lunaQueueRetry(new Error("retry"), metadata(1))).toEqual({ afterSeconds: 5 });
    expect(lunaQueueRetry(new Error("retry"), metadata(6))).toEqual({ acknowledge: true });
  });
});
