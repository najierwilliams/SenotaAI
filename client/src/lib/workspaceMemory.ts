export type MemoryCategory = "preference" | "project" | "decision" | "context";

export type WorkspaceMemory = {
  id: string;
  category: MemoryCategory;
  content: string;
  importance: number;
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "senota.workspace-memory.v1";
const WORKSPACE_ID_KEY = "senota.workspace-id.v1";
const MAX_MEMORIES = 60;

const sensitivePatterns = [
  /\b(?:api[_ -]?key|access[_ -]?token|secret|password|private[_ -]?key)\b\s*[:=]/i,
  /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|vcp_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,})\b/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
];

function storage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

function normalize(content: string) {
  return content.replace(/\s+/g, " ").trim();
}

function tokens(value: string) {
  return Array.from(new Set(value.toLowerCase().match(/[a-z0-9][a-z0-9_-]{1,}/g) ?? []));
}

export function hasSensitiveMemoryContent(content: string) {
  return sensitivePatterns.some((pattern) => pattern.test(content));
}

export function loadWorkspaceMemories(): WorkspaceMemory[] {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((memory): memory is WorkspaceMemory => Boolean(
      memory
      && typeof memory.id === "string"
      && typeof memory.content === "string"
      && typeof memory.category === "string"
      && typeof memory.importance === "number"
      && typeof memory.createdAt === "number"
      && typeof memory.updatedAt === "number",
    )).slice(0, MAX_MEMORIES);
  } catch {
    return [];
  }
}

export function persistWorkspaceMemories(memories: WorkspaceMemory[]) {
  storage()?.setItem(STORAGE_KEY, JSON.stringify(memories.slice(0, MAX_MEMORIES)));
}

export function getWorkspaceId() {
  const current = storage()?.getItem(WORKSPACE_ID_KEY);
  if (current && /^[a-z0-9-]{16,100}$/i.test(current)) return current;
  const next = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `workspace-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  storage()?.setItem(WORKSPACE_ID_KEY, next);
  return next;
}

export function createWorkspaceMemory(input: {
  category: MemoryCategory;
  content: string;
  importance: number;
}): WorkspaceMemory {
  const content = normalize(input.content);
  if (content.length < 4) throw new Error("Write at least four characters for a useful memory.");
  if (content.length > 1_000) throw new Error("Keep each memory under 1,000 characters.");
  if (hasSensitiveMemoryContent(content)) throw new Error("For safety, do not save passwords, API keys, tokens, or private keys as memory.");

  const now = Date.now();
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${now}-${Math.random()}`,
    category: input.category,
    content,
    importance: Math.min(5, Math.max(1, Math.round(input.importance))),
    createdAt: now,
    updatedAt: now,
  };
}

export function addWorkspaceMemory(memories: WorkspaceMemory[], memory: WorkspaceMemory) {
  const duplicate = memories.find((item) => item.content.toLowerCase() === memory.content.toLowerCase());
  const next = duplicate
    ? memories.map((item) => item.id === duplicate.id ? { ...item, ...memory, id: item.id, createdAt: item.createdAt } : item)
    : [memory, ...memories];
  return next.sort((left, right) => right.importance - left.importance || right.updatedAt - left.updatedAt).slice(0, MAX_MEMORIES);
}

export function mergeWorkspaceMemories(local: WorkspaceMemory[], cloud: WorkspaceMemory[]) {
  const merged = cloud.reduce((current, memory) => addWorkspaceMemory(current, memory), local);
  return merged.sort((left, right) => right.importance - left.importance || right.updatedAt - left.updatedAt).slice(0, MAX_MEMORIES);
}

export function findRelevantMemories(memories: WorkspaceMemory[], query: string, limit = 6) {
  const queryTokens = tokens(query);
  return memories
    .map((memory) => {
      const memoryTokens = tokens(memory.content);
      const matches = queryTokens.filter((token) => memoryTokens.includes(token)).length;
      const recency = Math.max(0, 1 - ((Date.now() - memory.updatedAt) / (1000 * 60 * 60 * 24 * 365)));
      return { memory, score: memory.importance * 3 + matches * 8 + recency };
    })
    .filter(({ score, memory }) => queryTokens.length === 0 || score > memory.importance * 3 + 0.2)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ memory }) => memory);
}
