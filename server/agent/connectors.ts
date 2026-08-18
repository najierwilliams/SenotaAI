import { Buffer } from "node:buffer";
import type { AgentToolDefinition, ToolExecutionContext } from "./contracts";

type GitHubConfig = { token: string };
type VercelConfig = { token: string; teamId?: string };

const AGENT_TOOLS: AgentToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "list_repository_files",
      description: "List the repository file tree before planning code changes.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "read_repository_file",
      description: "Read a UTF-8 text file from the working branch before editing it.",
      parameters: {
        type: "object",
        required: ["path"],
        properties: { path: { type: "string", description: "Repository-relative file path" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_work_branch",
      description: "Create or verify the isolated work branch for this task before writing code.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "write_repository_file",
      description: "Create or update one UTF-8 source file in the isolated work branch. Always read an existing file first.",
      parameters: {
        type: "object",
        required: ["path", "content", "message"],
        properties: {
          path: { type: "string", description: "Repository-relative file path" },
          content: { type: "string", description: "Complete UTF-8 replacement file content" },
          message: { type: "string", description: "Concise commit message" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_repository_file",
      description: "Delete one repository file from the isolated work branch only when explicitly necessary.",
      parameters: {
        type: "object",
        required: ["path", "message"],
        properties: {
          path: { type: "string", description: "Repository-relative file path" },
          message: { type: "string", description: "Concise commit message" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "open_pull_request",
      description: "Open a pull request from the isolated work branch for review after code changes are complete.",
      parameters: {
        type: "object",
        required: ["title", "body"],
        properties: {
          title: { type: "string" },
          body: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_deployment_status",
      description: "Read the current Vercel deployment status and live URL for the configured project.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "deploy_preview",
      description: "Trigger a preview deployment from the isolated GitHub branch after changes are committed.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "redeploy_production",
      description: "Redeploy the latest production build only after explicit approval.",
      parameters: { type: "object", properties: {} },
    },
  },
];

export function getAgentToolDefinitions(): AgentToolDefinition[] {
  return AGENT_TOOLS;
}

function getGitHubConfig(env: NodeJS.ProcessEnv = process.env): GitHubConfig {
  const token = env.GITHUB_TOKEN?.trim();
  if (!token) throw new Error("GitHub is not configured. Add GITHUB_TOKEN in Settings before executing repository actions.");
  return { token };
}

function getVercelConfig(env: NodeJS.ProcessEnv = process.env): VercelConfig {
  const token = env.VERCEL_TOKEN?.trim();
  if (!token) throw new Error("Vercel is not configured. Add VERCEL_TOKEN in Settings before deployment actions.");
  return { token, teamId: env.VERCEL_TEAM_ID?.trim() || undefined };
}

function splitRepository(repository: string) {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo || repository.split("/").length !== 2) throw new Error("Repository must use the owner/name format.");
  return { owner, repo };
}

export function validateRepositoryPath(path: string) {
  if (!path || path.startsWith("/") || path.includes("..") || path.includes("\\")) {
    throw new Error("Repository file paths must be relative and cannot include traversal segments.");
  }
}

async function githubRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { token } = getGitHubConfig();
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
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { message?: string }).message || `GitHub request failed (${response.status}).`);
  return data as T;
}

async function getDefaultBranch(repository: string) {
  const { owner, repo } = splitRepository(repository);
  const data = await githubRequest<{ default_branch: string }>(`/repos/${owner}/${repo}`);
  return data.default_branch;
}

async function getFileMetadata(repository: string, path: string, ref: string) {
  validateRepositoryPath(path);
  const { owner, repo } = splitRepository(repository);
  return githubRequest<{ content?: string; encoding?: string; sha: string; path: string }>(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`);
}

async function ensureWorkBranch(ctx: ToolExecutionContext) {
  const { owner, repo } = splitRepository(ctx.repository);
  try {
    await githubRequest(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(ctx.workBranch)}`);
    return { branch: ctx.workBranch, created: false };
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Not Found")) throw error;
  }
  const defaultBranch = await getDefaultBranch(ctx.repository);
  const ref = await githubRequest<{ object: { sha: string } }>(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(defaultBranch)}`);
  await githubRequest(`/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${ctx.workBranch}`, sha: ref.object.sha }),
  });
  return { branch: ctx.workBranch, created: true };
}

async function listRepositoryFiles(ctx: ToolExecutionContext) {
  const { owner, repo } = splitRepository(ctx.repository);
  const defaultBranch = await getDefaultBranch(ctx.repository);
  const tree = await githubRequest<{ tree: Array<{ path: string; type: string; size?: number }> }>(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`);
  return tree.tree.filter((entry) => entry.type === "blob").slice(0, 500).map((entry) => ({ path: entry.path, size: entry.size ?? 0 }));
}

async function readRepositoryFile(ctx: ToolExecutionContext, args: Record<string, unknown>) {
  const path = String(args.path || "");
  const metadata = await getFileMetadata(ctx.repository, path, ctx.workBranch);
  if (metadata.encoding !== "base64" || !metadata.content) throw new Error("Only base64-encoded text files can be read.");
  return { path: metadata.path, sha: metadata.sha, content: Buffer.from(metadata.content.replace(/\n/g, ""), "base64").toString("utf8") };
}

async function writeRepositoryFile(ctx: ToolExecutionContext, args: Record<string, unknown>) {
  const path = String(args.path || "");
  const content = String(args.content || "");
  const message = String(args.message || "Update source file");
  validateRepositoryPath(path);
  const { owner, repo } = splitRepository(ctx.repository);
  let existingSha: string | undefined;
  try {
    existingSha = (await getFileMetadata(ctx.repository, path, ctx.workBranch)).sha;
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Not Found")) throw error;
  }
  const result = await githubRequest<{ commit?: { sha?: string }; content?: { path?: string } }>(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch: ctx.workBranch,
      ...(existingSha ? { sha: existingSha } : {}),
    }),
  });
  return { path: result.content?.path || path, commitSha: result.commit?.sha || null };
}

async function deleteRepositoryFile(ctx: ToolExecutionContext, args: Record<string, unknown>) {
  const path = String(args.path || "");
  const message = String(args.message || "Remove obsolete source file");
  const existing = await getFileMetadata(ctx.repository, path, ctx.workBranch);
  const { owner, repo } = splitRepository(ctx.repository);
  const result = await githubRequest<{ commit?: { sha?: string } }>(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha: existing.sha, branch: ctx.workBranch }),
  });
  return { path, commitSha: result.commit?.sha || null };
}

async function openPullRequest(ctx: ToolExecutionContext, args: Record<string, unknown>) {
  const { owner, repo } = splitRepository(ctx.repository);
  const base = await getDefaultBranch(ctx.repository);
  const title = String(args.title || "SenotaAI agent changes");
  const body = String(args.body || "Changes prepared by SenotaAI.");
  const result = await githubRequest<{ number: number; html_url: string; state: string }>(`/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body, head: ctx.workBranch, base }),
  });
  return { number: result.number, url: result.html_url, state: result.state };
}

async function vercelRequest<T>(path: string, init: RequestInit = {}) {
  const config = getVercelConfig();
  const response = await fetch(`https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}${config.teamId ? `teamId=${encodeURIComponent(config.teamId)}` : ""}`, {
    ...init,
    headers: { Authorization: `Bearer ${config.token}`, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(60_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: { message?: string }; message?: string }).error?.message || (data as { message?: string }).message || `Vercel request failed (${response.status}).`);
  return data as T;
}

async function getDeploymentStatus(ctx: ToolExecutionContext) {
  if (!ctx.vercelProject) throw new Error("Select a Vercel project in Settings before requesting deployment status.");
  const data = await vercelRequest<{ deployments?: Array<{ uid: string; url: string; readyState: string; target?: string | null; createdAt: number }> }>(`/v6/deployments?projectId=${encodeURIComponent(ctx.vercelProject)}&limit=1`);
  const deployment = data.deployments?.[0];
  return deployment ? { id: deployment.uid, url: `https://${deployment.url}`, status: deployment.readyState, target: deployment.target ?? "preview" } : { status: "NOT_FOUND" };
}

type VercelBuildEvent = {
  type?: string;
  payload?: { text?: string; id?: string; serial?: string };
};

async function getVercelBuildEvents(deploymentId: string): Promise<VercelBuildEvent[]> {
  const events = await vercelRequest<VercelBuildEvent[]>(`/v3/deployments/${encodeURIComponent(deploymentId)}/events?limit=50&direction=backward`);
  return Array.isArray(events) ? events : [];
}

async function createVercelDeployment(ctx: ToolExecutionContext, target: "preview" | "production") {
  if (!ctx.vercelProject) throw new Error("Select a Vercel project in Settings before triggering a deployment.");
  const { owner, repo } = splitRepository(ctx.repository);
  const repoDetails = await githubRequest<{ id: number }>(`/repos/${owner}/${repo}`);
  const deployment = await vercelRequest<{ id: string; url?: string; readyState?: string }>("/v13/deployments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project: ctx.vercelProject,
      target,
      gitSource: { type: "github", repoId: String(repoDetails.id), ref: target === "production" ? await getDefaultBranch(ctx.repository) : ctx.workBranch },
    }),
  });
  let current = deployment;
  const emittedBuildEvents = new Set<string>();
  await ctx.onProgress?.(`Vercel accepted the ${target} deployment; current state: ${current.readyState ?? "QUEUED"}.`);
  for (let attempt = 0; attempt < 4 && !["READY", "ERROR", "CANCELED"].includes(current.readyState ?? ""); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    current = await vercelRequest<{ id: string; url?: string; readyState?: string }>(`/v13/deployments/${encodeURIComponent(deployment.id)}`);
    await ctx.onProgress?.(`Vercel deployment state: ${current.readyState ?? "UNKNOWN"}.`);
    try {
      const events = await getVercelBuildEvents(deployment.id);
      for (const buildEvent of events.reverse()) {
        const text = buildEvent.payload?.text?.trim();
        if (!text) continue;
        const key = buildEvent.payload?.id || buildEvent.payload?.serial || `${buildEvent.type}:${text}`;
        if (emittedBuildEvents.has(key)) continue;
        emittedBuildEvents.add(key);
        await ctx.onProgress?.(`Vercel build · ${text.slice(0, 1_500)}`);
      }
    } catch (error) {
      // Deployment-event access may vary by plan and project permissions; status polling remains authoritative.
      console.warn("[SenotaAI] Vercel build event retrieval unavailable", error);
    }
  }
  return { id: current.id, url: current.url ? `https://${current.url}` : null, status: current.readyState ?? "QUEUED" };
}

export async function executeConnectorTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolExecutionContext,
): Promise<unknown> {
  switch (name) {
    case "list_repository_files": return listRepositoryFiles(ctx);
    case "read_repository_file": return readRepositoryFile(ctx, args);
    case "create_work_branch": return ensureWorkBranch(ctx);
    case "write_repository_file": return writeRepositoryFile(ctx, args);
    case "delete_repository_file": return deleteRepositoryFile(ctx, args);
    case "open_pull_request": return openPullRequest(ctx, args);
    case "get_deployment_status": return getDeploymentStatus(ctx);
    case "deploy_preview": return createVercelDeployment(ctx, "preview");
    case "redeploy_production": return createVercelDeployment(ctx, "production");
    default: throw new Error(`Unknown agent tool: ${name}`);
  }
}
