import { addCognitiveObservation } from "./cognitiveState";
import { deriveNaniteBodyContext } from "../luna/developmentalContext";
import type { LunaFoundation } from "@shared/lunaCognitive";

// ============================================================
// Luna Nanite System — event-driven body simulation
//
// Design:
//  - applyNaniteEvent() is called inline from real events (a
//    user message arriving, an LLM call starting/finishing).
//    No separate service, no extra network hop.
//  - Each event nudges a specific cluster of nanites toward
//    higher temperature/stress, with small random jitter.
//  - If a nanite crosses a threshold, a 'body-state' observation
//    is written into the EXISTING npc_cognitive_observations
//    table — reusing Luna's review-gated reflection pipeline
//    rather than building a parallel one.
//  - decayNanites() pulls everything back toward baseline; call
//    it periodically (hooked into the existing hourly scheduled
//    endpoint, see bottom of file for wiring notes).
// ============================================================

const BASELINE_TEMP = 36.8;
const BASELINE_STRESS = 0.0;
const STRESS_OBSERVATION_THRESHOLD = 0.55;
const TEMP_OBSERVATION_THRESHOLD = 38.2;

type NaniteEventType = "user_message" | "llm_call_start" | "llm_call_end";

// Which nanite IDs react to which event, and how much.
// Matches the 12 head nanites seeded in nanite_schema.sql.
const EVENT_TARGETS: Record<NaniteEventType, { nanites: string[]; deltaTemp: number; deltaStress: number; label: string }> = {
  user_message: {
    nanites: ["N-0003", "N-0004"], // ears — auditory sensors
    deltaTemp: 0.15,
    deltaStress: 0.08,
    label: "Registered incoming message.",
  },
  llm_call_start: {
    nanites: ["N-0008", "N-0009"], // frontal cortex — processing load
    deltaTemp: 0.3,
    deltaStress: 0.15,
    label: "Cognitive load increased during reasoning.",
  },
  llm_call_end: {
    nanites: ["N-0008", "N-0009"],
    deltaTemp: -0.1, // partial cooldown once the call resolves
    deltaStress: -0.05,
    label: "Cognitive load easing after response.",
  },
};

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

async function request(path: string, init?: RequestInit) {
  const current = config();
  if (!current) throw new Error("Supabase nanite system is not configured.");
  const response = await fetch(`${current.url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: current.key, Authorization: `Bearer ${current.key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`Supabase nanite request failed (${response.status}).`);
  if (response.status === 204) return null;
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

function jitter(magnitude: number) {
  return (Math.random() - 0.5) * 2 * magnitude;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type NaniteRow = { nanite_id: string; temperature: number; stress: number; observation_count: number };
type NaniteMeta = { id: string; region: string; cluster: string; function: string };

async function getNaniteRows(ids: string[]): Promise<NaniteRow[]> {
  const params = new URLSearchParams({ select: "nanite_id,temperature,stress,observation_count", nanite_id: `in.(${ids.join(",")})` });
  return (await request(`nanite_state?${params}`)) ?? [];
}

async function getNaniteMeta(ids: string[]): Promise<Record<string, NaniteMeta>> {
  const params = new URLSearchParams({ select: "id,region,cluster,function", id: `in.(${ids.join(",")})` });
  const rows: NaniteMeta[] = (await request(`nanites?${params}`)) ?? [];
  return Object.fromEntries(rows.map((r) => [r.id, r]));
}

/**
 * Apply a real event to the relevant cluster of nanites.
 * npcId is threaded through so observations land against the right NPC
 * (currently always "luna001", but kept explicit rather than hardcoded here).
 */
export async function applyNaniteEvent(eventType: NaniteEventType, npcId: string, foundation?: LunaFoundation) {
  const spec = EVENT_TARGETS[eventType];
  if (!spec || !config()) return;
  // The dialogue bridge supplies the freshly retrieved authoritative Foundation. When a
  // lower-level caller has no Foundation context, nanites remain operational but do not invent
  // an age or identity; the next owner-authorized event will reconcile the derived context.
  const bodyContext = foundation ? deriveNaniteBodyContext(foundation) : null;

  const [rows, meta] = await Promise.all([getNaniteRows(spec.nanites), getNaniteMeta(spec.nanites)]);
  const rowById = Object.fromEntries(rows.map((r) => [r.nanite_id, r]));

  for (const naniteId of spec.nanites) {
    const current = rowById[naniteId] ?? { nanite_id: naniteId, temperature: BASELINE_TEMP, stress: BASELINE_STRESS, observation_count: 0 };
    const nextTemp = clamp(current.temperature + spec.deltaTemp + jitter(0.05), 34, 42);
    const nextStress = clamp(current.stress + spec.deltaStress + jitter(0.03), 0, 1);
    const nextCount = current.observation_count + 1;

    await request(`nanite_state?${new URLSearchParams({ nanite_id: `eq.${naniteId}` })}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
        temperature: nextTemp,
        stress: nextStress,
        last_observation: bodyContext ? `${spec.label} ${bodyContext.bodyPersonaContext}` : spec.label,
        observation_count: nextCount,
        updated_at: new Date().toISOString(),
      }),
    });

    const crossedStress = nextStress >= STRESS_OBSERVATION_THRESHOLD && current.stress < STRESS_OBSERVATION_THRESHOLD;
    const crossedTemp = nextTemp >= TEMP_OBSERVATION_THRESHOLD && current.temperature < TEMP_OBSERVATION_THRESHOLD;
    if (crossedStress || crossedTemp) {
      const info = meta[naniteId];
      await addCognitiveObservation(
        npcId,
        {
          observationKind: "body-state" as never, // widened by the v2 migration's check constraint
          content: `Nanite ${naniteId} (${info?.function ?? "unknown function"}, ${info?.region ?? "unknown region"}) reported ${crossedStress ? `elevated stress (${nextStress.toFixed(2)})` : `elevated temperature (${nextTemp.toFixed(1)}°C)`} following: ${spec.label}`,
          salience: crossedStress && crossedTemp ? 4 : 3,
          entities: [info?.region ?? naniteId],
          metadata: { source: "nanite", naniteId, cluster: info?.cluster, eventType, developmentalContext: bodyContext },
          source: "nanite-system",
        },
        "nanite-system",
      );
    }
  }
}

/** Pull all nanites back toward baseline. Call periodically (e.g. once/hour). */
export async function decayNanites(rate = 0.3) {
  const rows: NaniteRow[] = (await request(`nanite_state?select=nanite_id,temperature,stress`)) ?? [];
  await Promise.all(
    rows.map((row) => {
      const nextTemp = row.temperature + (BASELINE_TEMP - row.temperature) * rate;
      const nextStress = row.stress + (BASELINE_STRESS - row.stress) * rate;
      return request(`nanite_state?${new URLSearchParams({ nanite_id: `eq.${row.nanite_id}` })}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ temperature: nextTemp, stress: nextStress, updated_at: new Date().toISOString() }),
      });
    }),
  );
}
