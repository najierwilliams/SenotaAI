export type NpcCanonSource = {
  npcId: string;
  displayName: string;
  obsidianPath: string;
  canonHash?: string;
  canonExcerpt?: string;
};

export type PlayerNpcMemoryInput = {
  playerId: string;
  npcId: string;
  memoryKind: "relationship" | "quest" | "fact" | "summary";
  summary: string;
  importance?: number;
  expiresAt?: string | null;
};

export type PlayerNpcMemory = PlayerNpcMemoryInput & {
  id: string;
  occurredAt: string;
  source: string;
};

export type NpcDialogueContext = {
  npcId: string;
  displayName: string;
  obsidianPath: string;
  canonExcerpt: string;
  playerMemories: PlayerNpcMemory[];
  promptContext: string;
};

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

function assertIdentifier(value: string, label: string) {
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/i.test(value)) throw new Error(`${label} must use a URL-safe identifier.`);
}

function assertUuid(value: string, label: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error(`${label} must be a UUID.`);
}

async function request(path: string, init?: RequestInit) {
  const current = config();
  if (!current) throw new Error("Supabase NPC memory is not configured.");
  const response = await fetch(`${current.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: current.key,
      Authorization: `Bearer ${current.key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`Supabase NPC memory request failed (${response.status}).`);
  return response.status === 204 ? null : response.json();
}

export function isNpcMemoryCloudReady() {
  return Boolean(config());
}

/** Registers a canon reference plus a limited runtime excerpt; it never writes player chats to Obsidian. */
export async function upsertNpcCanonSource(source: NpcCanonSource) {
  assertIdentifier(source.npcId, "NPC ID");
  if (!source.displayName.trim() || !source.obsidianPath.trim()) throw new Error("NPC name and Obsidian path are required.");
  const records = await request("npc_canon_sources?on_conflict=npc_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      npc_id: source.npcId,
      display_name: source.displayName.trim(),
      obsidian_path: source.obsidianPath.trim(),
      canon_hash: source.canonHash ?? null,
      canon_excerpt: source.canonExcerpt?.trim().slice(0, 12_000) ?? "",
      is_active: true,
      updated_at: new Date().toISOString(),
    }),
  });
  return records?.[0] ?? null;
}

async function getNpcCanonSnapshot(npcId: string) {
  assertIdentifier(npcId, "NPC ID");
  const params = new URLSearchParams({
    select: "npc_id,display_name,obsidian_path,canon_excerpt",
    npc_id: `eq.${npcId}`,
    is_active: "eq.true",
    limit: "1",
  });
  const records = await request(`npc_canon_sources?${params.toString()}`);
  const record = records?.[0];
  if (!record) throw new Error("The requested NPC canon is not registered or is inactive.");
  return {
    npcId: String(record.npc_id),
    displayName: String(record.display_name),
    obsidianPath: String(record.obsidian_path),
    canonExcerpt: String(record.canon_excerpt ?? ""),
  };
}

/** Returns only the requested player’s active, non-expired memories for one NPC. */
export async function listPlayerNpcMemories(playerId: string, npcId: string, limit = 12): Promise<PlayerNpcMemory[]> {
  assertUuid(playerId, "Player ID");
  assertIdentifier(npcId, "NPC ID");
  const params = new URLSearchParams({
    select: "id,player_id,npc_id,memory_kind,summary,importance,source,occurred_at,expires_at",
    player_id: `eq.${playerId}`,
    npc_id: `eq.${npcId}`,
    is_active: "eq.true",
    or: `(expires_at.is.null,expires_at.gt.${new Date().toISOString()})`,
    order: "importance.desc,occurred_at.desc",
    limit: String(Math.min(Math.max(limit, 1), 30)),
  });
  const records = await request(`player_npc_memory?${params.toString()}`);
  return (records ?? []).map((record: Record<string, unknown>) => ({
    id: String(record.id),
    playerId: String(record.player_id),
    npcId: String(record.npc_id),
    memoryKind: record.memory_kind as PlayerNpcMemoryInput["memoryKind"],
    summary: String(record.summary),
    importance: Number(record.importance),
    source: String(record.source),
    occurredAt: String(record.occurred_at),
    expiresAt: record.expires_at ? String(record.expires_at) : null,
  }));
}

/** Builds the least-privilege context for one NPC dialogue turn. */
export async function buildNpcDialogueContext(playerId: string, npcId: string): Promise<NpcDialogueContext> {
  const [canon, playerMemories] = await Promise.all([
    getNpcCanonSnapshot(npcId),
    listPlayerNpcMemories(playerId, npcId),
  ]);
  const memoryLines = playerMemories.length
    ? playerMemories.map((memory) => `- [${memory.memoryKind}] ${memory.summary}`).join("\n")
    : "- No prior player-specific memories are available.";
  return {
    ...canon,
    playerMemories,
    promptContext: `NPC canon for ${canon.displayName} (sourced from ${canon.obsidianPath}):\n${canon.canonExcerpt || "No canon excerpt has been synchronized yet."}\n\nCurrent player interaction memory only:\n${memoryLines}`,
  };
}

/** Stores a short, approved interaction summary rather than a complete player transcript. */
export async function rememberPlayerNpcInteraction(input: PlayerNpcMemoryInput) {
  assertUuid(input.playerId, "Player ID");
  assertIdentifier(input.npcId, "NPC ID");
  const summary = input.summary.trim();
  if (summary.length < 4 || summary.length > 2_000) throw new Error("Interaction summaries must contain 4 to 2,000 characters.");
  const records = await request("player_npc_memory", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      player_id: input.playerId,
      npc_id: input.npcId,
      memory_kind: input.memoryKind,
      summary,
      importance: Math.min(Math.max(Math.round(input.importance ?? 3), 1), 5),
      source: "game-dialogue",
      expires_at: input.expiresAt ?? null,
    }),
  });
  return records?.[0] ?? null;
}
