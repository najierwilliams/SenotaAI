import { AgentStatusBadge } from "@/components/AgentStatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowRight, BrainCircuit, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const suggestions = [
  "Audit the repository for TypeScript errors, repair the most important issues, and open a pull request with a preview deployment.",
  "Review the onboarding flow for accessibility gaps, implement focused fixes on a branch, and prepare a pull request.",
  "Inspect the build configuration, identify one reliability improvement, implement it, then report the deployment status.",
];

export default function NewTask() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: settings } = trpc.agent.settings.get.useQuery();
  const { data: connections } = trpc.agent.connections.useQuery();
  const [goal, setGoal] = useState("");
  const [model, setModel] = useState("");
  const [mode, setMode] = useState<"confirm" | "auto">("confirm");
  const createTask = trpc.agent.tasks.create.useMutation({
    onSuccess: async (task) => {
      await utils.agent.tasks.list.invalidate();
      await utils.agent.dashboard.invalidate();
      setLocation(`/tasks/${task.id}`);
    },
  });

  const effectiveModel = model || settings?.defaultModel || "llama3";
  const canCreate = goal.trim().length >= 12 && !createTask.isPending;

  return (
    <div className="senota-page space-y-7">
      <section className="senota-hero-grid relative overflow-hidden rounded-[2rem] border border-white/10 bg-card/70 px-6 py-8 sm:px-10 sm:py-10">
        <div className="relative max-w-3xl">
          <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300"><Sparkles className="size-4" /> New autonomous task</div>
          <h1 className="font-display text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">Give SenotaAI the outcome.<br /><span className="text-white/45">It builds the route.</span></h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-400">Describe what success looks like. The agent will reason, inspect the repository, work inside its own branch, and present approval gates before sensitive actions.</p>
        </div>
      </section>

      {!connections?.ollamaConfigured && (
        <div className="flex gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100">
          <BrainCircuit className="mt-0.5 size-5 shrink-0 text-amber-300" />
          <div><strong className="font-semibold">Reasoning endpoint not connected.</strong> You can draft a task now, but it needs an Ollama-compatible endpoint before execution. Configure it from Settings when you are ready.</div>
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[1.75rem] border border-white/10 bg-card/80 p-5 shadow-2xl shadow-black/20 sm:p-7">
          <label className="text-sm font-semibold text-slate-200" htmlFor="task-goal">Desired outcome</label>
          <Textarea id="task-goal" value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Example: Review the authentication flow, fix the highest-impact issue, and prepare a pull request with a preview deployment." className="mt-3 min-h-52 rounded-2xl border-white/10 bg-black/25 p-5 text-base leading-7 text-white placeholder:text-slate-600 focus-visible:ring-cyan-400/60" />
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => <button key={suggestion} onClick={() => setGoal(suggestion)} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400 transition hover:border-cyan-300/30 hover:bg-cyan-300/5 hover:text-cyan-100">{suggestion.slice(0, 52)}…</button>)}
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Model
              <input value={model} onChange={(event) => setModel(event.target.value)} placeholder={settings?.defaultModel || "llama3"} className="h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm font-medium normal-case tracking-normal text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/50" />
            </label>
            <div className="space-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Execution mode
              <div className="grid h-11 grid-cols-2 rounded-xl border border-white/10 bg-black/25 p-1 text-xs normal-case tracking-normal">
                {(["confirm", "auto"] as const).map((item) => <button key={item} onClick={() => setMode(item)} className={`rounded-lg px-3 font-semibold transition ${mode === item ? "bg-white/10 text-white shadow" : "text-slate-500 hover:text-slate-300"}`}>{item === "confirm" ? "Confirm first" : "Auto-run"}</button>)}
              </div>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
            <div className="flex items-center gap-2 text-sm text-slate-400"><AgentStatusBadge status={mode === "confirm" ? "awaiting_approval" : "running"} /> <span>{mode === "confirm" ? "Every write, PR, or preview waits for you." : "Reversible branch changes may proceed; destructive and production actions still pause."}</span></div>
            <Button onClick={() => createTask.mutate({ goal: goal.trim(), model: effectiveModel, executionMode: mode })} disabled={!canCreate} className="h-11 rounded-xl bg-cyan-300 px-5 font-semibold text-slate-950 hover:bg-cyan-200">Create task <ArrowRight className="ml-2 size-4" /></Button>
          </div>
          {createTask.error && <p className="mt-4 text-sm text-rose-300">{createTask.error.message}</p>}
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><ShieldCheck className="size-4 text-emerald-300" /> Guardrails stay on</div>
            <p className="mt-3 text-sm leading-6 text-slate-400">The agent cannot force-push, change credentials, delete files, or redeploy production without a recorded approval.</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><CheckCircle2 className="size-4 text-cyan-300" /> Current brain</div>
            <p className="mt-3 font-mono text-sm text-cyan-100">{effectiveModel}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Configured through your secure server-side endpoint.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
