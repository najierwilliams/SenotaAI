import type { LunaDurableRuntime, LunaRuntimeDispatch, LunaRuntimeResult, LunaRuntimeStatus } from "@shared/lunaCognitive";

export type LunaRuntimeAvailability = { status: LunaRuntimeStatus; provider: string; detail: string };

/**
 * This adapter is intentionally operational rather than aspirational: until a durable provider
 * client is installed and configured, it accepts no work, returns no run identifier, and leaves
 * the caller to persist a WAITING_FOR_RUNTIME state. It prevents a normal HTTP handler from
 * impersonating background execution.
 */
export class UnavailableLunaDurableRuntime implements LunaDurableRuntime {
  readonly provider = "unconfigured";
  constructor(private readonly detail = "No supported durable workflow/queue runtime is configured for Luna. Install and configure a verified runtime adapter before dispatching unattended work.") {}

  async getStatus() {
    return { status: "UNAVAILABLE" as const, detail: this.detail };
  }

  async dispatch(_input: LunaRuntimeDispatch): Promise<LunaRuntimeResult> {
    return { accepted: false, runtimeStatus: "UNAVAILABLE", runId: null, message: this.detail };
  }

  async cancel(_runId: string): Promise<void> {
    // There is no external run to cancel. The persistent mission cancellation is handled by the orchestrator.
  }
}

/**
 * Reads only an explicit provider selection. A value alone never marks a runtime configured;
 * configuration must be backed by a concrete adapter that returns a durable run ID.
 */
export function getLunaDurableRuntime(): LunaDurableRuntime {
  const provider = process.env.LUNA_DURABLE_RUNTIME_PROVIDER?.trim().toLowerCase();
  if (!provider) return new UnavailableLunaDurableRuntime();
  return new UnavailableLunaDurableRuntime(`Luna durable runtime provider '${provider}' is selected but no verified provider adapter is installed. The mission will remain waiting rather than running inside a web request.`);
}

export async function getLunaRuntimeAvailability(runtime: LunaDurableRuntime = getLunaDurableRuntime()): Promise<LunaRuntimeAvailability> {
  const result = await runtime.getStatus();
  return { provider: runtime.provider, ...result };
}
