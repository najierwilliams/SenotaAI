import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, Code2, History, ShieldCheck } from "lucide-react";
import { useState } from "react";

export default function LunaSelfModification() {
  const history = trpc.knowledge.cognitive.selfModification.history.useQuery(undefined, { retry: false });
  const propose = trpc.knowledge.cognitive.selfModification.propose.useMutation({ onSuccess: () => history.refetch() });
  const [objective, setObjective] = useState("");
  const [reason, setReason] = useState("");

  return <div className="mx-auto max-w-6xl space-y-5">
    <header className="rounded-2xl border border-cyan-300/20 bg-slate-950/50 p-5">
      <div className="flex items-center gap-3"><Code2 className="size-5 text-cyan-300" /><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-cyan-200">Luna Self-Modification</p><h1 className="mt-1 text-xl font-semibold text-slate-100">Bounded candidate workspace</h1></div></div>
      <p className="mt-3 text-sm leading-6 text-slate-400">Luna can retain isolated application-change candidates and their evidence. Production deployment remains blocked until an independently administered safety and deployment authority exists outside the writable application runtime.</p>
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-5 text-amber-100"><AlertTriangle className="mt-0.5 size-4 shrink-0" />The current Vercel/Git runtime does not provide a genuinely external trust boundary. This page never presents a candidate as deployed.</div>
    </header>
    <section className="grid gap-4 lg:grid-cols-[.85fr_1.15fr]">
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-300" /><h2 className="text-sm font-medium text-slate-100">Create objective</h2></div><Input value={objective} onChange={e => setObjective(e.target.value)} placeholder="Small ordinary application improvement" className="mt-3" /><Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Why this bounded change is worthwhile" className="mt-3 min-h-24" /><Button className="mt-3" disabled={objective.trim().length < 12 || !reason.trim() || propose.isPending} onClick={() => propose.mutate({ objective, reason })}>Record candidate objective</Button><p className="mt-3 text-[11px] leading-5 text-slate-500">This records an owner-scoped objective. It does not grant deployment access, modify source, or bypass protected policy.</p></div>
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"><div className="flex items-center gap-2"><History className="size-4 text-violet-300" /><h2 className="text-sm font-medium text-slate-100">Modification history</h2></div>{history.isLoading ? <p className="mt-4 text-xs text-slate-500">Loading persisted history…</p> : history.data?.length ? <div className="mt-3 space-y-3">{history.data.map(run => <article key={run.id} className="rounded-xl border border-white/8 bg-black/15 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium text-slate-200">{run.objective}</span><span className="rounded-full border border-amber-300/20 px-2 py-0.5 text-[10px] text-amber-200">{run.status}</span></div><p className="mt-2 text-[11px] text-slate-500">{run.reason}</p><div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-slate-500"><span>{run.files.length} file snapshot(s)</span><span>{run.tests.length} test record(s)</span><span>Rollback {run.rollbackAvailable ? "available" : "unavailable"}</span><span>Deploy {run.deploymentResult.status ? String(run.deploymentResult.status) : "blocked"}</span></div></article>)}</div> : <p className="mt-4 text-xs text-slate-500">No persisted self-modification objective exists.</p>}</div>
    </section>
    <p className="flex items-center gap-2 text-[11px] text-slate-600"><CheckCircle2 className="size-3.5" />All displayed values come from owner-scoped persisted records; no generated code or hidden reasoning is fabricated.</p>
  </div>;
}
