export const SELF_MODIFICATION_LIMITS = {
  maxGenerationAttempts: 3,
  maxTestAttempts: 2,
  maxExecutionMs: 120_000,
  maxModelCalls: 3,
  maxTokenBudget: 24_000,
  maxConcurrentJobs: 1,
  maxChangedFiles: 12,
  maxFileBytes: 120_000,
} as const;

export type SelfModificationRun = {
  id: string;
  workspaceId: string;
  objective: string;
  reason: string;
  status: "PROPOSED" | "GENERATING" | "TESTING" | "SAFETY_REJECTED" | "CANDIDATE_READY" | "DEPLOYMENT_BLOCKED" | "DEPLOYED" | "ROLLED_BACK" | "FAILED";
  previousVersion: string | null;
  candidateVersion: string | null;
  rollbackAvailable: boolean;
  limits: Record<string, unknown>;
  safetyResult: Record<string, unknown>;
  deploymentResult: Record<string, unknown>;
  rollbackResult: Record<string, unknown>;
  outcome: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SelfModificationFile = { id: string; workspaceId: string; runId: string; path: string; beforeSha256: string | null; afterSha256: string | null; beforeContent: string | null; afterContent: string | null; diff: string | null; protected: boolean; createdAt: string };
export type SelfModificationTest = { id: string; workspaceId: string; runId: string; testName: string; status: "PASSED" | "FAILED" | "SKIPPED" | "BLOCKED"; output: string; durationMs: number; createdAt: string };

export type SelfModificationDecision = {
  allowed: boolean;
  protected: boolean;
  reason: string;
};

/**
 * This policy is intentionally fail-closed. It protects the controls that cannot be
 * delegated to a candidate application workspace. It is not claimed to be an external
 * deployment authority; production deployment remains blocked until one exists.
 */
const PROTECTED_EXACT = new Set([
  "vercel.json",
  "package.json",
  "pnpm-lock.yaml",
  "supabase/config.toml",
]);
const PROTECTED_PREFIXES = [
  ".github/",
  ".vercel/",
  "supabase/migrations/",
  "server/_core/owner",
  "server/_core/auth",
  "server/_core/trpc",
  "server/knowledgeSpace/ownerAuth",
  "server/luna/vercelQueueConsumer",
  "server/luna/vercelQueueRuntime",
  "server/luna/selfModification",
  "server/agent/approvalWorkflow",
];

export function assessSelfModificationPath(path: string): SelfModificationDecision {
  const normalized = path.trim().replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || normalized.includes("..")) {
    return { allowed: false, protected: true, reason: "Invalid or traversal path is rejected." };
  }
  if (PROTECTED_EXACT.has(normalized) || PROTECTED_PREFIXES.some(prefix => normalized === prefix || normalized.startsWith(prefix))) {
    return { allowed: false, protected: true, reason: "Protected safety, authorization, deployment, audit, Queue, or self-modification control." };
  }
  if (!/^[A-Za-z0-9._/-]+$/.test(normalized)) {
    return { allowed: false, protected: true, reason: "Path contains unsupported characters." };
  }
  return { allowed: true, protected: false, reason: "Ordinary application path eligible for isolated candidate modification." };
}

export type CandidateFileChange = {
  path: string;
  beforeContent: string | null;
  afterContent: string | null;
};

export function validateCandidateChanges(changes: CandidateFileChange[]) {
  if (changes.length < 1 || changes.length > SELF_MODIFICATION_LIMITS.maxChangedFiles) {
    throw new Error(`Candidate must contain between 1 and ${SELF_MODIFICATION_LIMITS.maxChangedFiles} file changes.`);
  }
  const seen = new Set<string>();
  return changes.map(change => {
    const decision = assessSelfModificationPath(change.path);
    if (!decision.allowed) throw new Error(`${change.path}: ${decision.reason}`);
    const path = change.path.trim().replaceAll("\\", "/").replace(/^\.\//, "");
    if (seen.has(path)) throw new Error(`Duplicate candidate path: ${path}`);
    seen.add(path);
    for (const content of [change.beforeContent, change.afterContent]) {
      if (content !== null && Buffer.byteLength(content, "utf8") > SELF_MODIFICATION_LIMITS.maxFileBytes) {
        throw new Error(`Candidate file exceeds ${SELF_MODIFICATION_LIMITS.maxFileBytes} bytes: ${path}`);
      }
    }
    if (change.beforeContent === null && change.afterContent === null) throw new Error(`Candidate file has no content: ${path}`);
    return { ...change, path, protected: decision.protected };
  });
}

export function safetyGateForCandidate(changes: CandidateFileChange[]) {
  try {
    const validated = validateCandidateChanges(changes);
    return { passed: true, deploymentAuthorized: false, reason: "Candidate paths passed the application-side policy; independent external deployment gate is unavailable, so deployment is blocked.", changedFiles: validated.length };
  } catch (error) {
    return { passed: false, deploymentAuthorized: false, reason: error instanceof Error ? error.message : "Candidate rejected by fail-closed policy.", changedFiles: 0 };
  }
}
