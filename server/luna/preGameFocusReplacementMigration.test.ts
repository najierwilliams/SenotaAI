import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const fix = readFileSync(resolve(process.cwd(), "supabase/migrations/20260828_luna_pre_game_focus_replacement_fix.sql"), "utf8");

describe("Luna focus replacement migration", () => {
  it("permits only the one-way replacement timestamp required by durable focus history", () => {
    expect(fix).toContain("create or replace function public.luna_prevent_focus_assignment_history_mutation()");
    expect(fix).toContain("old.replaced_at is null");
    expect(fix).toContain("new.replaced_at is not null");
    expect(fix).toContain("(to_jsonb(new) - 'replaced_at') = (to_jsonb(old) - 'replaced_at')");
    expect(fix).toContain("Luna focus assignment history permits only its one-way replacement timestamp");
  });

  it("replaces only the focus-assignment trigger and performs no data, policy, scientific, or runtime mutation", () => {
    expect(fix).toContain("drop trigger if exists luna_focus_assignments_immutable on public.luna_focus_assignments");
    expect(fix).toContain("before update or delete on public.luna_focus_assignments");
    expect(fix).not.toMatch(/\b(?:insert|update|delete)\s+(?:into\s+)?public\./i);
    expect(fix).not.toMatch(/create\s+policy|alter\s+table/i);
    expect(fix).not.toMatch(/(?:insert\s+into|update|delete\s+from)\s+public\.luna_(?!focus_assignments)/i);
  });
});
