import BrainViewer from "@/components/brain/BrainViewer";
import { trpc } from "@/lib/trpc";
import { BrainCircuit, CircleAlert, RefreshCw } from "lucide-react";

function StateMetric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-medium text-slate-100">{value}</p></div>;
}

export default function LunaBrain() {
  const home = trpc.knowledge.cognitive.home.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });
  const foundation = home.data?.self.self.foundation;
  const snapshot = home.data?.snapshot;
  const summary = home.data?.summary;
  const openAttention = snapshot?.attention.filter((item) => item.state === "OPEN").length ?? 0;

  return (
    <div className="flex h-full min-h-screen flex-col">
      <div className="border-b px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300"><BrainCircuit className="size-4" /> Luna / Live cognitive inspection</div>
            <h1 className="mt-2 text-2xl font-semibold">{foundation?.name ?? "Luna"} Brain</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">A visual inspection and navigation surface for persisted Luna state. The viewer is not a literal biological activity map and is never the source of truth.</p>
          </div>
          <button onClick={() => void home.refetch()} disabled={home.isFetching} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-cyan-300/10 hover:text-cyan-100 disabled:opacity-50"><RefreshCw className={`size-3.5 ${home.isFetching ? "animate-spin" : ""}`} /> Refresh live state</button>
        </div>
        {home.error ? <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-xs leading-5 text-amber-100"><CircleAlert className="mt-0.5 size-4 shrink-0" />The persisted cognitive state could not be loaded. The scientific viewer remains available, but no live cognitive state is being represented.</div> : null}
        {home.data ? <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5"><StateMetric label="Current age" value={foundation?.currentAge ?? "—"} /><StateMetric label="Native language" value={foundation?.nativeLanguage ?? "—"} /><StateMetric label="Memories" value={snapshot?.memories.length ?? 0} /><StateMetric label="Open attention" value={openAttention} /><StateMetric label="Current work" value={summary?.currentTask ?? summary?.currentObjective ?? "No active work"} /></div> : <p className="mt-4 text-xs text-slate-500">Loading persisted Luna identity, memory, attention, and work state…</p>}
      </div>

      <div className="min-h-0 flex-1 p-4">
        <BrainViewer />
      </div>
    </div>
  );
}
