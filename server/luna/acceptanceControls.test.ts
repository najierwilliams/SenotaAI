import { describe, expect, it } from "vitest";
import { hasLunaAcceptanceEvent, lunaAcceptanceControl, shouldCreateMemoryRevision, shouldInjectControlledRetry } from "./acceptanceControls";

describe("Luna acceptance controls", () => {
  it("recognizes only explicit, bounded acceptance controls", () => {
    expect(lunaAcceptanceControl("Routine non-scientific objective")).toBeNull();
    expect(lunaAcceptanceControl("[[LUNA_ACCEPTANCE:RETRY_ONCE]] Non-scientific test.")).toBe("RETRY_ONCE");
    expect(lunaAcceptanceControl("[[LUNA_ACCEPTANCE:UNSUPPORTED]]")).toBeNull();
  });

  it("injects exactly one Queue-rethrown retry failure per worker", () => {
    const input = { objective: "[[LUNA_ACCEPTANCE:RETRY_ONCE]] Non-scientific test.", workerId: "worker-1" };
    expect(shouldInjectControlledRetry({ ...input, activity: [] })).toBe(true);
    const activity = [{ action: "ACCEPTANCE_CONTROLLED_FAILURE", workerId: "worker-1" }];
    expect(hasLunaAcceptanceEvent(activity, "ACCEPTANCE_CONTROLLED_FAILURE", "worker-1")).toBe(true);
    expect(shouldInjectControlledRetry({ ...input, activity })).toBe(false);
    expect(shouldInjectControlledRetry({ ...input, workerId: "worker-2", activity })).toBe(true);
  });

  it("creates one auditable autonomous revision only for the explicit memory control", () => {
    const input = { objective: "[[LUNA_ACCEPTANCE:MEMORY_REVISION_ONCE]] Non-scientific test.", workerId: "memory-worker" };
    expect(shouldCreateMemoryRevision({ ...input, activity: [] })).toBe(true);
    expect(shouldCreateMemoryRevision({ ...input, activity: [{ action: "ACCEPTANCE_MEMORY_REVISION", workerId: "memory-worker" }] })).toBe(false);
  });
});
