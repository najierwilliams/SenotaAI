export const DEFAULT_TIME_ZONE = "America/New_York";

export function resolveTimeZone(timeZone?: string) {
  const candidate = timeZone?.trim() || DEFAULT_TIME_ZONE;
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: candidate }).resolvedOptions().timeZone;
  } catch {
    throw new Error("timeZone must be a valid IANA time zone such as America/New_York.");
  }
}

/** Fresh per-request context; Eastern automatically switches between EST and EDT. */
export function buildTemporalContext(timeZone?: string, now = new Date()) {
  const zone = resolveTimeZone(timeZone);
  const display = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(now);
  return `Current live date and time: ${display}. Time zone: ${zone}. This time is supplied for this response only; do not claim it is permanent memory.`;
}
