import { describe, expect, it } from "vitest";
import { UnavailableLunaDurableRuntime, getLunaRuntimeAvailability } from "./runtime";
import { assertAcyclicTaskGraph, workerRolesForTaskGraph } from "./orchestrator";

describe("Luna durable orchestration boundary", () => {
  it("fails closed with no durable run identifier when the selected runtime is unconfigured", async () => {
    const runtime = new UnavailableLunaDurableRuntime("Runtime activation is required.");
    const status = await getLunaRuntimeAvailability(runtime);
    const result = await runtime.dispatch({ missionId: "mission", workspaceId: "workspace", idempotencyKey: "mission:test" });
    expect(status).toEqual({ provider: "unconfigured", status: "UNAVAILABLE", detail: "Runtime activation is required." });
    expect(result).toEqual({ accepted: false, runtimeStatus: "UNAVAILABLE", runId: null, message: "Runtime activation is required." });
  });

  it("accepts a directed acyclic worker graph and exposes unique roles within the configured bound", () => {
    expect(() => assertAcyclicTaskGraph([
      { key: "plan", dependsOnKeys: [] },
      { key: "scout", dependsOnKeys: ["plan"] },
      { key: "validate", dependsOnKeys: ["scout"] },
    ])).not.toThrow();
    expect(workerRolesForTaskGraph([
      { role: "PLANNER_AGENT" as const },
      { role: "SCOUT" as const },
      { role: "VALIDATOR" as const },
      { role: "SCOUT" as const },
    ], 2)).toEqual(["PLANNER_AGENT", "SCOUT"]);
  });

  it("rejects cyclic and missing dependencies before any runtime dispatch", () => {
    expect(() => assertAcyclicTaskGraph([
      { key: "a", dependsOnKeys: ["b"] },
      { key: "b", dependsOnKeys: ["a"] },
    ])).toThrow("cycle");
    expect(() => assertAcyclicTaskGraph([
      { key: "a", dependsOnKeys: ["missing"] },
    ])).toThrow("missing dependency");
  });
});
