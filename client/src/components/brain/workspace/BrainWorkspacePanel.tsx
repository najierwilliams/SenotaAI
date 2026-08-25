import type { ReactNode } from "react";

import type {
  BrainWorkspaceContextValue,
  BrainWorkspacePanelId,
} from "./BrainWorkspace";

interface BrainWorkspacePanelProps {
  id: BrainWorkspacePanelId;
  title: string;
  workspace: BrainWorkspaceContextValue;
  children: ReactNode;
  className?: string;
  position?: string;
}

export default function BrainWorkspacePanel({
  id,
  title,
  workspace,
  children,
  className = "",
  position = "",
}: BrainWorkspacePanelProps) {
  if (!workspace.isOpen(id) || workspace.isMinimized(id)) {
    return null;
  }

  const accent =
    id === "nanobots"
      ? "border-red-500/30 ring-red-500/10"
      : "border-white/10 ring-white/10";

  return (
    <section
      className={[
        "pointer-events-auto absolute z-50 flex max-h-[calc(100%-4rem)] min-h-0 w-80 max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-xl border bg-[#05080d]/92 text-white shadow-2xl backdrop-blur-2xl",
        accent,
        position || "right-4 top-16",
        workspace.activePanel === id
          ? "ring-1"
          : "",
        className,
      ].join(" ")}
      aria-label={title}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-[9px] font-medium uppercase tracking-[0.2em] text-white/40">
            Luna Brain
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-white/90">
            {title}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => workspace.minimizePanel(id)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-sm text-white/45 transition hover:bg-white/10 hover:text-white"
            aria-label={`Minimize ${title}`}
            title="Minimize"
          >
            −
          </button>

          <button
            type="button"
            onClick={() => workspace.closePanel(id)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-sm text-white/45 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-white"
            aria-label={`Close ${title}`}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </section>
  );
}