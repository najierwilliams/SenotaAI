import type { AgentApproval, AgentTask } from "../../drizzle/schema";
import { statusAfterApprovalDecision } from "./state";

export async function decideApprovalAndQueue(input: {
  approvalId: number;
  userId: number;
  approved: boolean;
  resolveApproval: (values: { approvalId: number; userId: number; approved: boolean }) => Promise<AgentApproval | undefined>;
  updateTask: (taskId: number, values: Partial<Pick<AgentTask, "status" | "currentPhase">>) => Promise<void>;
}) {
  const approval = await input.resolveApproval({ approvalId: input.approvalId, userId: input.userId, approved: input.approved });
  if (!approval) return undefined;
  const nextStatus = statusAfterApprovalDecision(input.approved);
  await input.updateTask(approval.taskId, {
    status: nextStatus,
    currentPhase: input.approved ? "Approved action is ready to continue" : "Approval declined; task paused",
  });
  return approval;
}
