import { chatWithOllama } from "../agent/ollama";
import { recordNpcAdminAudit } from "./adminAudit";
import { parseObsidianNpcNote } from "./obsidianSync";

const DEFAULT_CANON_REPOSITORY = "najierwilliams/SenotaAI-NPC-Canon";
const CANON_BRANCH = "main";
const sensitiveInputPattern = /\b(?:api[_ -]?key|access[_ -]?token|secret|password|private[_ -]?key)\b\s*[:=]|\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|vcp_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,})\b|-----BEGIN [A-Z ]*PRIVATE KEY-----/i;

export type CanonDraft = {
  npcId: string;
  displayName: string;
  path: string;
  noteContent: string;
  summary: string;
  sourceSha: string | null;
  excerptLength: number;
};

function canonRepository() {
  return process.env.GITHUB_CANON_REPOSITORY?.trim() || DEFAULT_CANON_REPOSITORY;
}

function canonWriteToken() {
  return process.env.NPC_CANON_WRITE_TOKEN?.trim() ?? "";
}

export function isNpcCanonPublishingConfigured() {
  return Boolean(canonWriteToken());
}

function canonicalNpcPath(npcId: string) {
  const normalized = npcId.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,78}$/.test(normalized)) {
    throw new Error("NPC ID must use lowercase letters, numbers, and hyphens (2–79 characters).");
  }
  return `NPCs/${normalized}.md`;
}

function splitRepository(repository: string) {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo || repository.split("/").length !== 2) throw new Error("Canon repository must use owner/repository format.");
  return { owner, repo };
}

function encodedPath(path: string) {
  return path.split("/").map(segment => encodeURIComponent(segment)).join("/");
}

async function githubRequest<T>(path: string, init: RequestInit = {}) {
  const token = canonWriteToken();
  if (!token) throw new Error("Canon publishing is not configured. Add the dedicated vault write token first.");
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(60_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((payload as { message?: string }).message || `GitHub canon-vault request failed (${response.status}).`);
  return payload as T;
}

async function readCanonNote(path: string) {
  const { owner, repo } = splitRepository(canonRepository());
  try {
    const response = await githubRequest<{ content?: string; encoding?: string; sha: string }>(`/repos/${owner}/${repo}/contents/${encodedPath(path)}?ref=${CANON_BRANCH}`);
    if (response.encoding !== "base64" || !response.content) throw new Error("The existing NPC note was not returned as a text file.");
    return {
      sha: response.sha,
      content: Buffer.from(response.content.replace(/\s/g, ""), "base64").toString("utf8"),
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Not Found")) return null;
    throw error;
  }
}

function normalizeDraftOutput(content: string) {
  const withoutFence = content.trim().replace(/^```(?:markdown|md)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const summaryMatch = withoutFence.match(/^<!--\s*SenotaAI draft summary:\s*([\s\S]*?)-->\s*/i);
  const summary = summaryMatch?.[1]?.trim().slice(0, 800) || "Review the proposed canon note before publishing it.";
  return { summary, noteContent: withoutFence.replace(/^<!--\s*SenotaAI draft summary:\s*[\s\S]*?-->\s*/i, "").trim() };
}

function validateDraftInput(npcId: string, displayName: string, request: string) {
  if (!displayName.trim() || displayName.trim().length > 120) throw new Error("Display name is required and must be 120 characters or fewer.");
  if (!request.trim() || request.trim().length > 12_000) throw new Error("Describe the canon change in 1–12,000 characters.");
  if (sensitiveInputPattern.test(request)) throw new Error("Passwords, API keys, tokens, and private keys cannot be added to NPC canon.");
  return { npcId: npcId.trim().toLowerCase(), displayName: displayName.trim(), request: request.trim() };
}

export async function createNpcCanonDraft(input: { npcId: string; displayName: string; request: string }): Promise<CanonDraft> {
  const draftInput = validateDraftInput(input.npcId, input.displayName, input.request);
  const path = canonicalNpcPath(draftInput.npcId);
  const existing = await readCanonNote(path);
  const existingContent = existing?.content.slice(0, 24_000) || "No existing note. Create the NPC note from the supplied request.";
  const response = await chatWithOllama({
    messages: [
      {
        role: "system",
        content: `You create careful, private Obsidian NPC canon drafts. Return ONLY a short HTML comment followed by one valid Markdown note. The first line must be <!-- SenotaAI draft summary: concise statement of exactly what will be added or changed -->. Then write YAML frontmatter with npc_id: ${draftInput.npcId} and display_name: ${draftInput.displayName}, followed by meaningful canon sections including ## Runtime excerpt. Preserve valid existing canon unless the requested change explicitly revises it. Do not invent uncertain facts, add player-specific memories, include secrets, or use Markdown code fences.`,
      },
      {
        role: "user",
        content: `NPC ID: ${draftInput.npcId}\nDisplay name: ${draftInput.displayName}\n\nRequested canon change:\n${draftInput.request}\n\nExisting canon note:\n${existingContent}`,
      },
    ],
  });
  const generated = normalizeDraftOutput(response.content);
  const parsed = validateNpcCanonDraft({ npcId: draftInput.npcId, displayName: draftInput.displayName, noteContent: generated.noteContent });
  return {
    npcId: parsed.npcId,
    displayName: parsed.displayName,
    path,
    noteContent: generated.noteContent,
    summary: generated.summary,
    sourceSha: existing?.sha ?? null,
    excerptLength: parsed.canonExcerpt.length,
  };
}

export function validateNpcCanonDraft(input: { npcId: string; displayName: string; noteContent: string }) {
  const path = canonicalNpcPath(input.npcId);
  const parsed = parseObsidianNpcNote(input.noteContent, path);
  if (parsed.npcId !== input.npcId.trim().toLowerCase() || parsed.displayName !== input.displayName.trim()) {
    throw new Error("The approved note must retain the requested NPC ID and display name.");
  }
  return parsed;
}

export async function publishNpcCanonDraft(input: { npcId: string; displayName: string; noteContent: string; sourceSha: string | null }) {
  const parsed = validateNpcCanonDraft(input);
  const path = canonicalNpcPath(input.npcId);
  const current = await readCanonNote(path);
  if ((current?.sha ?? null) !== input.sourceSha) {
    throw new Error("This NPC note changed in the vault while you were reviewing it. Generate a fresh draft before publishing.");
  }
  const { owner, repo } = splitRepository(canonRepository());
  const result = await githubRequest<{ commit?: { sha?: string }; content?: { path?: string } }>(`/repos/${owner}/${repo}/contents/${encodedPath(path)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `canon: update ${parsed.displayName}`,
      content: Buffer.from(input.noteContent, "utf8").toString("base64"),
      branch: CANON_BRANCH,
      ...(current?.sha ? { sha: current.sha } : {}),
    }),
  });
  await recordNpcAdminAudit("website-canon-publish", "canon", parsed.npcId, ["noteContent", "runtimeExcerpt", "githubCommit"]);
  return {
    ok: true,
    npcId: parsed.npcId,
    path: result.content?.path || path,
    commitSha: result.commit?.sha || null,
    excerptLength: parsed.canonExcerpt.length,
    sync: "The signed GitHub webhook will import this note into Supabase automatically.",
  };
}
