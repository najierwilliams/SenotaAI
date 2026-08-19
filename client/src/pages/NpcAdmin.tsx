import { Badge } from "@/components/ui/badge";
import { BrainCog, Database, Eye, EyeOff, History, KeyRound, Pencil, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";

type CanonRecord = { npcId: string; displayName: string; obsidianPath: string; canonHash: string | null; canonExcerpt: string; isActive: boolean; updatedAt: string };
type MemoryRecord = { id: string; playerId: string; npcId: string; memoryKind: string; summary: string; importance: number; source: string; occurredAt: string; expiresAt: string | null; isActive: boolean };
type AuditRecord = { id: number; action: string; recordType: string; recordId: string; fields: string[] | null; createdAt: number };

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, { credentials: "include", headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "NPC administration request failed.");
  return payload;
}

export default function NpcAdmin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [password, setPassword] = useState("");
  const [canon, setCanon] = useState<CanonRecord[]>([]);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [npcFilter, setNpcFilter] = useState("");
  const [playerFilter, setPlayerFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const [canonResponse, memoryResponse, auditResponse] = await Promise.all([
        request("/api/npc/admin/canon"),
        request(`/api/npc/admin/memories?${new URLSearchParams({ ...(npcFilter ? { npcId: npcFilter } : {}), ...(playerFilter ? { playerId: playerFilter } : {}) })}`),
        request("/api/npc/admin/audit"),
      ]);
      setCanon(canonResponse.canon);
      setMemories(memoryResponse.memories);
      setAudits(auditResponse.audits ?? []);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load NPC data.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    request("/api/npc/admin/status").then(status => { setAuthenticated(Boolean(status.authenticated)); setConfigured(Boolean(status.configured)); }).catch(() => setAuthenticated(false));
  }, []);

  useEffect(() => { if (authenticated) void load(); }, [authenticated]);

  const signIn = async () => {
    setBusy(true);
    try {
      await request("/api/npc/admin/session", { method: "POST", body: JSON.stringify({ password }) });
      setPassword("");
      setAuthenticated(true);
      setError(null);
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Unable to unlock NPC management.");
    } finally { setBusy(false); }
  };

  const setActive = async (kind: "canon" | "memories", id: string, isActive: boolean) => {
    try {
      await request(`/api/npc/admin/${kind}/${id}`, { method: "PATCH", body: JSON.stringify({ isActive }) });
      await load();
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : "Unable to update record."); }
  };

  const editText = async (kind: "canon" | "memories", id: string, field: "canonExcerpt" | "summary", value: string) => {
    const next = window.prompt(field === "canonExcerpt" ? "Edit bounded runtime canon excerpt" : "Edit concise interaction summary", value);
    if (next === null || next === value) return;
    try {
      await request(`/api/npc/admin/${kind}/${id}`, { method: "PATCH", body: JSON.stringify({ [field]: next }) });
      await load();
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : "Unable to update record."); }
  };

  if (!authenticated) return <div className="mx-auto flex min-h-[70vh] max-w-xl items-center"><section className="w-full rounded-[1.5rem] border border-cyan-300/15 bg-card/70 p-7"><div className="grid size-12 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200"><ShieldCheck className="size-6" /></div><p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Secure control plane</p><h1 className="mt-2 font-display text-3xl font-semibold text-white">NPC canon and memory management</h1><p className="mt-3 text-sm leading-6 text-slate-400">This area is separate from the public chat workspace. It displays cloud-hosted NPC canon references and player interaction summaries only after administrator verification.</p>{configured ? <div className="mt-6 flex gap-2"><input type="password" value={password} onChange={event => setPassword(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void signIn(); }} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50" placeholder="Administrator password" /><button onClick={() => void signIn()} disabled={!password || busy} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"><KeyRound className="size-4" /> Unlock</button></div> : <p className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100">The administrator password has not been configured yet.</p>}{error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}</section></div>;

  return <div className="mx-auto flex w-full max-w-7xl flex-col gap-5"><section className="senota-hero-grid relative overflow-hidden rounded-[1.75rem] border border-cyan-300/15 bg-card/70 px-6 py-7"><div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300"><Database className="size-4" /> NPC memory control plane</div><h1 className="mt-3 font-display text-3xl font-semibold text-white">Canon and player interaction memory</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Obsidian remains the permanent canon vault. This view manages the protected cloud runtime cache and reversible memory activation states.</p></div><button onClick={() => void load()} disabled={busy} className="inline-flex w-fit items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2.5 text-sm text-cyan-100"><RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} /> Refresh</button></div></section>
    {error ? <p className="rounded-xl border border-red-300/20 bg-red-300/5 px-4 py-3 text-sm text-red-200">{error}</p> : null}
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.4fr)]"><div className="rounded-2xl border border-white/10 bg-card/60 p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-white">NPC canon cache</p><p className="mt-1 text-xs text-slate-500">Imported from your private Obsidian-ready repository.</p></div><Badge className="border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">{canon.length} NPCs</Badge></div><div className="mt-5 space-y-3">{canon.length ? canon.map(record => <article key={record.npcId} className="rounded-xl border border-white/10 bg-black/10 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-100">{record.displayName}</p><p className="mt-1 truncate text-xs text-cyan-300/80">{record.obsidianPath}</p></div><div className="flex gap-1"><button onClick={() => void editText("canon", record.npcId, "canonExcerpt", record.canonExcerpt)} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-cyan-200" title="Edit runtime excerpt"><Pencil className="size-4" /></button><button onClick={() => void setActive("canon", record.npcId, !record.isActive)} className={`rounded-lg border p-2 ${record.isActive ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : "border-white/10 text-slate-500"}`} title={record.isActive ? "Deactivate canon" : "Activate canon"}>{record.isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button></div></div><p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-400">{record.canonExcerpt || "No runtime excerpt has been imported."}</p></article>) : <Empty label="No canon has been synchronized yet." icon={BrainCog} />}</div></div>
      <div className="rounded-2xl border border-white/10 bg-card/60 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-white">Player interaction memory</p><p className="mt-1 text-xs text-slate-500">Only concise, player-scoped summaries are stored here.</p></div><Badge className="border border-violet-300/20 bg-violet-300/10 text-violet-100">{memories.length} records</Badge></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><input value={npcFilter} onChange={event => setNpcFilter(event.target.value)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/50" placeholder="Filter by NPC ID" /><input value={playerFilter} onChange={event => setPlayerFilter(event.target.value)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/50" placeholder="Filter by player UUID" /></div><button onClick={() => void load()} className="mt-2 text-xs text-cyan-300 hover:text-cyan-100">Apply filters</button><div className="mt-4 space-y-2">{memories.length ? memories.map(memory => <article key={memory.id} className="rounded-xl border border-white/10 bg-black/10 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap gap-1.5"><Badge className="border border-white/10 bg-white/5 text-[10px] text-slate-300">{memory.npcId}</Badge><Badge className="border border-cyan-300/15 bg-cyan-300/5 text-[10px] text-cyan-100">{memory.memoryKind}</Badge><Badge className="border border-white/10 bg-white/5 text-[10px] text-slate-400">Importance {memory.importance}</Badge></div><p className="mt-2 text-xs leading-5 text-slate-300">{memory.summary}</p><p className="mt-2 text-[10px] text-slate-500">Player {memory.playerId.slice(0, 8)}… · {memory.source}</p></div><div className="flex gap-1"><button onClick={() => void editText("memories", memory.id, "summary", memory.summary)} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-cyan-200" title="Edit summary"><Pencil className="size-4" /></button><button onClick={() => void setActive("memories", memory.id, !memory.isActive)} className={`rounded-lg border p-2 ${memory.isActive ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : "border-white/10 text-slate-500"}`} title={memory.isActive ? "Deactivate memory" : "Activate memory"}>{memory.isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button></div></div></article>) : <Empty label="No matching player-memory summaries." icon={Users} />}</div></div></section>
    <section className="rounded-2xl border border-white/10 bg-card/60 p-5"><div className="flex items-center gap-2"><History className="size-4 text-cyan-300" /><div><p className="text-sm font-semibold text-white">Administration audit</p><p className="mt-1 text-xs text-slate-500">Metadata-only record of changes; no full player transcripts are stored here.</p></div></div><div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{audits.length ? audits.slice(0, 18).map(audit => <div key={audit.id} className="rounded-xl border border-white/10 bg-black/10 p-3"><p className="text-xs font-medium text-slate-200">{audit.action} · {audit.recordType}</p><p className="mt-1 truncate text-[11px] text-cyan-300/80">{audit.recordId}</p><p className="mt-2 text-[11px] text-slate-500">{Array.isArray(audit.fields) ? audit.fields.join(", ") : "record metadata"} · {new Date(audit.createdAt).toLocaleString()}</p></div>) : <p className="py-3 text-xs text-slate-500">No administration changes have been recorded yet.</p>}</div></section></div>;
}

function Empty({ label, icon: Icon }: { label: string; icon: typeof BrainCog }) {
  return <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-white/10 px-4 text-center text-xs text-slate-500"><div><Icon className="mx-auto mb-2 size-5 opacity-50" />{label}</div></div>;
}
