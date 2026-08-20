import { listCognitiveReflections, proposeCognitiveReflection } from "./cognitiveState";

const DAY_START_HOUR = 9;
const DAY_END_HOUR = 22;
const MIN_GAP_MINUTES = 75;
const MAX_GAP_MINUTES = 165;
const MAX_PENDING_REVIEW_CARDS = 6;

export type ReflectionScheduleSnapshot = {
  id: string;
  npcId: string;
  status: "active" | "paused" | "failed";
  timeZone: string;
  dailyTarget: number;
  runsToday: number;
  dayKey: string | null;
  scheduleCronTaskUid: string | null;
  nextEligibleAt: number | null;
  lastRunAt: number | null;
  lastReflectionId: string | null;
  lastError: string | null;
};

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

async function request(path: string, init?: RequestInit) {
  const current = config();
  if (!current) throw new Error("Supabase NPC memory is not configured.");
  const response = await fetch(`${current.url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: current.key, Authorization: `Bearer ${current.key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`Supabase reflection-schedule request failed (${response.status}).`);
  if (response.status === 204) return null;
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

function mapSchedule(row: Record<string, unknown>): ReflectionScheduleSnapshot {
  const time = (value: unknown) => value ? Date.parse(String(value)) : null;
  return {
    id: String(row.npc_id),
    npcId: String(row.npc_id),
    status: row.status === "paused" || row.status === "failed" ? row.status : "active",
    timeZone: String(row.time_zone ?? "America/New_York"),
    dailyTarget: Math.max(1, Math.min(8, Number(row.daily_target ?? 6))),
    runsToday: Math.max(0, Number(row.runs_today ?? 0)),
    dayKey: row.day_key ? String(row.day_key) : null,
    scheduleCronTaskUid: row.schedule_cron_task_uid ? String(row.schedule_cron_task_uid) : null,
    nextEligibleAt: time(row.next_eligible_at),
    lastRunAt: time(row.last_run_at),
    lastReflectionId: row.last_reflection_id ? String(row.last_reflection_id) : null,
    lastError: row.last_error ? String(row.last_error) : null,
  };
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

async function patchSchedule(npcId: string, patch: Record<string, unknown>, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ npc_id: `eq.${npcId}`, ...extra });
  return request(`npc_reflection_schedules?${params}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }) });
}

export async function getNpcReflectionSchedule(npcId: string) {
  const rows = await request(`npc_reflection_schedules?${new URLSearchParams({ select: "*", npc_id: `eq.${npcId}`, limit: "1" })}`);
  return rows?.[0] ? mapSchedule(rows[0]) : null;
}

export async function getNpcReflectionScheduleByCronTaskUid(taskUid: string) {
  const rows = await request(`npc_reflection_schedules?${new URLSearchParams({ select: "*", schedule_cron_task_uid: `eq.${taskUid}`, limit: "1" })}`);
  return rows?.[0] ? mapSchedule(rows[0]) : null;
}

export async function runNpcReflectionSchedule(taskUid: string, options: { now?: number; random?: () => number; pendingReviewCount?: (npcId: string) => Promise<number>; propose?: (npcId: string, experience: string) => ReturnType<typeof proposeCognitiveReflection> } = {}) {
  const now = options.now ?? Date.now();
  const random = options.random ?? Math.random;
  const schedule = await getNpcReflectionScheduleByCronTaskUid(taskUid);
  if (!schedule || schedule.status !== "active") return { ok: true, skipped: "orphan-or-paused" } as const;

  const timing = evaluateReflectionSchedule(schedule, now);
  if (!timing.run) {
    if (schedule.dayKey !== timing.dayKey) await patchSchedule(schedule.npcId, { day_key: timing.dayKey, runs_today: timing.runsToday });
    return { ok: true, skipped: timing.reason } as const;
  }

  const countPending = options.pendingReviewCount ?? (async (npcId: string) => (await listCognitiveReflections(npcId, 40)).filter((reflection: { status: string }) => reflection.status === "proposed").length);
  if (await countPending(schedule.npcId) >= MAX_PENDING_REVIEW_CARDS) {
    const nextEligibleAt = now + 90 * 60_000;
    await patchSchedule(schedule.npcId, { day_key: timing.dayKey, runs_today: timing.runsToday, next_eligible_at: new Date(nextEligibleAt).toISOString(), last_error: "Review queue is full; the next session was deferred." });
    return { ok: true, skipped: "review-queue-full", nextEligibleAt } as const;
  }

  const nextEligibleAt = nextReflectionEligibleAt(now, schedule.timeZone, random);
  const claimed = await patchSchedule(schedule.npcId, {
    day_key: timing.dayKey,
    runs_today: timing.runsToday + 1,
    next_eligible_at: new Date(nextEligibleAt).toISOString(),
    last_run_at: new Date(now).toISOString(),
    last_error: null,
  }, { status: "eq.active", next_eligible_at: `lte.${new Date(now).toISOString()}` });
  if (!claimed?.[0]) return { ok: true, skipped: "already-claimed" } as const;

  const experience = "Scheduled administrator-approved reflection session. Review only Luna’s current approved cognitive state and identify at most one small, evidence-based refinement candidate for self-model clarity, memory continuity, goal clarity, or reflection. This is a review proposal only: do not claim subjective experience, sentience, consciousness, or unrestricted free will, and do not apply any change.";
  try {
    const propose = options.propose ?? proposeCognitiveReflection;
    const reflection = await propose(schedule.npcId, experience);
    await patchSchedule(schedule.npcId, { last_reflection_id: reflection.id, last_error: null });
    return { ok: true, reflectionId: reflection.id, nextEligibleAt, reviewOnly: true } as const;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await patchSchedule(schedule.npcId, { last_error: message.slice(0, 4_000) });
    return { ok: true, skipped: "reflection-error-recorded", nextEligibleAt } as const;
  }
}
