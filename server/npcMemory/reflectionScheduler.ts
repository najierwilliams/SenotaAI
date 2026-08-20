import { and, eq, isNull, lte, or } from "drizzle-orm";
import { npcReflectionSchedules, type NpcReflectionSchedule } from "../../drizzle/schema";
import { getDb } from "../db";
import { listCognitiveReflections, proposeCognitiveReflection } from "./cognitiveState";

const DAY_START_HOUR = 9;
const DAY_END_HOUR = 22;
const MIN_GAP_MINUTES = 75;
const MAX_GAP_MINUTES = 165;
const MAX_PENDING_REVIEW_CARDS = 6;

export type ReflectionScheduleSnapshot = Pick<NpcReflectionSchedule, "id" | "npcId" | "status" | "timeZone" | "dailyTarget" | "runsToday" | "dayKey" | "scheduleCronTaskUid" | "nextEligibleAt" | "lastRunAt" | "lastReflectionId" | "lastError">;

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db;
}

function localizedParts(now: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(now));
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { dayKey: `${value("year")}-${String(value("month")).padStart(2, "0")}-${String(value("day")).padStart(2, "0")}`, hour: value("hour") };
}

export function nextReflectionEligibleAt(now: number, timeZone: string, random = Math.random) {
  const delayMinutes = MIN_GAP_MINUTES + Math.floor(random() * (MAX_GAP_MINUTES - MIN_GAP_MINUTES + 1));
  const earliest = now + delayMinutes * 60_000;
  const next = localizedParts(earliest, timeZone);
  if (next.hour >= DAY_START_HOUR && next.hour < DAY_END_HOUR) return earliest;
  let candidate = earliest;
  while (localizedParts(candidate, timeZone).hour < DAY_START_HOUR || localizedParts(candidate, timeZone).hour >= DAY_END_HOUR) candidate += 60_000;
  return candidate + Math.floor(random() * 46) * 60_000;
}

export function evaluateReflectionSchedule(schedule: ReflectionScheduleSnapshot, now = Date.now()) {
  const local = localizedParts(now, schedule.timeZone);
  const runsToday = schedule.dayKey === local.dayKey ? schedule.runsToday : 0;
  if (schedule.status !== "active") return { run: false, reason: "paused", runsToday, dayKey: local.dayKey } as const;
  if (local.hour < DAY_START_HOUR || local.hour >= DAY_END_HOUR) return { run: false, reason: "outside-daytime-window", runsToday, dayKey: local.dayKey } as const;
  if (runsToday >= schedule.dailyTarget) return { run: false, reason: "daily-target-met", runsToday, dayKey: local.dayKey } as const;
  if (schedule.nextEligibleAt && schedule.nextEligibleAt > now) return { run: false, reason: "waiting-for-varied-interval", runsToday, dayKey: local.dayKey } as const;
  return { run: true, reason: "due", runsToday, dayKey: local.dayKey } as const;
}

export async function getNpcReflectionSchedule(npcId: string) {
  const db = await requireDb();
  const rows = await db.select().from(npcReflectionSchedules).where(eq(npcReflectionSchedules.npcId, npcId)).limit(1);
  return rows[0] ?? null;
}

export async function getNpcReflectionScheduleByCronTaskUid(taskUid: string) {
  const db = await requireDb();
  const rows = await db.select().from(npcReflectionSchedules).where(eq(npcReflectionSchedules.scheduleCronTaskUid, taskUid)).limit(1);
  return rows[0] ?? null;
}

export async function createNpcReflectionSchedule(input: { npcId: string; taskUid: string; timeZone?: string; dailyTarget?: number; nextEligibleAt?: number | null }) {
  const db = await requireDb();
  const now = Date.now();
  const values = {
    npcId: input.npcId,
    scheduleCronTaskUid: input.taskUid,
    timeZone: input.timeZone ?? "America/New_York",
    dailyTarget: input.dailyTarget ?? 6,
    nextEligibleAt: input.nextEligibleAt ?? now,
    runsToday: 0,
    dayKey: null,
    status: "active" as const,
    lastRunAt: null,
    lastReflectionId: null,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(npcReflectionSchedules).values(values).onDuplicateKeyUpdate({ set: { ...values, updatedAt: now } });
  return getNpcReflectionSchedule(input.npcId);
}

export async function runNpcReflectionSchedule(taskUid: string, options: { now?: number; random?: () => number; pendingReviewCount?: (npcId: string) => Promise<number>; propose?: (npcId: string, experience: string) => ReturnType<typeof proposeCognitiveReflection> } = {}) {
  const now = options.now ?? Date.now();
  const random = options.random ?? Math.random;
  const db = await requireDb();
  const schedule = await getNpcReflectionScheduleByCronTaskUid(taskUid);
  if (!schedule || schedule.status !== "active") return { ok: true, skipped: "orphan-or-paused" } as const;

  const timing = evaluateReflectionSchedule(schedule, now);
  if (!timing.run) {
    if (schedule.dayKey !== timing.dayKey) await db.update(npcReflectionSchedules).set({ dayKey: timing.dayKey, runsToday: timing.runsToday, updatedAt: now }).where(eq(npcReflectionSchedules.id, schedule.id));
    return { ok: true, skipped: timing.reason } as const;
  }

  const countPending = options.pendingReviewCount ?? (async (npcId: string) => (await listCognitiveReflections(npcId, 40)).filter((reflection: { status: string }) => reflection.status === "proposed").length);
  if (await countPending(schedule.npcId) >= MAX_PENDING_REVIEW_CARDS) {
    const nextEligibleAt = now + 90 * 60_000;
    await db.update(npcReflectionSchedules).set({ dayKey: timing.dayKey, runsToday: timing.runsToday, nextEligibleAt, lastError: "Review queue is full; the next session was deferred.", updatedAt: now }).where(eq(npcReflectionSchedules.id, schedule.id));
    return { ok: true, skipped: "review-queue-full", nextEligibleAt } as const;
  }

  const nextEligibleAt = nextReflectionEligibleAt(now, schedule.timeZone, random);
  const claimed = await db.update(npcReflectionSchedules).set({ dayKey: timing.dayKey, runsToday: timing.runsToday + 1, nextEligibleAt, lastRunAt: now, lastError: null, updatedAt: now }).where(and(eq(npcReflectionSchedules.id, schedule.id), eq(npcReflectionSchedules.status, "active"), or(isNull(npcReflectionSchedules.nextEligibleAt), lte(npcReflectionSchedules.nextEligibleAt, now))));
  if (!claimed[0]?.affectedRows) return { ok: true, skipped: "already-claimed" } as const;

  const experience = "Scheduled administrator-approved reflection session. Review only Luna’s current approved cognitive state and identify at most one small, evidence-based refinement candidate for self-model clarity, memory continuity, goal clarity, or reflection. This is a review proposal only: do not claim subjective experience, sentience, consciousness, or unrestricted free will, and do not apply any change.";
  try {
    const propose = options.propose ?? proposeCognitiveReflection;
    const reflection = await propose(schedule.npcId, experience);
    await db.update(npcReflectionSchedules).set({ lastReflectionId: reflection.id, lastError: null, updatedAt: Date.now() }).where(eq(npcReflectionSchedules.id, schedule.id));
    return { ok: true, reflectionId: reflection.id, nextEligibleAt, reviewOnly: true } as const;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.update(npcReflectionSchedules).set({ lastError: message.slice(0, 4_000), updatedAt: Date.now() }).where(eq(npcReflectionSchedules.id, schedule.id));
    return { ok: true, skipped: "reflection-error-recorded", nextEligibleAt } as const;
  }
}
