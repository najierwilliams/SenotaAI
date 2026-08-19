import { createHmac, timingSafeEqual } from "node:crypto";
import { recordNpcAdminAudit } from "./adminAudit";
import { syncObsidianNpcCanon } from "./obsidianSync";

const DEFAULT_CANON_REPOSITORY = "najierwilliams/SenotaAI-NPC-Canon";

type PushCommit = { added?: string[]; modified?: string[]; removed?: string[] };
type GitHubPushPayload = { ref?: string; after?: string; repository?: { full_name?: string }; commits?: PushCommit[] };

function webhookSecret() {
  return process.env.GITHUB_WEBHOOK_SECRET?.trim() ?? "";
}

function canonRepository() {
  return process.env.GITHUB_CANON_REPOSITORY?.trim() || DEFAULT_CANON_REPOSITORY;
}

export function isGitHubCanonWebhookConfigured() {
  return webhookSecret().length >= 16 && Boolean(process.env.GITHUB_TOKEN);
}

export function verifyGitHubCanonSignature(rawBody: Buffer, signature: string | undefined) {
  const secret = webhookSecret();
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return provided.length === expectedBuffer.length && timingSafeEqual(provided, expectedBuffer);
}

export function changedNpcCanonPaths(payload: GitHubPushPayload) {
  if (payload.repository?.full_name !== canonRepository() || payload.ref !== "refs/heads/main") return [];
  const changedPaths = (payload.commits ?? [])
    .flatMap(commit => [...(commit.added ?? []), ...(commit.modified ?? [])])
    .filter(path => /^NPCs\/(?!_template\.md$)[^/]+\.md$/i.test(path));
  return Array.from(new Set(changedPaths)).slice(0, 25);
}

async function getGitHubFile(repository: string, path: string, ref: string) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GitHub token is not configured for canon synchronization.");
  const encodedPath = path.split("/").map(segment => encodeURIComponent(segment)).join("/");
  const response = await fetch(`https://api.github.com/repos/${repository}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "SenotaAI-canon-sync" },
  });
  if (!response.ok) throw new Error(`Unable to fetch changed canon note (${response.status}).`);
  const file = await response.json() as { content?: string; encoding?: string };
  if (file.encoding !== "base64" || !file.content) throw new Error("Changed canon note was not returned as Base64 content.");
  return Buffer.from(file.content.replace(/\s/g, ""), "base64").toString("utf8");
}

/** Deterministic, event-driven worker: imports changed canon notes only after a valid signed GitHub push. */
export async function processGitHubCanonPush(payload: GitHubPushPayload) {
  const paths = changedNpcCanonPaths(payload);
  const ref = payload.after;
  if (!paths.length || !ref) return { imported: [], skipped: true, reason: "no-eligible-npc-canon-changes" };
  const repository = canonRepository();
  const imported = [] as Array<{ npcId: string; displayName: string; path: string }>;
  for (const path of paths) {
    const noteContent = await getGitHubFile(repository, path, ref);
    const result = await syncObsidianNpcCanon(noteContent, path);
    await recordNpcAdminAudit("github-sync", "canon", result.npcId, ["canonHash", "canonExcerpt", "obsidianPath"]);
    imported.push({ npcId: result.npcId, displayName: result.displayName, path });
  }
  return { imported, skipped: false };
}
