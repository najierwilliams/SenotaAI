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
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const data = frame.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
      if (!data) continue;
      try {
        onEvent(JSON.parse(data) as StreamedAgentEvent);
      } catch {
        // Ignore malformed keep-alive frames; the authoritative trace is persisted server-side.
      }
    }
  }
}
