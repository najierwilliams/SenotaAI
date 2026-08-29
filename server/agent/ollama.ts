import type { AgentToolDefinition, OllamaMessage } from "./contracts";

type OllamaChatResponse = {
  message?: {
    content?: string;
    thinking?: string;
    tool_calls?: Array<{
      id?: string;
      type?: string;
      function?: { name?: string; arguments?: Record<string, unknown> | string };
    }>;
  };
  done?: boolean;
  error?: string;
};

export type OllamaConfig = {
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
};

export function getOllamaConfig(env: NodeJS.ProcessEnv = process.env): OllamaConfig {
  const baseUrl = env.OLLAMA_BASE_URL?.trim().replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("Ollama is not configured. Add OLLAMA_BASE_URL in Settings before executing a task.");
  }
  if (!/^https:\/\//.test(baseUrl) && env.NODE_ENV === "production") {
    throw new Error("OLLAMA_BASE_URL must use HTTPS in production.");
  }
  return {
    baseUrl,
    apiKey: env.OLLAMA_API_KEY?.trim() || undefined,
    defaultModel: env.OLLAMA_DEFAULT_MODEL?.trim() || "glm-5.3-flash:cloud",
  };
}

export async function listOllamaModels(): Promise<string[]> {
  const config = getOllamaConfig();
  const response = await fetch(`${config.baseUrl}/api/tags`, {
    headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Ollama model discovery failed (${response.status}).`);
  const data = await response.json() as { models?: Array<{ name?: string }> };
  return (data.models ?? []).map((model) => model.name).filter((name): name is string => Boolean(name));
}

export async function chatWithOllama(input: {
  model?: string;
  messages: OllamaMessage[];
  tools?: AgentToolDefinition[];
}): Promise<{ content: string; thinking: string; toolCalls: NonNullable<OllamaMessage["tool_calls"]> }> {
  return streamChatWithOllama(input, () => undefined);
}

export async function streamChatWithOllama(
  input: {
    model?: string;
    messages: OllamaMessage[];
    tools?: AgentToolDefinition[];
  },
  onChunk: (chunk: { thinking?: string; content?: string }) => void | Promise<void>,
): Promise<{ content: string; thinking: string; toolCalls: NonNullable<OllamaMessage["tool_calls"]> }> {
  const config = getOllamaConfig();
  const response = await fetch(`${config.baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: input.model || config.defaultModel,
      messages: input.messages,
      tools: input.tools,
      stream: true,
      think: true,
      keep_alive: "0",
    }),
    signal: AbortSignal.timeout(150_000),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as OllamaChatResponse;
    throw new Error(payload.error || `Ollama request failed (${response.status}).`);
  }
  if (!response.body) throw new Error("Ollama did not return a readable response stream.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let content = "";
  let thinking = "";
  const toolCalls: NonNullable<OllamaMessage["tool_calls"]> = [];

  const consume = async (line: string) => {
    if (!line.trim()) return;
    const payload = JSON.parse(line) as OllamaChatResponse;
    const nextThinking = payload.message?.thinking || "";
    const nextContent = payload.message?.content || "";
    if (nextThinking) { thinking += nextThinking; await onChunk({ thinking: nextThinking }); }
    if (nextContent) { content += nextContent; await onChunk({ content: nextContent }); }
    for (const call of payload.message?.tool_calls ?? []) {
      if (!call.function?.name || call.function.arguments === undefined) continue;
      toolCalls.push({ id: call.id, type: call.type, function: { name: call.function.name, arguments: call.function.arguments } });
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) await consume(line);
  }
  if (pending.trim()) await consume(pending);
  return { content: content.trim(), thinking: thinking.trim(), toolCalls };
}
