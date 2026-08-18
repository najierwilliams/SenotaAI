import { describe, expect, it } from "vitest";
import { getActionRisk, requiresApproval } from "./policy";

describe("agent action approval policy", () => {
  it("allows read-only actions in every execution mode", () => {
    expect(requiresApproval("read_repository_file", "confirm")).toBe(false);
    expect(requiresApproval("get_deployment_status", "auto")).toBe(false);
  });

  it("requires an explicit approval for reversible actions in confirm mode", () => {
    expect(requiresApproval("write_repository_file", "confirm")).toBe(true);
    expect(requiresApproval("open_pull_request", "confirm")).toBe(true);
  });

  it("permits only reversible actions in auto mode", () => {
    expect(requiresApproval("write_repository_file", "auto")).toBe(false);
    expect(requiresApproval("delete_repository_file", "auto")).toBe(true);
    expect(requiresApproval("redeploy_production", "auto")).toBe(true);
  });

  it("treats unknown actions as sensitive", () => {
    expect(getActionRisk("unknown_connector_action")).toBe("sensitive");
    expect(requiresApproval("unknown_connector_action", "auto")).toBe(true);
  });
});
