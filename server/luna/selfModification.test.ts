import { describe, expect, it } from "vitest";
import { assessSelfModificationPath, safetyGateForCandidate, validateCandidateChanges } from "./selfModification";

describe("Luna self-modification protected boundary", () => {
  it("rejects protected deployment, auth, Queue, migration, and policy paths", () => {
    for (const path of ["vercel.json", "supabase/migrations/new.sql", "server/_core/auth.ts", "server/luna/vercelQueueConsumer.ts", "server/luna/selfModification.ts", "../server/app.ts"]) {
      expect(assessSelfModificationPath(path)).toMatchObject({ allowed: false, protected: true });
    }
  });

  it("accepts ordinary application files only as isolated candidate changes", () => {
    expect(assessSelfModificationPath("client/src/components/Example.tsx")).toMatchObject({ allowed: true, protected: false });
    const result = safetyGateForCandidate([{ path: "client/src/components/Example.tsx", beforeContent: "old", afterContent: "new" }]);
    expect(result).toMatchObject({ passed: true, deploymentAuthorized: false, changedFiles: 1 });
  });

  it("rejects duplicates, oversized candidates, and protected modifications", () => {
    expect(() => validateCandidateChanges([
      { path: "client/src/a.ts", beforeContent: "a", afterContent: "b" },
      { path: "./client/src/a.ts", beforeContent: "a", afterContent: "c" },
    ])).toThrow("Duplicate candidate path");
    expect(safetyGateForCandidate([{ path: "vercel.json", beforeContent: "{}", afterContent: "{}" }]).passed).toBe(false);
  });
});
