import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260827_luna_milestone5_cognitive_action_loop.sql", "utf8");
const verifier = readFileSync("supabase/verify_luna_milestone5_cognitive_action_loop.sql", "utf8");

describe("Milestone 5 additive database contract", () => {
  it("keeps autonomous action disabled by default and provides durable decision and validation tables", () => {
    expect(migration).toContain("cognitive_actions_enabled boolean not null default false");
    expect(migration).toContain("create table if not exists public.luna_autonomous_decisions");
    expect(migration).toContain("create table if not exists public.luna_result_validations");
    expect(migration).toContain("unique (workspace_id, decision_key)");
    expect(migration).toContain("unique (workspace_id, worker_id, output_hash)");
  });

  it("keeps mission linkage, RLS, and validation immutability durable and auditable", () => {
    expect(migration).toContain("mission_origin text not null default 'OWNER'");
    expect(migration).toContain("luna_missions_decision_id_fkey");
    expect(migration).toContain("luna_missions_decision_unique_idx");
    expect(migration).toContain("alter table public.luna_autonomous_decisions enable row level security");
    expect(migration).toContain("alter table public.luna_result_validations enable row level security");
    expect(migration).toContain("luna_result_validations_immutable before update or delete");
    expect(migration).toContain("raise exception 'Luna result validations are immutable'");
  });

  it("retains a read-only verifier that checks schema, RLS, policy, relation, index, trigger, function, and version extension", () => {
    expect(verifier.toLowerCase()).not.toMatch(/\b(insert|update|delete|alter|create|drop)\b/);
    for (const requiredCheck of [
      "table.luna_autonomous_decisions",
      "table.luna_result_validations",
      "rls.luna_autonomous_decisions",
      "policy.no_anon_or_authenticated_direct_access",
      "foreign_key.luna_missions.decision_id",
      "trigger.luna_result_validations_immutable",
      "function.luna_prevent_result_validation_mutation",
      "constraint.luna_cognitive_versions_subject_type_check",
    ]) expect(verifier).toContain(requiredCheck);
  });
});
