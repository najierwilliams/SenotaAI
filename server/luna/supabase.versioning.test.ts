import { describe, expect, it, vi } from "vitest";
import { persistLunaCognitiveVersion } from "./supabase";

const versionInput = {
  workspaceId: "workspace-1",
  subjectType: "MISSION",
  subjectId: "mission-1",
  version: 6,
  action: "UPDATED",
  actor: "luna:scout",
  reason: "Parallel durable worker completed its bounded handoff.",
  snapshot: { status: "RUNNING" },
  missionId: "mission-1",
};

describe("Luna cognitive immutable version persistence", () => {
  it("preserves both concurrent updates by retrying a unique version conflict with the next monotonic version", async () => {
    const insertVersion = vi.fn()
      .mockRejectedValueOnce(new Error('Luna cognitive storage request failed (409): {"code":"23505","message":"duplicate key value violates unique constraint \\"luna_cognitive_versions\\""}'))
      .mockResolvedValueOnce({ id: "version-7" });
    const nextVersion = vi.fn().mockResolvedValue(7);

    await expect(persistLunaCognitiveVersion(versionInput, { insertVersion, nextVersion })).resolves.toBe(7);

    expect(nextVersion).toHaveBeenCalledWith("workspace-1", "MISSION", "mission-1");
    expect(insertVersion).toHaveBeenNthCalledWith(1, expect.objectContaining({ version: 6 }));
    expect(insertVersion).toHaveBeenNthCalledWith(2, expect.objectContaining({ version: 7 }));
  });

  it("does not convert an unrelated persistence failure into a version retry", async () => {
    const insertVersion = vi.fn().mockRejectedValue(new Error("Luna cognitive storage request failed (401)."));
    const nextVersion = vi.fn();

    await expect(persistLunaCognitiveVersion(versionInput, { insertVersion, nextVersion })).rejects.toThrow("401");
    expect(nextVersion).not.toHaveBeenCalled();
  });
});
