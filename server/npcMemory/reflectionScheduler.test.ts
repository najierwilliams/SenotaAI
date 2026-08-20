import { describe, expect, it } from "vitest";
import { evaluateReflectionSchedule, nextReflectionEligibleAt, type ReflectionScheduleSnapshot } from "./reflectionScheduler";

const baseSchedule: ReflectionScheduleSnapshot = {
  id: 1,
  npcId: "luna001",
  status: "active",
  timeZone: "America/New_York",
  dailyTarget: 6,
  runsToday: 0,
  dayKey: "2026-01-15",
  scheduleCronTaskUid: "task-1",
  nextEligibleAt: null,
  lastRunAt: null,
  lastReflectionId: null,
  lastError: null,
};

describe("Luna automatic reflection schedule", () => {
  it("runs only when an active schedule is due during the Eastern daytime window", () => {
    const atTenAmEastern = Date.parse("2026-01-15T15:00:00.000Z");
    expect(evaluateReflectionSchedule(baseSchedule, atTenAmEastern)).toMatchObject({ run: true, reason: "due", dayKey: "2026-01-15" });
    expect(evaluateReflectionSchedule(baseSchedule, Date.parse("2026-01-15T12:00:00.000Z"))).toMatchObject({ run: false, reason: "outside-daytime-window" });
  });

  it("resets the daily counter on a new Eastern day and stops after the daily target", () => {
    const atTenAmEastern = Date.parse("2026-01-15T15:00:00.000Z");
    expect(evaluateReflectionSchedule({ ...baseSchedule, runsToday: 6 }, atTenAmEastern)).toMatchObject({ run: false, reason: "daily-target-met" });
    expect(evaluateReflectionSchedule({ ...baseSchedule, runsToday: 6, dayKey: "2026-01-14" }, atTenAmEastern)).toMatchObject({ run: true, runsToday: 0 });
  });

  it("uses a varied interval and defers an after-hours session to the next Eastern morning", () => {
    const atNineAmEastern = Date.parse("2026-01-15T14:00:00.000Z");
    expect(nextReflectionEligibleAt(atNineAmEastern, "America/New_York", () => 0)).toBe(Date.parse("2026-01-15T15:15:00.000Z"));

    const afterHoursEastern = Date.parse("2026-01-16T03:30:00.000Z");
    expect(nextReflectionEligibleAt(afterHoursEastern, "America/New_York", () => 0)).toBe(Date.parse("2026-01-16T14:00:00.000Z"));
  });

  it("keeps waiting until the selected varied interval arrives", () => {
    const atTenAmEastern = Date.parse("2026-01-15T15:00:00.000Z");
    expect(evaluateReflectionSchedule({ ...baseSchedule, nextEligibleAt: atTenAmEastern + 1 }, atTenAmEastern)).toMatchObject({ run: false, reason: "waiting-for-varied-interval" });
  });
});
