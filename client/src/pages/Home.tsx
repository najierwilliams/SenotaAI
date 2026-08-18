import { AgentStatusBadge } from "@/components/AgentStatusBadge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Bot, BrainCircuit, CircleDashed, Github, Rocket, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.agent.dashboard.useQuery();
  const { data: connections } = trpc.agent.connections.useQuery();
  const tasks = data?.tasks ?? [];
  const active = tasks.filter((task) => ["queued", "planning", "running", "awaiting_approval", "paused"].includes(task.status));
  const approvals = tasks.filter((task) => task.status === "awaiting_approval");
  const kpis = [
    { label: "Active runs", value: active.length, icon: CircleDashed, color: "text-cyan-300" },
    { label: "Needs approval", value: approvals.length, icon: ShieldCheck, color: "text-amber-300" },
    { label: "Memory nodes", value: data?.memories.length ?? 0, icon: BrainCircuit, color: "text-violet-300" },
  ];
  return (
    <div className="senota-page space-y-6">
      <section className="senota-hero-grid relative overflow-hidden rounded-[2rem] border border-white/10 bg-card/70 p-7 sm:p-10">
        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div><div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300"><Bot className="size-4" /> SenotaAI / Control plane</div><h1 className="font-display text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl">Move from intention<br /><span className="text-white/40">to shipped code.</span></h1><p className="mt-5 max-w-xl text-sm leading-6 text-slate-400">An autonomous software agent with a working memory, a guarded GitHub hand, and a clear path to deployment.</p></div>
          <Button onClick={() => setLocation("/new")} className="h-12 rounded-xl bg-cyan-300 px-5 font-semibold text-slate-950 hover:bg-cyan-200">Start a task <ArrowRight className="ml-2 size-4" /></Button>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">{kpis.map(({ label, value, icon: Icon, color }) => <div key={label} className="rounded-[1.4rem] border border-white/10 bg-card/60 p-5"><Icon className={`size-5 ${color}`} /><p className="mt-7 text-3xl font-semibold tracking-[-0.04em] text-white">{isLoading ? "—" : value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></div>)}</section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-[1.5rem] border border-white/10 bg-card/70 p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Autonomy queue</p><h2 className="mt-1 text-lg font-semibold text-white">Recent execution runs</h2></div><button onClick={() => setLocation("/history")} className="text-sm text-cyan-300 hover:text-cyan-100">View all</button></div><div className="divide-y divide-white/5">{tasks.length ? tasks.slice(0, 6).map((task) => <button key={task.id} onClick={() => setLocation(`/tasks/${task.id}`)} className="group flex w-full items-center justify-between gap-4 py-4 text-left"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-200 group-hover:text-cyan-100">{task.goal}</p><p className="mt-1 font-mono text-xs text-slate-600">RUN-{String(task.id).padStart(4, "0")} · {task.model}</p></div><div className="flex shrink-0 items-center gap-4"><span className="hidden text-xs text-slate-600 sm:block">{formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</span><AgentStatusBadge status={task.status} /></div></button>) : <div className="rounded-xl border border-dashed border-white/10 p-8 text-center"><p className="text-sm font-medium text-slate-300">No tasks yet.</p><p className="mt-2 text-sm text-slate-600">Give SenotaAI an outcome and it will build the work queue.</p><Button onClick={() => setLocation("/new")} variant="outline" className="mt-5 border-white/10 text-slate-200">Create first task</Button></div>}</div></div>
        <aside className="space-y-4"><div className="rounded-[1.5rem] border border-white/10 bg-card/70 p-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">System links</p><div className="mt-5 space-y-4"><div className="flex items-center gap-3"><div className={`grid size-9 place-items-center rounded-xl ${connections?.ollamaConfigured ? "bg-emerald-300/10 text-emerald-300" : "bg-white/5 text-slate-500"}`}><BrainCircuit className="size-4" /></div><div><p className="text-sm font-medium text-slate-200">Reasoning brain</p><p className="text-xs text-slate-500">{connections?.ollamaConfigured ? "Endpoint online" : "Needs configuration"}</p></div></div><div className="flex items-center gap-3"><div className={`grid size-9 place-items-center rounded-xl ${connections?.githubConfigured ? "bg-emerald-300/10 text-emerald-300" : "bg-white/5 text-slate-500"}`}><Github className="size-4" /></div><div><p className="text-sm font-medium text-slate-200">GitHub workspace</p><p className="text-xs text-slate-500">{connections?.githubConfigured ? "Repository access ready" : "Needs configuration"}</p></div></div><div className="flex items-center gap-3"><div className={`grid size-9 place-items-center rounded-xl ${connections?.vercelConfigured ? "bg-emerald-300/10 text-emerald-300" : "bg-white/5 text-slate-500"}`}><Rocket className="size-4" /></div><div><p className="text-sm font-medium text-slate-200">Vercel deployment</p><p className="text-xs text-slate-500">{connections?.vercelConfigured ? "Deployment actions ready" : "Needs configuration"}</p></div></div></div><Button onClick={() => setLocation("/settings")} variant="outline" className="mt-5 w-full border-white/10 bg-white/[0.02] text-slate-200 hover:bg-white/10">Review connections</Button></div><div className="rounded-[1.5rem] border border-cyan-300/15 bg-cyan-300/[0.04] p-5"><p className="flex items-center gap-2 text-sm font-semibold text-cyan-100"><ShieldCheck className="size-4 text-cyan-300" /> Guarded by design</p><p className="mt-3 text-sm leading-6 text-slate-400">Auto-run can write to an isolated branch. Deletions, credential changes, and production deployment always request an approval.</p></div></aside>
      </section>
    </div>
  );
}
