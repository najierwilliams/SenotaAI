import { QueueClient } from "@vercel/queue";
import type { LunaDurableRuntime, LunaRuntimeDispatch, LunaRuntimeResult } from "@shared/lunaCognitive";

export const LUNA_VERCEL_QUEUE_TOPIC = "luna_worker_v1";

export type LunaQueueMessage = {
  version: 1;
  kind: "MISSION_START" | "WORKER_STEP";
  missionId: string;
  workspaceId: string;
  workerId?: string;
  missionRunId?: string;
};

export type LunaQueuePublisher = Pick<QueueClient, "send">;

function queueDeploymentAvailable() {
  return Boolean(process.env.VERCEL_REGION?.trim());
}

function errorDetail(error: unknown) {
  return error instanceof Error ? error.message : "Queue publishing failed without an error message.";
}

/**
 * Publishes a durable queue message only from a Vercel deployment. The Vercel Queue SDK obtains
 * its deployment identity through Vercel-managed OIDC; no queue token is stored in the browser
 * or application source. The returned messageId is the provider-issued durable run identifier.
 */
export class VercelQueueLunaDurableRuntime implements LunaDurableRuntime {
  readonly provider = "vercel-queues";

  constructor(
    private readonly publisher: LunaQueuePublisher = new QueueClient(),
    private readonly available = queueDeploymentAvailable,
  ) {}

  async getStatus() {
    if (!this.available()) {
      return {
        status: "UNAVAILABLE" as const,
        detail: "The Vercel Queue adapter is installed, but this process has no Vercel deployment context. Local requests never impersonate a durable worker runtime.",
      };
    }
    return {
      status: "CONFIGURED" as const,
      detail: "Vercel Queues is configured through this deployed queue producer and private consumer trigger. Dispatch requires a provider-issued queue message ID.",
    };
  }

  async dispatch(input: LunaRuntimeDispatch): Promise<LunaRuntimeResult> {
    const status = await this.getStatus();
    if (status.status !== "CONFIGURED") {
      return { accepted: false, runtimeStatus: status.status, runId: null, message: status.detail };
    }

    try {
      const result = await this.publisher.send(LUNA_VERCEL_QUEUE_TOPIC, {
        version: 1,
        kind: "MISSION_START",
        missionId: input.missionId,
        workspaceId: input.workspaceId,
      } satisfies LunaQueueMessage, {
        idempotencyKey: input.idempotencyKey,
        retentionSeconds: 604_800,
      });
      if (!result.messageId) {
        return {
          accepted: false,
          runtimeStatus: "DEGRADED",
          runId: null,
          message: "Vercel Queues accepted the request without a message ID. Luna will not represent it as a durable mission run until the provider returns an actual identifier.",
        };
      }
      return {
        accepted: true,
        runtimeStatus: "CONFIGURED",
        runId: result.messageId,
        message: "Vercel Queues accepted the durable Luna mission dispatch.",
      };
    } catch (error) {
      return {
        accepted: false,
        runtimeStatus: "DEGRADED",
        runId: null,
        message: `Vercel Queue dispatch failed: ${errorDetail(error)}`,
      };
    }
  }

  async cancel(_runId: string): Promise<void> {
    // Push-mode queues have no arbitrary message-delete operation. The private consumer checks
    // the persisted cancellation flag before every step, so cancellation never implies a false
    // provider-side acknowledgement.
  }
}

export function createLunaQueueMessage(input: { missionId: string; workspaceId: string; workerId: string; missionRunId: string }): LunaQueueMessage {
  return { version: 1, kind: "WORKER_STEP", missionId: input.missionId, workspaceId: input.workspaceId, workerId: input.workerId, missionRunId: input.missionRunId };
}
