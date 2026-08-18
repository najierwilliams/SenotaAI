export type StreamedAgentEvent = {
  type?: string;
  taskId?: number;
  status?: string;
  message?: string;
  timestamp?: number;
  step?: {
    id?: number;
    sequence: number;
    kind: string;
    title: string;
    status: string;
    detail?: string | null;
  };
};

export function parseAgentSseFrames(input: string): { events: StreamedAgentEvent[]; remainder: string } {
  const frames = input.split("\n\n");
  const remainder = frames.pop() ?? "";
  const events = frames.flatMap((frame) => {
    const data = frame.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
    if (!data) return [];
    try { return [JSON.parse(data) as StreamedAgentEvent]; } catch { return []; }
  });
  return { events, remainder };
}

export async function streamAgentTask(taskId: number, onEvent: (event: StreamedAgentEvent) => void) {
  const response = await fetch(`/api/agent/tasks/${taskId}/run`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "text/event-stream" },
  });
  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Unable to start task (${response.status}).`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseAgentSseFrames(buffer);
    buffer = parsed.remainder;
    parsed.events.forEach(onEvent);
  }
  if (buffer.trim()) parseAgentSseFrames(`${buffer}\n\n`).events.forEach(onEvent);
}
