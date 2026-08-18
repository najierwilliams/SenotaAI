import { describe, expect, it } from "vitest";
import { buildScheduledTaskInput, isValidSixFieldCron } from "./schedule";

describe("scheduled task cron validation", () => {
  it("accepts a six-field UTC cron expression", () => {
    expect(isValidSixFieldCron("0 0 9 * * 1-5")).toBe(true);
  });

  it("rejects the common five-field cron format", () => {
    expect(isValidSixFieldCron("0 9 * * 1-5")).toBe(false);
  });

  it("rejects invalid field characters", () => {
    expect(isValidSixFieldCron("0 0 morning * * 1")).toBe(false);
  });

  it("retains a schedule link when composing an autonomous task", () => {
    expect(buildScheduledTaskInput({ scheduleId: 8, userId: 2, goal: "Review the codebase weekly", model: "llama3", executionMode: "confirm", repository: "najierwilliams/SenotaAI" })).toMatchObject({ scheduleId: 8, userId: 2, repository: "najierwilliams/SenotaAI" });
  });
});
