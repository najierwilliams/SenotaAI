import { cn } from "@/lib/utils";
import React from "react";

const styles: Record<string, string> = {
  queued: "bg-sky-400/10 text-sky-300 ring-sky-400/20",
  planning: "bg-violet-400/10 text-violet-300 ring-violet-400/20",
  running: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
  awaiting_approval: "bg-amber-400/10 text-amber-300 ring-amber-400/20",
  paused: "bg-slate-400/10 text-slate-300 ring-slate-400/20",
  cancelled: "bg-slate-400/10 text-slate-300 ring-slate-400/20",
  completed: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
  failed: "bg-rose-400/10 text-rose-300 ring-rose-400/20",
  requested: "bg-amber-400/10 text-amber-300 ring-amber-400/20",
  approved: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
  rejected: "bg-rose-400/10 text-rose-300 ring-rose-400/20",
  active: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
};

export function AgentStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ring-1", styles[status] ?? "bg-muted text-muted-foreground ring-border", className)}>
      <span className={cn("size-1.5 rounded-full", status === "running" ? "animate-pulse bg-current" : "bg-current/75")} />
      {status.replaceAll("_", " ")}
    </span>
  );
}
