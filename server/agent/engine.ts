import { notifyOwner } from "../_core/notification";
import { executeConnectorTool, getAgentToolDefinitions } from "./connectors";
import type { AgentEmitter, AgentEvent, AgentToolCall, OllamaMessage } from "./contracts";
import {
  createAgentApproval,
  createAgentMemory,
  createAgentStep,
  getAgentTaskForUser,
  getOrCreateAgentSettings,
  listAgentMemories,
  listTaskApprovals,
  recordAgentNotification,
  updateAgentStep,
  updateAgentTask,
} from "./db";
import { streamChatWithOllama } from "./ollama";
import { approvalTitleFor, requiresApproval } from "./policy";
import { agentTurnAvailable, boundedRetryCount, isTerminalTaskStatus } from "./state";


function event(taskId: number, type: AgentEvent["type"], details: Omit<AgentEvent, "taskId" | "type" | "timestamp"> = {}): AgentEvent {
  return { taskId, type, timestamp: Date.now(), ...details };
}

function normalizeArguments(value: Record<string, unknown> | string): Record<string, unknown> {
  if (typeof value === "string") {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Tool arguments must be a JSON object.");
    return parsed as Record<string, unknown>;
  }
  return value;
}

function callFingerprint(name: string, args: Record<string, unknown>): string {
  return `${name}:${JSON.stringify(args)}`;
}

async function notifyTaskOwner(input: { userId: number; taskId: number; kind: string; title: string; content: string }) {
  let delivered = false;
  try {
    delivered = await notifyOwner({ title: input.title, content: input.content });
  } catch (error) {
    console.error("[SenotaAI] owner notification failed", error);
  }
  await recordAgentNotification({ ...input, status: delivered ? "sent" : "failed" });
}

function buildSystemPrompt(memory: Array<{ category: string; content: string }>) {
  const memoryContext = memory.length
    ? memory.map((item) => `- [${item.category}] ${item.content}`).join("\n")
    : "- No persistent project memories yet.";
  return `You are SenotaAI, a governed autonomous coding agent. You work only through the supplied tools and never invent results. Work on an isolated task branch, inspect files before changing them, and prefer a pull request and preview deployment over direct production work. Explain short progress checkpoints through tool-driven actions, not internal hidden reasoning. If the goal is complete, respond with a concise summary and do not call another tool. Never ask for or output secrets.\n\nRelevant persistent context:\n${memoryContext}`;
}

async function resolveTaskState(taskId: number, userId: number) {
  const task = await getAgentTaskForUser(taskId, userId);
  if (!task) throw new Error("Task not found or access was revoked.");
  return task;
}

export async function runAutonomousTask(input: {
  taskId: number;
  userId: number;
  emit?: AgentEmitter;
}) {
  const emit = async (payload: AgentEvent) => input.emit?.(payload);
  const initialTask = await resolveTaskState(input.taskId, input.userId);
  if (isTerminalTaskStatus(initialTask.status)) {
    throw new Error("This task is already finished. Create a new task to run it again.");
  }

  const settings = await getOrCreateAgentSettings(input.userId);
  const memories = await listAgentMemories(input.userId);
  const workBranch = `senota/task-${input.taskId}`;
  let sequence = 0;
  const messages: OllamaMessage[] = [
    { role: "system", content: buildSystemPrompt(memories.slice(0, 12)) },
    { role: "user", content: `Goal: ${initialTask.goal}\nRepository: ${initialTask.repository}\nWorking branch: ${workBranch}\nStart by inspecting the repository and then work sequentially until the goal is complete.` },
  ];

  await updateAgentTask(input.taskId, { status: "planning", currentPhase: "Preparing an execution plan", startedAt: initialTask.startedAt ?? Date.now(), pauseRequested: false });
  await emit(event(input.taskId, "status", { status: "planning", message: "SenotaAI is preparing a bounded execution plan." }));

  try {
    for (let turn = 0; agentTurnAvailable(turn); turn += 1) {
      const current = await resolveTaskState(input.taskId, input.userId);
      if (current.cancelRequested) {
        await updateAgentTask(input.taskId, { status: "cancelled", currentPhase: "Cancelled by user", finishedAt: Date.now() });
        await emit(event(input.taskId, "status", { status: "cancelled", message: "Task cancelled. No further tools will be called." }));
        return { status: "cancelled" as const };
      }
      if (current.pauseRequested) {
        await updateAgentTask(input.taskId, { status: "paused", currentPhase: "Paused by user" });
        await emit(event(input.taskId, "status", { status: "paused", message: "Task paused safely between steps." }));
        return { status: "paused" as const };
      }

      await updateAgentTask(input.taskId, { status: "running", currentPhase: turn === 0 ? "Planning and inspecting" : "Executing agent tools" });
      let streamedThinking = "";
      let streamedContent = "";
      const response = await streamChatWithOllama(
        { model: current.model, messages, tools: getAgentToolDefinitions() },
        async (chunk) => {
          if (chunk.thinking) {
            streamedThinking += chunk.thinking;
            await emit(event(input.taskId, "text", { message: `Reasoning · ${chunk.thinking}` }));
          }
          if (chunk.content) {
            streamedContent += chunk.content;
            await emit(event(input.taskId, "text", { message: chunk.content }));
          }
        },
      );
      if (streamedThinking || streamedContent) {
        const inferenceStep = await createAgentStep({
          taskId: input.taskId,
          sequence: sequence += 1,
          kind: "inference",
          status: "completed",
          title: "Model response streamed",
          detail: [streamedThinking ? `Reasoning: ${streamedThinking}` : "", streamedContent ? `Response: ${streamedContent}` : ""].filter(Boolean).join("\n\n").slice(0, 12_000),
        });
        await emit(event(input.taskId, "step", { step: { id: inferenceStep.id, sequence: inferenceStep.sequence, kind: inferenceStep.kind, title: inferenceStep.title, status: "completed", detail: inferenceStep.detail } }));
      }
      const assistantMessage: OllamaMessage = { role: "assistant", content: response.content, tool_calls: response.toolCalls };
      messages.push(assistantMessage);

      if (!response.toolCalls.length) {
        const summary = response.content || "The agent completed its bounded tool loop without a final narrative.";
        const completeStep = await createAgentStep({
          taskId: input.taskId,
          sequence: sequence += 1,
          kind: "reflection",
          status: "completed",
          title: "Agent reflection completed",
          detail: summary,
        });
        await emit(event(input.taskId, "step", { step: { id: completeStep.id, sequence: completeStep.sequence, kind: completeStep.kind, title: completeStep.title, status: "completed", detail: summary } }));
        await createAgentMemory({ userId: input.userId, sourceTaskId: input.taskId, category: "task-outcome", content: summary.slice(0, 1_500), importance: 2 });
        await updateAgentTask(input.taskId, { status: "completed", currentPhase: "Completed", finalSummary: summary, finishedAt: Date.now() });
        await notifyTaskOwner({ userId: input.userId, taskId: input.taskId, kind: "completed", title: "SenotaAI task completed", content: summary.slice(0, 1_500) });
        await emit(event(input.taskId, "complete", { status: "completed", message: summary }));
        return { status: "completed" as const, summary };
      }

      for (const toolCall of response.toolCalls) {
        const toolName = toolCall.function.name;
        const args = normalizeArguments(toolCall.function.arguments);
        const toolStep = await createAgentStep({
          taskId: input.taskId,
          sequence: sequence += 1,
          kind: toolName,
          status: "running",
          title: `Agent requested ${toolName.replace(/_/g, " ")}`,
          detail: "Validating safety policy and executing through the configured connector.",
          payload: args,
        });
        await emit(event(input.taskId, "step", { step: { id: toolStep.id, sequence: toolStep.sequence, kind: toolStep.kind, title: toolStep.title, status: "running", detail: toolStep.detail } }));

        const approvals = await listTaskApprovals(input.taskId);
        const fingerprint = callFingerprint(toolName, args);
        const approval = approvals.find((item) => item.actionType === fingerprint && item.status === "approved");
        if (requiresApproval(toolName, current.executionMode) && !approval) {
          const description = `Action: ${toolName}\nRequest fingerprint: ${fingerprint}\nThe agent will execute this exact tool request only after approval.`;
          await createAgentApproval({ taskId: input.taskId, stepId: toolStep.id, actionType: fingerprint, title: approvalTitleFor(toolName), description });
          await updateAgentStep(toolStep.id, { status: "pending", detail: "Waiting for an explicit approval." });
          await updateAgentTask(input.taskId, { status: "awaiting_approval", currentPhase: "Awaiting approval" });
          await notifyTaskOwner({ userId: input.userId, taskId: input.taskId, kind: "approval_required", title: "SenotaAI approval required", content: description });
          await emit(event(input.taskId, "status", { status: "awaiting_approval", message: `${approvalTitleFor(toolName)} requires approval before the task can continue.` }));
          return { status: "awaiting_approval" as const };
        }

        let output: unknown;
        let lastError: Error | undefined;
        for (let attempt = 0; attempt <= boundedRetryCount(settings.defaultMaxRetries); attempt += 1) {
          try {
            output = await executeConnectorTool(toolName, args, {
              taskId: input.taskId,
              userId: input.userId,
              repository: current.repository,
              workBranch,
              vercelProject: settings.vercelProject,
              onProgress: async (message) => { await emit(event(input.taskId, "text", { message })); },
            });
            lastError = undefined;
            break;
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < boundedRetryCount(settings.defaultMaxRetries)) {
              await updateAgentTask(input.taskId, { retryCount: current.retryCount + attempt + 1, currentPhase: `Retrying ${toolName}` });
              await emit(event(input.taskId, "text", { message: `${toolName} failed; retrying once more within the task budget.` }));
            }
          }
        }
        if (lastError) throw lastError;

        const outputText = JSON.stringify(output).slice(0, 12_000);
        await updateAgentStep(toolStep.id, { status: "completed", detail: outputText, payload: { arguments: args, result: output } });
        await emit(event(input.taskId, "step", { step: { id: toolStep.id, sequence: toolStep.sequence, kind: toolStep.kind, title: toolStep.title, status: "completed", detail: outputText } }));
        messages.push({ role: "tool", tool_name: toolName, content: outputText });
      }
    }

    throw new Error("Task stopped after the configured tool-turn budget to preserve the autonomy limit.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failedStep = await createAgentStep({
      taskId: input.taskId,
      sequence: sequence += 1,
      kind: "failure",
      status: "failed",
      title: "Agent execution failed",
      detail: message,
    });
    await updateAgentTask(input.taskId, { status: "failed", currentPhase: "Failed", errorMessage: message, finishedAt: Date.now() });
    await notifyTaskOwner({ userId: input.userId, taskId: input.taskId, kind: "failed", title: "SenotaAI task failed", content: message });
    await emit(event(input.taskId, "error", { status: "failed", step: { id: failedStep.id, sequence: failedStep.sequence, kind: failedStep.kind, title: failedStep.title, status: "failed", detail: message }, message }));
    return { status: "failed" as const, error: message };
  }
}
