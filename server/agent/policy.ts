import type { ExecutionMode } from "./contracts";

export type AgentActionRisk = "read" | "reversible" | "sensitive" | "destructive";

const ACTION_RISKS: Record<string, AgentActionRisk> = {
  list_repository_files: "read",
  read_repository_file: "read",
  get_deployment_status: "read",
  create_work_branch: "reversible",
  write_repository_file: "reversible",
  open_pull_request: "reversible",
  deploy_preview: "reversible",
  delete_repository_file: "destructive",
  redeploy_production: "sensitive",
};

export function getActionRisk(actionName: string): AgentActionRisk {
  return ACTION_RISKS[actionName] ?? "sensitive";
}

/**
 * Auto mode is deliberately constrained: a model may inspect and create reversible
 * branch/PR/preview work, but it cannot delete source or affect production without
 * a recorded human decision.
 */
export function requiresApproval(actionName: string, executionMode: ExecutionMode): boolean {
  const risk = getActionRisk(actionName);
  if (risk === "read") return false;
  if (risk === "destructive" || risk === "sensitive") return true;
  return executionMode === "confirm";
}

export function approvalTitleFor(actionName: string): string {
  const labels: Record<string, string> = {
    create_work_branch: "Create a working branch",
    write_repository_file: "Write repository files",
    delete_repository_file: "Delete a repository file",
    open_pull_request: "Open a pull request",
    deploy_preview: "Trigger a preview deployment",
    redeploy_production: "Redeploy production",
  };
  return labels[actionName] ?? "Execute a sensitive agent action";
}
