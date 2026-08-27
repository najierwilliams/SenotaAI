export type LunaAcceptanceControl = "RETRY_ONCE" | "MEMORY_REVISION_ONCE" | "CANCELLATION_CHECKPOINTS";

const PREFIX = "[[LUNA_ACCEPTANCE:";
const SUFFIX = "]]";
const ALLOWED = new Set<LunaAcceptanceControl>(["RETRY_ONCE", "MEMORY_REVISION_ONCE", "CANCELLATION_CHECKPOINTS"]);

/**
 * Test controls are intentionally embedded only in an explicit owner-planned acceptance objective.
 * They are not HTTP routes, not browser actions, and never enable scientific or physical behavior.
 */
export function lunaAcceptanceControl(objective: string): LunaAcceptanceControl | null {
  const start = objective.indexOf(PREFIX);
  if (start < 0) return null;
  const end = objective.indexOf(SUFFIX, start + PREFIX.length);
  if (end < 0) return null;
  const candidate = objective.slice(start + PREFIX.length, end).trim();
  return ALLOWED.has(candidate as LunaAcceptanceControl) ? candidate as LunaAcceptanceControl : null;
}

export function hasLunaAcceptanceEvent(activity: Array<{ action: string; workerId?: string | null }>, action: string, workerId: string) {
  return activity.some((event) => event.action === action && event.workerId === workerId);
}

export function shouldInjectControlledRetry(input: { objective: string; activity: Array<{ action: string; workerId?: string | null }>; workerId: string }) {
  return lunaAcceptanceControl(input.objective) === "RETRY_ONCE"
    && !hasLunaAcceptanceEvent(input.activity, "ACCEPTANCE_CONTROLLED_FAILURE", input.workerId);
}

export function shouldCreateMemoryRevision(input: { objective: string; activity: Array<{ action: string; workerId?: string | null }>; workerId: string }) {
  return lunaAcceptanceControl(input.objective) === "MEMORY_REVISION_ONCE"
    && !hasLunaAcceptanceEvent(input.activity, "ACCEPTANCE_MEMORY_REVISION", input.workerId);
}

/**
 * Gives the real private worker a brief, non-side-effecting checkpoint interval only for
 * the explicit active-cancellation acceptance mission. Ordinary missions never wait here.
 */
export function shouldExerciseCancellationCheckpoints(objective: string) {
  return lunaAcceptanceControl(objective) === "CANCELLATION_CHECKPOINTS";
}
