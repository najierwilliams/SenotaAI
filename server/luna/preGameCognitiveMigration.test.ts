import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260827_luna_pre_game_cognitive_master.sql"), "utf8");

describe("Luna pre-game cognitive master migration", () => {
  it("is additive and creates the required durable cognitive domains", () => {
    expect(migration).toContain("-- Additive only.");
    [
      "luna_cognitive_inputs", "luna_experiences", "luna_cognitive_cycles", "luna_attention_assessments", "luna_focus_assignments",
      "luna_uncertainty_records", "luna_novelty_records", "luna_contradictions", "luna_gap_profiles", "luna_curiosity_assessments",
      "luna_preferences", "luna_internal_state_observations", "luna_self_model_facts", "luna_goal_profiles", "luna_goal_dependencies",
      "luna_commitments", "luna_hypotheses", "luna_reasoning_artifacts", "luna_learning_records", "luna_worker_performance_snapshots",
      "luna_relationships", "luna_social_interactions", "luna_world_events", "luna_maintenance_reports",
    ].forEach(table => expect(migration).toContain(`public.${table}`));
  });

  it("retains server-only owner-scoped RLS and immutable-record safeguards", () => {
    expect(migration).toContain("Browser clients remain denied by RLS");
    expect(migration).toContain("No anon/authenticated policies are created");
    expect(migration).not.toMatch(/create\s+policy/i);
    ["luna_cognitive_inputs", "luna_experiences", "luna_reasoning_artifacts", "luna_learning_records", "luna_world_events", "luna_maintenance_reports"].forEach(table => {
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
      expect(migration).toContain(`'${table}'`);
    });
  });

  it("preserves bounded cycles, explicit lifecycle enums, version compatibility, and no scientific/provider mutation", () => {
    expect(migration).toContain("evaluated_count between 0 and 100");
    expect(migration).toContain("derived_count between 0 and 16");
    expect(migration).toContain("'UNRESOLVED','UNDER_INVESTIGATION','RESOLVED','ACCEPTED_A','ACCEPTED_B','INCONCLUSIVE'");
    expect(migration).toContain("'COGNITIVE_INPUT','EXPERIENCE','COGNITIVE_CYCLE'");
    expect(migration).toContain("'RELATIONSHIP','SOCIAL_INTERACTION','WORLD_EVENT','MAINTENANCE_REPORT'");
    expect(migration).toContain("does not alter provider records, scientific mappings, or runtime dispatch");
    expect(migration).not.toMatch(/update\s+public\.luna_(?:knowledge_objects|knowledge_relationships)/i);
  });
});
