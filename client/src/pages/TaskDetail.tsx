import { AgentStatusBadge } from "@/components/AgentStatusBadge";
import { Button } from "@/components/ui/button";
import { streamAgentTask, type StreamedAgentEvent } from "@/lib/agentStream";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, ArrowLeft, Check, CircleDot, Clock3, FileCode2, Loader2, Pause, Play, ShieldCheck, Square, TerminalSquare } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

function readableDate(value: number | null) { return value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : "Not started"; }

export default function TaskDetail({ taskId }: { taskId: number }) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data, isLoading, refetch } = trpc.agent.tasks.get.useQuery({ taskId }, { refetchInterval: 2_000 });
  const [liveEvents, setLiveEvents] = useState<StreamedAgentEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const startedFor = useRef<number | null>(null);
  const pause = trpc.agent.tasks.pause.useMutation({ onSuccess: () => refetch() });
  const resume = trpc.agent.tasks.resume.useMutation({ onSuccess: () => refetch() });
  const cancel = trpc.agent.tasks.cancel.useMutation({ onSuccess: () => refetch() });
  const decide = trpc.agent.approvals.decide.useMutation({ onSuccess: () => refetch() });

  const refreshAll = useCallback(async () => {
    await Promise.all([refetch(), utils.agent.tasks.list.invalidate(), utils.agent.dashboard.invalidate()]);
  }, [refetch, utils]);

  const run = useCallback(async () => {
    if (isStreaming || startedFor.current === taskId) return;
    startedFor.current = taskId;
    setIsStreaming(true);
    try {
      await streamAgentTask(taskId, (agentEvent) => {
        setLiveEvents((events) => [...events.slice(-39), agentEvent]);
      });
    } catch (error) {
      setLiveEvents((events) => [...events, { type: "error", taskId, message: error instanceof Error ? error.message : String(error), timestamp: Date.now() }]);
    } finally {
      setIsStreaming(false);
      startedFor.current = null;
      await refreshAll();
    }
  }, [isStreaming, refreshAll, taskId]);

  useEffect(() => {
    if (data?.task.status === "queued") void run();
  }, [data?.task.status, run]);

  if (isLoading) return <div className="senota-page grid min-h-[50vh] place-items-center"><Loader2 className="size-6 animate-spin text-cyan-300" /></div>;
  if (!data?.task) return <div className="senota-page"><Button variant="ghost" onClick={() => setLocation("/history")}><ArrowLeft className="mr-2 size-4" /> Back to task history</Button><p className="mt-8 text-slate-400">This task was not found.</p></div>;

  const { task, steps, approvals } = data;
  const pendingApproval = approvals.find((approval) => approval.status === "requested");
  const activity = [...steps.map((step) => ({ key: `step-${step.id}`, title: step.title, detail: step.detail, status: step.status, at: step.createdAt, icon: step.kind.includes("repository") ? FileCode2 : TerminalSquare })), ...liveEvents.map((item, index) => ({ key: `live-${index}`, title: item.step?.title || item.message || "Live agent update", detail: item.step?.detail || item.status || null, status: item.step?.status || item.status || "running", at: item.timestamp || Date.now(), icon: item.type === "error" ? AlertTriangle : CircleDot }))].sort((a, b) => a.at - b.at);

  return (
    <div className="senota-page space-y-6">
      <button onClick={() => setLocation("/history")} className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-200"><ArrowLeft className="size-4" /> Task history</button>
      <section className="rounded-[1.75rem] border border-white/10 bg-card/80 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row"><div><div className="mb-3 flex items-center gap-3"><AgentStatusBadge status={task.status} /><span className="font-mono text-xs text-slate-500">RUN-{String(task.id).padStart(4, "0")}</span></div><h1 className="max-w-3xl font-display text-2xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-3xl">{task.goal}</h1><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500"><span>Model <b className="font-medium text-slate-300">{task.model}</b></span><span>Mode <b className="font-medium text-slate-300">{task.executionMode === "confirm" ? "Confirm first" : "Auto-run"}</b></span><span>Created {readableDate(task.createdAt)}</span></div></div>
          <div className="flex flex-wrap items-start gap-2">{["planning", "running"].includes(task.status) && <Button onClick={() => pause.mutate({ taskId })} variant="outline" className="border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/10"><Pause className="mr-2 size-4" /> Pause</Button>}{["paused", "awaiting_approval"].includes(task.status) && !pendingApproval && <Button onClick={() => resume.mutate({ taskId })} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Play className="mr-2 size-4" /> Continue</Button>}{!["completed", "cancelled", "failed"].includes(task.status) && <Button onClick={() => cancel.mutate({ taskId })} variant="outline" className="border-rose-400/20 bg-rose-400/5 text-rose-200 hover:bg-rose-400/10"><Square className="mr-2 size-3.5 fill-current" /> Cancel</Button>}</div>
        </div>
        {task.errorMessage && <div className="mt-6 rounded-xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-rose-200">{task.errorMessage}</div>}
        {task.finalSummary && <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm leading-6 text-emerald-100"><span className="mr-2 font-semibold text-emerald-300">Outcome</span>{task.finalSummary}</div>}
      </section>

      {pendingApproval && <section className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/[0.06] p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><div className="flex items-center gap-2 text-sm font-semibold text-amber-100"><ShieldCheck className="size-4 text-amber-300" /> Approval required</div><h2 className="mt-2 text-base font-semibold text-white">{pendingApproval.title}</h2><p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-amber-100/70">{pendingApproval.description}</p></div><div className="flex shrink-0 gap-2"><Button onClick={() => decide.mutate({ approvalId: pendingApproval.id, approved: false })} variant="outline" className="border-white/10 text-slate-300">Decline</Button><Button onClick={() => decide.mutate({ approvalId: pendingApproval.id, approved: true })} className="bg-amber-300 text-slate-950 hover:bg-amber-200"><Check className="mr-2 size-4" /> Approve</Button></div></div></section>}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"><div className="rounded-[1.5rem] border border-white/10 bg-card/60 p-5 sm:p-6"><div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Live trace</p><h2 className="mt-1 text-lg font-semibold text-white">Agent activity</h2></div>{isStreaming && <span className="flex items-center gap-2 text-xs text-cyan-200"><span className="size-2 animate-pulse rounded-full bg-cyan-300" /> streaming</span>}</div><div className="space-y-1">{activity.length ? activity.map((item, index) => { const Icon = item.icon; return <div key={item.key} className="group grid grid-cols-[28px_minmax(0,1fr)] gap-3 py-3"><div className="relative flex justify-center"><div className={`mt-1 grid size-6 place-items-center rounded-full ${item.status === "failed" ? "bg-rose-400/15 text-rose-300" : item.status === "completed" ? "bg-emerald-400/10 text-emerald-300" : "bg-cyan-300/10 text-cyan-300"}`}><Icon className="size-3.5" /></div>{index < activity.length - 1 && <div className="absolute top-8 h-[calc(100%-10px)] w-px bg-white/10" />}</div><div className="min-w-0"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-slate-200">{item.title}</p><span className="text-[11px] text-slate-600">{readableDate(item.at)}</span></div>{item.detail && <p className="mt-1 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-slate-500">{item.detail}</p>}</div></div>; }) : <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">The agent trace will appear here when this task begins.</div>}</div></div>
        <aside className="space-y-4"><div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-5"><div className="flex items-center gap-2 text-sm font-semibold text-white"><Clock3 className="size-4 text-violet-300" /> Run state</div><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-500">Phase</dt><dd className="text-right text-slate-200">{task.currentPhase || "Queued"}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Retries</dt><dd className="text-slate-200">{task.retryCount}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Branch</dt><dd className="font-mono text-xs text-cyan-100">senota/task-{task.id}</dd></div></dl></div><div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-5"><p className="text-sm font-semibold text-white">Control note</p><p className="mt-3 text-sm leading-6 text-slate-500">Pausing and cancelling take effect between agent steps, so a connector call is never cut halfway through.</p></div></aside>
      </section>
    </div>
  );
}
