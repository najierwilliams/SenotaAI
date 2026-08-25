import type { ReactNode } from "react";

import type {
  BrainWorkspacePanelId,
} from "./BrainWorkspace";

interface BrainWorkspacePanelProps {
  id: BrainWorkspacePanelId;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onMinimize: () => void;
  onClose: () => void;
  className?: string;
}

export default function BrainWorkspacePanel({
  title,
  subtitle,
  children,
  onMinimize,
  onClose,
  className = "",
}: BrainWorkspacePanelProps) {
  return (
    <section
      data-brain-workspace
      className={[
        "relative overflow-hidden rounded-xl border border-white/10 bg-black/80 text-white shadow-2xl backdrop-blur-2xl",
        className,
      ].join(" ")}
    >
      <header className="flex h-10 items-center justify-between border-b border-white/10 bg-white/[0.03] px-3">
        <div className="min-w-0">
          <div className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
            {title}
          </div>

          {subtitle && (
            <div className="truncate text-[8px] text-white/25">
              {subtitle}
            </div>
          )}
        </div>

        <div className="ml-2 flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onMinimize}
            className="flex h-6 w-6 items-center justify-center rounded-md text-xs text-white/45 transition hover:bg-white/10 hover:text-white"
            aria-label={`Minimize ${title}`}
            title="Minimize"
          >
            −
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-md text-xs text-white/45 transition hover:bg-red-500/15 hover:text-white"
            aria-label={`Close ${title}`}
            title="Close"
          >
            ×
          </button>
        </div>
      </header>

      <div className="min-h-0 overflow-y-auto">
        {children}
      </div>
    </section>
  );
}