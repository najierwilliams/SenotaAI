import { Badge } from "@/components/ui/badge";
import { CognitiveStatePanel } from "@/components/CognitiveStatePanel";
import { BrainCog, CalendarClock, Database, Eye, EyeOff, HeartHandshake, History, KeyRound, Pencil, Pin, PinOff, RefreshCw, RotateCcw, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";

type CanonRecord = { npcId: string; displayName: string; obsidianPath: string; canonHash: string | null; canonExcerpt: string; isActive: boolean; updatedAt: string };
type MemoryRecord = { id: string; playerId: string; npcId: string; memoryKind: string; summary: string; importance: number; source: string; occurredAt: string; expiresAt: string | null; isActive: boolean; isPinned: boolean };
type RelationshipRecord = { playerId: string; npcId: string; relationshipScore: number; trust: number; affinity: number; familiarity: number; caution: number; recentSummary: string | null; lastInteractionAt: string | null; updatedAt: string };
type AuditRecord = { id: number; action: string; recordType: string; recordId: string; fields: string[] | null; createdAt: number };
type MemoryDateBucket = { day: string; count: number };

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, { credentials: "include", headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "NPC administration request failed.");
  return payload;
}

export async function getNpcAdminStatus() {
  const response = await fetch("/api/npc/admin/status", { credentials: "include" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 401) throw new Error(payload.error || "Unable to check NPC administrator status.");
  return { authenticated: Boolean(payload.authenticated), configured: Boolean(payload.configured) };
}

function queryFilters(npcId: string, playerId: string, extra: Record<string, string> = {}) {
  return new URLSearchParams({ ...(npcId ? { npcId } : {}), ...(playerId ? { playerId } : {}), ...extra }).toString();
}

export default function NpcAdmin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [password, setPassword] = useState("");
  const [canon, setCanon] = useState<CanonRecord[]>([]);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [relationships, setRelationships] = useState<RelationshipRecord[]>([]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [npcFilter, setNpcFilter] = useState("");
  const [playerFilter, setPlayerFilter] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [memoryDateFilter, setMemoryDateFilter] = useState("all");
  const [memoryQuery, setMemoryQuery] = useState("");
  const [memoryDateBuckets, setMemoryDateBuckets] = useState<MemoryDateBucket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const filters = queryFilters(npcFilter, playerFilter);
      const [canonResponse, memoryResponse, relationshipResponse, auditResponse] = await Promise.all([
        request("/api/npc/admin/canon"),
        request(`/api/npc/admin/memories?${queryFilters(npcFilter, playerFilter, { ...(includeInactive ? { includeInactive: "true" } : {}), ...(memoryDateFilter !== "all" ? { date: memoryDateFilter } : {}), ...(memoryQuery.trim() ? { query: memoryQuery.trim() } : {}) })}`),
        request(`/api/npc/admin/relationships?${filters}`),
        request("/api/npc/admin/audit"),
      ]);
      setCanon(canonResponse.canon ?? []);
      setMemories(memoryResponse.memories ?? []);
      setMemoryDateBuckets(memoryResponse.dateBuckets ?? []);
      setRelationships(relationshipResponse.relationships ?? []);
      setAudits(auditResponse.audits ?? []);
      setError(null);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load NPC data."); }
    finally { setBusy(false); }
  };

  useEffect(() => { getNpcAdminStatus().then(status => { setAuthenticated(status.authenticated); setConfigured(status.configured); }).catch(() => setAuthenticated(false)); }, []);
  useEffect(() => { if (authenticated) void load(); }, [authenticated]);

  const signIn = async () => {
    setBusy(true);
    try { await request("/api/npc/admin/session", { method: "POST", body: JSON.stringify({ password }) }); setPassword(""); setAuthenticated(true); setError(null); }
    catch (signInError) { setError(signInError instanceof Error ? signInError.message : "Unable to unlock NPC management."); }
    finally { setBusy(false); }
  };

  const updateCanon = async (id: string, patch: Record<string, unknown>) => {
    try { await request(`/api/npc/admin/canon/${id}`, { method: "PATCH", body: JSON.stringify(patch) }); await load(); }
    catch (updateError) { setError(updateError instanceof Error ? updateError.message : "Unable to update canon."); }
  };
  const updateMemory = async (id: string, patch: Record<string, unknown>) => {
    try { await request(`/api/npc/admin/memories/${id}`, { method: "PATCH", body: JSON.stringify(patch) }); await load(); }
    catch (updateError) { setError(updateError instanceof Error ? updateError.message : "Unable to update memory."); }
  };
  const updateRelationship = async (relationship: RelationshipRecord, patch: Record<string, unknown>) => {
    try { await request(`/api/npc/admin/relationships/${relationship.playerId}/${relationship.npcId}`, { method: "PATCH", body: JSON.stringify(patch) }); await load(); }
    catch (updateError) { setError(updateError instanceof Error ? updateError.message : "Unable to update relationship."); }
  };
  const editText = (label: string, value: string, onSave: (next: string) => void) => {
    const next = window.prompt(label, value);
    if (next !== null && next !== value) onSave(next);
  };
  const editExpiry = (memory: MemoryRecord) => {
    const next = window.prompt("Expiry in ISO format (for example 2026-12-31T23:59:59Z). Leave blank to keep permanently.", memory.expiresAt ?? "");
    if (next === null) return;
    if (next.trim() && Number.isNaN(Date.parse(next.trim()))) { setError("Use a valid ISO expiration date or leave it blank."); return; }
    void updateMemory(memory.id, { expiresAt: next.trim() || null });
  };

  if (!authenticated) return <div className="mx-auto flex min-h-[70vh] max-w-xl items-center"><section className="w-full rounded-[1.5rem] border border-cyan-300/15 bg-card/70 p-7"><div className="grid size-12 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200"><ShieldCheck className="size-6" /></div><p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Secure control plane</p><h1 className="mt-2 font-display text-3xl font-semibold text-white">NPC governance control</h1><p className="mt-3 text-sm leading-6 text-slate-400">Relationships, canon, and player-scoped memory can only be reviewed after administrator verification.</p>{configured ? <div className="mt-6 flex gap-2"><input type="password" value={password} onChange={event => setPassword(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void signIn(); }} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50" placeholder="Administrator password" /><button onClick={() => void signIn()} disabled={!password || busy} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"><KeyRound className="size-4" /> Unlock</button></div> : <p className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100">The administrator password has not been configured yet.</p>}{error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}</section></div>;

  return <div className="mx-auto flex w-full max-w-7xl flex-col gap-5"><section className="senota-hero-grid relative overflow-hidden rounded-[1.75rem] border border-cyan-300/15 bg-card/70 px-6 py-7"><div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300"><Database className="size-4" /> NPC governance plane</div><h1 className="mt-3 font-display text-3xl font-semibold text-white">Canon, relationships, and memory</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Obsidian remains permanent canon. This secured workspace governs bounded runtime lore, player-specific relationship dimensions, and reversible memory review.</p></div><button onClick={() => void load()} disabled={busy} className="inline-flex w-fit items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm text-cyan-100"><RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} /> Refresh</button></div></section>
    {error ? <p className="rounded-xl border border-red-300/20 bg-red-300/5 px-4 py-3 text-sm text-red-200">{error}</p> : null}
    <section className="grid gap-3 sm:grid-cols-3"><Metric label="Runtime NPCs" value={canon.length} tone="cyan" /><Metric label="Relationship profiles" value={relationships.length} tone="violet" /><Metric label="Reviewed memories" value={memories.length} tone="emerald" /></section>
    <section className="grid gap-5 xl:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-card/60 p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-white">NPC canon cache</p><p className="mt-1 text-xs text-slate-500">Bounded runtime excerpts imported from your private Obsidian vault.</p></div><Badge className="border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">{canon.length} NPCs</Badge></div><div className="mt-5 space-y-3">{canon.length ? canon.map(record => <article key={record.npcId} className="rounded-xl border border-white/10 bg-black/10 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-100">{record.displayName}</p><p className="mt-1 truncate text-xs text-cyan-300/80">{record.obsidianPath}</p></div><div className="flex gap-1"><button onClick={() => editText("Edit bounded runtime canon excerpt", record.canonExcerpt, next => void updateCanon(record.npcId, { canonExcerpt: next }))} className="icon-button" title="Edit runtime excerpt"><Pencil className="size-4" /></button><button onClick={() => void updateCanon(record.npcId, { isActive: !record.isActive })} className={`icon-button ${record.isActive ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : ""}`} title={record.isActive ? "Deactivate canon" : "Restore canon"}>{record.isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button></div></div><p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-400">{record.canonExcerpt || "No runtime excerpt has been imported."}</p></article>) : <Empty label="No canon has been synchronized yet." icon={BrainCog} />}</div></div>
      <section className="rounded-2xl border border-white/10 bg-card/60 p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-white">Player–NPC relationships</p><p className="mt-1 text-xs text-slate-500">Each profile is isolated to one player and one NPC.</p></div><HeartHandshake className="size-5 text-violet-200" /></div><div className="mt-5 space-y-3">{relationships.length ? relationships.map(relationship => <RelationshipCard key={`${relationship.playerId}:${relationship.npcId}`} relationship={relationship} onSave={patch => void updateRelationship(relationship, patch)} />) : <Empty label="No relationship profiles match the current filters." icon={HeartHandshake} />}</div></section></section>
    <section className="rounded-2xl border border-white/10 bg-card/60 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-white">Player interaction memory review</p><p className="mt-1 text-xs text-slate-500">Browse by the UTC creation date, search an NPC ID or summary keywords, then keep the existing pin, edit, expiry, deactivate, and restore controls.</p></div><Badge className="border border-violet-300/20 bg-violet-300/10 text-violet-100">{memories.length} matching records</Badge></div><div className="mt-4 grid gap-2 xl:grid-cols-[minmax(150px,0.7fr)_minmax(190px,1fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto_auto]"><select value={memoryDateFilter} onChange={event => setMemoryDateFilter(event.target.value)} className="field" aria-label="Memory creation date"><option value="all">All creation dates</option>{memoryDateBuckets.map(bucket => <option key={bucket.day} value={bucket.day}>{formatMemoryDate(bucket.day)} · {bucket.count}</option>)}</select><input value={memoryQuery} onChange={event => setMemoryQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void load(); }} className="field" placeholder="Search NPC ID or keywords" aria-label="Search memory records" /><input value={npcFilter} onChange={event => setNpcFilter(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void load(); }} className="field" placeholder="Filter by exact NPC ID" /><input value={playerFilter} onChange={event => setPlayerFilter(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void load(); }} className="field" placeholder="Filter by player UUID" /><label className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300"><input type="checkbox" checked={includeInactive} onChange={event => setIncludeInactive(event.target.checked)} /> Include inactive</label><button onClick={() => void load()} className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100">Search</button></div><div className="mt-5 space-y-5">{memories.length ? Object.entries(groupMemoriesByDate(memories)).map(([day, records]) => <section key={day} className="rounded-xl border border-white/10 bg-black/[0.08] p-3 sm:p-4"><div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><CalendarClock className="size-4 text-violet-200" /><h3 className="text-sm font-semibold text-slate-200">{formatMemoryDate(day)}</h3></div><Badge className="border border-white/10 bg-white/5 text-[10px] text-slate-400">{records.length} record{records.length === 1 ? "" : "s"}</Badge></div><div className="grid gap-3 lg:grid-cols-2">{records.map(memory => <MemoryReviewCard key={memory.id} memory={memory} onEdit={() => editText("Edit concise interaction summary", memory.summary, next => void updateMemory(memory.id, { summary: next }))} onPin={() => void updateMemory(memory.id, { isPinned: !memory.isPinned })} onExpiry={() => editExpiry(memory)} onToggleActive={() => void updateMemory(memory.id, { isActive: !memory.isActive })} />)}</div></section>) : <Empty label="No matching player-memory summaries." icon={Users} />}</div></section>
    <CognitiveStatePanel npcs={canon.map(record => ({ npcId: record.npcId, displayName: record.displayName }))} />
    <section className="rounded-2xl border border-white/10 bg-card/60 p-5"><div className="flex items-center gap-2"><History className="size-4 text-cyan-300" /><div><p className="text-sm font-semibold text-white">Administration audit</p><p className="mt-1 text-xs text-slate-500">Metadata-only record of changes; no full player transcripts are stored here.</p></div></div><div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{audits.length ? audits.slice(0, 18).map(audit => <div key={audit.id} className="rounded-xl border border-white/10 bg-black/10 p-3"><p className="text-xs font-medium text-slate-200">{audit.action} · {audit.recordType}</p><p className="mt-1 truncate text-[11px] text-cyan-300/80">{audit.recordId}</p><p className="mt-2 text-[11px] text-slate-500">{Array.isArray(audit.fields) ? audit.fields.join(", ") : "record metadata"} · {new Date(audit.createdAt).toLocaleString()}</p></div>) : <p className="py-3 text-xs text-slate-500">No administration changes have been recorded yet.</p>}</div></section></div>;
}

function groupMemoriesByDate(memories: MemoryRecord[]): Record<string, MemoryRecord[]> {
  return memories.reduce<Record<string, MemoryRecord[]>>((groups, memory) => { const day = memory.occurredAt.slice(0, 10); (groups[day] ??= []).push(memory); return groups; }, {});
}

function formatMemoryDate(day: string) { return new Date(`${day}T12:00:00.000Z`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }); }

function MemoryReviewCard({ memory, onEdit, onPin, onExpiry, onToggleActive }: { memory: MemoryRecord; onEdit: () => void; onPin: () => void; onExpiry: () => void; onToggleActive: () => void }) {
  return <article className={`rounded-xl border p-4 ${memory.isPinned ? "border-amber-300/25 bg-amber-300/[0.045]" : "border-white/10 bg-black/10"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap gap-1.5"><Badge className="border border-white/10 bg-white/5 text-[10px] text-slate-300">{memory.npcId}</Badge><Badge className="border border-cyan-300/15 bg-cyan-300/5 text-[10px] text-cyan-100">{memory.memoryKind}</Badge><Badge className="border border-white/10 bg-white/5 text-[10px] text-slate-400">Importance {memory.importance}</Badge>{memory.isPinned ? <Badge className="border border-amber-300/20 bg-amber-300/10 text-[10px] text-amber-100">Pinned</Badge> : null}</div><p className="mt-2 text-xs leading-5 text-slate-200">{memory.summary}</p><p className="mt-2 text-[10px] text-slate-500">Player {memory.playerId.slice(0, 8)}… · {memory.source}{memory.expiresAt ? ` · Expires ${new Date(memory.expiresAt).toLocaleDateString()}` : " · No expiry"}</p></div><div className="flex shrink-0 gap-1"><button onClick={onEdit} className="icon-button" title="Edit summary"><Pencil className="size-4" /></button><button onClick={onPin} className={`icon-button ${memory.isPinned ? "border-amber-300/25 text-amber-100" : ""}`} title={memory.isPinned ? "Unpin memory" : "Pin memory"}>{memory.isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}</button><button onClick={onExpiry} className="icon-button" title="Set or clear expiration"><CalendarClock className="size-4" /></button><button onClick={onToggleActive} className={`icon-button ${memory.isActive ? "border-emerald-300/20 text-emerald-200" : ""}`} title={memory.isActive ? "Deactivate memory" : "Restore memory"}>{memory.isActive ? <EyeOff className="size-4" /> : <RotateCcw className="size-4" />}</button></div></div></article>;
}

function RelationshipCard({ relationship, onSave }: { relationship: RelationshipRecord; onSave: (patch: Record<string, unknown>) => void }) {
  const [draft, setDraft] = useState({ relationshipScore: relationship.relationshipScore, trust: relationship.trust, affinity: relationship.affinity, familiarity: relationship.familiarity, caution: relationship.caution });
  const changed = Object.entries(draft).some(([key, value]) => value !== relationship[key as keyof typeof draft]);
  return <article className="rounded-xl border border-violet-300/15 bg-black/10 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-100">{relationship.npcId}</p><p className="mt-1 text-[11px] text-slate-500">Player {relationship.playerId.slice(0, 8)}… · Overall {relationship.relationshipScore > 0 ? "+" : ""}{relationship.relationshipScore}</p></div><Badge className="border border-violet-300/20 bg-violet-300/10 text-violet-100">{relationship.relationshipScore >= 40 ? "Trusted" : relationship.relationshipScore <= -40 ? "Strained" : "Developing"}</Badge></div>{relationship.recentSummary ? <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-400">{relationship.recentSummary}</p> : null}<div className="mt-4 space-y-2.5">{([['relationshipScore', 'Overall'], ['trust', 'Trust'], ['affinity', 'Affinity'], ['familiarity', 'Familiarity'], ['caution', 'Caution']] as const).map(([field, label]) => <label key={field} className="grid grid-cols-[78px_1fr_34px] items-center gap-2 text-[11px] text-slate-400"><span>{label}</span><input type="range" min={-100} max={100} value={draft[field]} onChange={event => setDraft(current => ({ ...current, [field]: Number(event.target.value) }))} className="accent-violet-300" /><span className="text-right font-mono text-violet-100">{draft[field]}</span></label>)}</div><button onClick={() => onSave(draft)} disabled={!changed} className="mt-4 w-full rounded-lg border border-violet-300/25 bg-violet-300/10 px-3 py-2 text-xs font-semibold text-violet-100 disabled:opacity-40">Save relationship dimensions</button></article>;
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "cyan" | "violet" | "emerald" }) {
  const colors = { cyan: "border-cyan-300/20 bg-cyan-300/[0.05] text-cyan-100", violet: "border-violet-300/20 bg-violet-300/[0.05] text-violet-100", emerald: "border-emerald-300/20 bg-emerald-300/[0.05] text-emerald-100" };
  return <div className={`rounded-xl border p-4 ${colors[tone]}`}><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-xs opacity-70">{label}</p></div>;
}

function Empty({ label, icon: Icon }: { label: string; icon: typeof BrainCog }) {
  return <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-white/10 px-4 text-center text-xs text-slate-500"><div><Icon className="mx-auto mb-2 size-5 opacity-50" />{label}</div></div>;
}
