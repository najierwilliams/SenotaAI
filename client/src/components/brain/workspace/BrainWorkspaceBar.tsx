import { useEffect, useRef, useState } from "react";

import type {
  BrainWorkspaceContextValue,
  BrainWorkspacePanelDefinition,
  BrainWorkspacePanelId,
} from "./BrainWorkspace";

interface BrainWorkspaceBarProps {
  panels: BrainWorkspacePanelDefinition[];
  workspace: BrainWorkspaceContextValue;
}

type MenuId = BrainWorkspacePanelId | null;

const ICONS: Record<string, string> = {
  anatomy: "▧",
  inspector: "▤",
  nanobots: "◉",
  scales: "◌",
  missions: "⌁",
  view: "◈",
};

function menuTitle(id: BrainWorkspacePanelId): string {
  switch (id) {
    case "anatomy": return "Brain Anatomy";
    case "inspector": return "Anatomical Inspector";
    case "nanobots": return "Nanobot System";
    case "scales": return "Brain Scales";
    case "missions": return "Nanobot Missions";
    case "view": return "View Controls";
  }
}

function menuDescription(id: BrainWorkspacePanelId): string {
  switch (id) {
    case "anatomy": return "Browse and select structures.";
    case "inspector": return "Inspect the selected structure.";
    case "nanobots": return "Control the active nanobot fleet.";
    case "scales": return "Switch anatomical resolution.";
    case "missions": return "Manage autonomous missions.";
    case "view": return "Control the brain viewport.";
  }
}

export default function BrainWorkspaceBar({
  panels,
  workspace,
}: BrainWorkspaceBarProps) {
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const barRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!openMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && barRef.current?.contains(target)) return;
      setOpenMenu(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [openMenu]);

  const closeMenu = () => setOpenMenu(null);

  const toggleMenu = (id: BrainWorkspacePanelId) => {
    setOpenMenu((current) => current === id ? null : id);
  };

  const openPanel = (id: BrainWorkspacePanelId) => {
    workspace.openPanel(id);
    closeMenu();
  };

  const restorePanel = (id: BrainWorkspacePanelId) => {
    workspace.restorePanel(id);
    closeMenu();
  };

  const minimizePanel = (id: BrainWorkspacePanelId) => {
    workspace.minimizePanel(id);
    closeMenu();
  };

  const closePanel = (id: BrainWorkspacePanelId) => {
    workspace.closePanel(id);
    closeMenu();
  };

  return (
    <header
      ref={barRef}
      className="pointer-events-auto absolute left-0 right-0 top-0 z-[90] h-14 border-b border-cyan-400/20 bg-[#05080d]/95 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
    >
      <div className="flex h-full min-w-0 items-center px-4">
        <div className="flex shrink-0 items-center gap-3 pr-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-400/10 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.12)]">
            <span className="text-sm">◉</span>
          </div>
          <div className="leading-none">
            <div className="text-[16px] font-semibold tracking-[0.08em] text-white">
              LUNA <span className="text-cyan-300">BRAIN</span>
            </div>
            <div className="mt-1 text-[7px] font-medium uppercase tracking-[0.28em] text-white/30">
              Neural workspace
            </div>
          </div>
        </div>

        <div className="h-7 w-px shrink-0 bg-white/10" />

        <nav className="ml-3 flex min-w-0 items-center gap-1 overflow-visible">
          {panels.map((panel) => {
            const open = workspace.isOpen(panel.id);
            const minimized = workspace.isMinimized(panel.id);
            const menuOpen = openMenu === panel.id;
            const active = workspace.activePanel === panel.id && !minimized;

            return (
              <div key={panel.id} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => toggleMenu(panel.id)}
                  className={[
                    "group flex h-9 items-center gap-2 rounded-lg border px-3 text-[10px] font-medium transition",
                    menuOpen
                      ? panel.id === "nanobots"
                        ? "border-red-500/70 bg-red-500/10 text-white"
                        : "border-cyan-400/35 bg-white/10 text-white"
                      : active && panel.id === "nanobots"
                        ? "border-red-500/50 bg-red-500/10 text-white"
                        : active
                          ? "border-cyan-400/30 bg-white/10 text-white"
                          : "border-transparent text-white/45 hover:border-white/10 hover:bg-white/5 hover:text-white",
                  ].join(" ")}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <span className={panel.id === "nanobots" ? "text-red-400" : "text-cyan-300/70"}>
                    {ICONS[panel.id] ?? "•"}
                  </span>
                  <span>{panel.shortLabel ?? panel.label}</span>
                  {minimized && <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/70" />}
                  <span className={["text-[9px] transition", menuOpen ? "rotate-180 text-white/60" : "text-white/20"].join(" ")}>▾</span>
                </button>

                {menuOpen && (
                  <div
                    className={[
                      "absolute left-0 top-11 z-[120] w-64 overflow-hidden rounded-xl border bg-[#070b11]/98 p-1.5 shadow-2xl backdrop-blur-2xl",
                      panel.id === "nanobots" ? "border-red-500/25" : "border-cyan-400/15",
                    ].join(" ")}
                    role="menu"
                  >
                    <div className="border-b border-white/10 px-3 py-2.5">
                      <div className={[
                        "text-[9px] font-semibold uppercase tracking-[0.18em]",
                        panel.id === "nanobots" ? "text-red-300/70" : "text-cyan-300/60",
                      ].join(" ")}>
                        {menuTitle(panel.id)}
                      </div>
                      <div className="mt-1 text-[10px] text-white/35">
                        {menuDescription(panel.id)}
                      </div>
                    </div>

                    {(panel.id === "anatomy" || panel.id === "inspector" || panel.id === "nanobots") && (
                      <>
                        {!open && (
                          <button type="button" onClick={() => openPanel(panel.id)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[10px] text-white/75 hover:bg-white/10 hover:text-white" role="menuitem">
                            <span>Open panel</span><span className="text-[9px] text-white/25">+</span>
                          </button>
                        )}
                        {open && minimized && (
                          <button type="button" onClick={() => restorePanel(panel.id)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[10px] text-white/75 hover:bg-white/10 hover:text-white" role="menuitem">
                            <span>Restore panel</span><span className="text-[9px] text-cyan-300/50">↗</span>
                          </button>
                        )}
                        {open && !minimized && (
                          <button type="button" onClick={() => minimizePanel(panel.id)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[10px] text-white/65 hover:bg-white/10 hover:text-white" role="menuitem">
                            <span>Minimize panel</span><span className="text-[9px] text-white/25">−</span>
                          </button>
                        )}
                        {open && (
                          <button type="button" onClick={() => closePanel(panel.id)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[10px] text-red-200/65 hover:bg-red-500/10 hover:text-red-100" role="menuitem">
                            <span>Close panel</span><span className="text-[9px] text-red-300/40">×</span>
                          </button>
                        )}
                      </>
                    )}

                    {panel.id === "scales" && (
                      <>
                        <div className="px-3 py-2 text-[8px] uppercase tracking-[0.18em] text-white/25">Resolution</div>
                        {[
                          "Macro",
                          "Tissue",
                          "Cellular",
                          "Subcellular",
                          "Molecular",
                        ].map((scale) => (
                          <button key={scale} type="button" onClick={closeMenu} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[10px] text-white/60 hover:bg-white/10 hover:text-white" role="menuitem">
                            <span>{scale}</span><span className="text-[8px] text-white/20">Ready</span>
                          </button>
                        ))}
                      </>
                    )}

                    {panel.id === "missions" && (
                      <>
                        <button type="button" onClick={() => openPanel("nanobots")} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[10px] text-white/70 hover:bg-white/10 hover:text-white" role="menuitem">
                          <span>Open Nanobot System</span><span className="text-red-300/50">◉</span>
                        </button>
                        <button type="button" onClick={closeMenu} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[10px] text-white/55 hover:bg-white/10 hover:text-white" role="menuitem">
                          <span>Mission queue</span><span className="text-white/20">Ready</span>
                        </button>
                        <button type="button" onClick={closeMenu} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[10px] text-white/55 hover:bg-white/10 hover:text-white" role="menuitem">
                          <span>Fleet telemetry</span><span className="text-white/20">Ready</span>
                        </button>
                      </>
                    )}

                    {panel.id === "view" && (
                      <>
                        <button type="button" onClick={closeMenu} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[10px] text-white/60 hover:bg-white/10 hover:text-white" role="menuitem">
                          <span>Brain viewport</span><span className="text-cyan-300/40">3D</span>
                        </button>
                        <button type="button" onClick={closeMenu} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[10px] text-white/60 hover:bg-white/10 hover:text-white" role="menuitem">
                          <span>Cross-section</span><span className="text-white/20">Ready</span>
                        </button>
                        <button type="button" onClick={closeMenu} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[10px] text-white/60 hover:bg-white/10 hover:text-white" role="menuitem">
                          <span>Camera controls</span><span className="text-white/20">Ready</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 pl-4">
          <button type="button" className="hidden h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/40 hover:bg-white/5 hover:text-white sm:flex" title="Workspace settings">⚙</button>
          <button type="button" className="hidden h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/40 hover:bg-white/5 hover:text-white sm:flex" title="Help">?</button>
          <button type="button" className="h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/40 hover:bg-white/5 hover:text-white" title="Fullscreen">⛶</button>
        </div>
      </div>
    </header>
  );
}