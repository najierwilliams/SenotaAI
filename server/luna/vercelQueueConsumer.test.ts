import { describe, expect, it } from "vitest";
import { lunaQueueRetry } from "./vercelQueueConsumer";

describe("Luna Queue consumer retry boundary", () => {
  it("leaves ordinary worker failures for provider-managed redelivery", () => {
    expect(lunaQueueRetry(new Error("controlled worker failure"), {
      messageId: "provider-message",
      deliveryCount: 1,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      topicName: "luna_worker_v1",
      consumerGroup: "luna",
      region: "iad1",
    })).toBeUndefined();
  });
});
