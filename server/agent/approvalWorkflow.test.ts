import { describe, expect, it, vi } from "vitest";
import { decideApprovalAndQueue } from "./approvalWorkflow";

describe("approval continuation workflow", () => {
  it("resolves an approval and queues its task for resumed execution", async () => {
    const updateTask = vi.fn().mockResolvedValue(undefined);
    const approval = await decideApprovalAndQueue({
      approvalId: 4,
      userId: 2,
      approved: true,
      resolveApproval: vi.fn().mockResolvedValue({ id: 4, taskId: 21 }),
      updateTask,
    });
    expect(approval).toMatchObject({ taskId: 21 });
    expect(updateTask).toHaveBeenCalledWith(21, { status: "queued", currentPhase: "Approved action is ready to continue" });
  });

  it("leaves a missing or previously resolved approval untouched", async () => {
    const updateTask = vi.fn();
    const result = await decideApprovalAndQueue({ approvalId: 5, userId: 2, approved: true, resolveApproval: vi.fn().mockResolvedValue(undefined), updateTask });
    expect(result).toBeUndefined();
    expect(updateTask).not.toHaveBeenCalled();
  });
});
