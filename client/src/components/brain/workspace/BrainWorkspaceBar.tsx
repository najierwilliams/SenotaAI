import {
  useEffect,
  useRef,
} from "react";

import type {
  BrainScale,
  BrainStructure,
} from "../anatomy/BrainStructureRegistry";

import type {
  NanobotType,
} from "../anatomy/NanobotTypes";

import type {
  BrainWorkspacePanelDefinition,
  BrainWorkspaceState,
} from "./BrainWorkspace";

interface BrainWorkspaceBarProps {
  panels: BrainWorkspacePanelDefinition[];
  workspace: BrainWorkspaceState;
  activeScale: BrainScale;
  selectedStructure: BrainStructure | null;
  nanobotCount: number;
  canDeployNanobot: boolean;
  deploymentReason: string;
  onScaleChange: (
    scale: BrainScale,
  ) => void;
  onDeployMission: (
    type: NanobotType,
  ) => void;
  onPauseNanobots: () => void;
  onResumeNanobots: () => void;
  onReturnNanobots: () => void;
  onClearNanobots: () => void;
  onResetView: () => void;
  onToggleCrossSection: () => void;
  onToggleInterior: () => void;
  reviewRemaining: number;
  reviewCompleted: number;
  reviewTotal: number;
  reviewLoading: boolean;
}

const SCALE_OPTIONS: Array<{
  value: BrainScale;
  label: string;
  detail: string;
}> = [
  {
    value: "macro",
    label: "Macro",
    detail: "Whole-brain anatomy",
  },
  {
    value: "tissue",
    label: "Tissue",
    detail: "Tissue architecture",
  },
  {
    value: "cellular",
    label: "Cellular",
    detail: "Cells and organization",
  },
  {
    value: "subcellular",
    label: "Subcellular",
    detail: "Organelles and intracellular detail",
  },
  {
    value: "molecular",
    label: "Molecular",
    detail: "Molecules and pathways",
  },
];

function MenuButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-8 items-center gap-1 rounded-md px-3 text-[10px] transition",
        active
          ? "bg-white/10 text-white"
          : "text-white/55 hover:bg-white/5 hover:text-white",
      ].join(" ")}
    >
      <span>{label}</span>

      <span className="text-[8px] text-white/25">
        ▾
      </span>
    </button>
  );
}

function MenuShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="absolute left-0 top-10 z-[100] w-64 overflow-hidden rounded-lg border border-white/10 bg-[#090d13]/98 p-1 shadow-2xl backdrop-blur-2xl">
      {children}
    </div>
  );
}

function MenuItem({
  label,
  detail,
  onClick,
  disabled = false,
  danger = false,
}: {
  label: string;
  detail?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition",
        danger
          ? "text-red-300/70 hover:bg-red-500/10 hover:text-red-200"
          : "text-white/70 hover:bg-white/10 hover:text-white",
        disabled
          ? "cursor-not-allowed opacity-30"
          : "",
      ].join(" ")}
    >
      <span className="text-[10px]">
        {label}
      </span>

      {detail && (
        <span className="ml-3 text-[8px] text-white/25">
          {detail}
        </span>
      )}
    </button>
  );
}

export default function BrainWorkspaceBar({
  panels,
  workspace,
  activeScale,
  selectedStructure,
  nanobotCount,
  canDeployNanobot,
  deploymentReason,
  onScaleChange,
  onDeployMission,
  onPauseNanobots,
  onResumeNanobots,
  onReturnNanobots,
  onClearNanobots,
  onResetView,
  onToggleCrossSection,
  onToggleInterior,
  reviewRemaining,
  reviewCompleted,
  reviewTotal,
  reviewLoading,
}: BrainWorkspaceBarProps) {
  const barRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown =
      (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          workspace.closeMenu();
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [workspace]);

  const panelById =
    new Map(
      panels.map((panel) => [
        panel.id,
        panel,
      ]),
    );

  return (
    <div
      ref={barRef}
      data-brain-workspace
      className="pointer-events-auto absolute left-0 right-0 top-0 z-[90] h-12 border-b border-white/10 bg-[#070b10]/95 px-3 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
    >
      <div className="flex h-full items-center gap-1">
        <div className="mr-3 flex items-center gap-2 border-r border-white/10 pr-4">
          <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.85)]" />

          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75">
            Luna Brain
          </span>
        </div>

        <button
          type="button"
          onClick={() => workspace.openPanel("review")}
          className="ml-1 flex h-8 items-center gap-1.5 rounded-md border border-red-300/25 bg-red-500/5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-red-100 transition hover:bg-red-500/15"
          aria-label={reviewLoading ? "Scientific Review records loading" : `Scientific Review: ${reviewRemaining} structures require review`}
          title="Open Scientific Review Center"
        >
          <span>Scientific Review</span>
          <span className="rounded border border-red-300/35 bg-red-500/15 px-1.5 py-0.5 text-[9px] text-red-100 shadow-[0_0_10px_rgba(248,113,113,0.4)]">
            {reviewLoading ? "…" : reviewRemaining === 0 ? "Complete" : reviewRemaining}
          </span>
          <span className="sr-only">{reviewLoading ? "Scientific review records loading" : `${reviewCompleted} of ${reviewTotal} reviewed`}</span>
        </button>

        {/* =========================================================
            ANATOMY
        ========================================================= */}

        <div className="relative">
          <MenuButton
            label="Anatomy"
            active={
              workspace.openMenu ===
              "anatomy"
            }
            onClick={() =>
              workspace.toggleWorkspaceMenu(
                "anatomy",
              )
            }
          />

          {workspace.openMenu ===
            "anatomy" && (
            <MenuShell>
              <div className="px-3 py-2">
                <div className="text-[9px] uppercase tracking-[0.18em] text-white/30">
                  Anatomy
                </div>

                <div className="mt-1 text-xs text-white/75">
                  Brain structure navigator
                </div>
              </div>

              <MenuItem
                label={
                  workspace.isOpen("anatomy")
                    ? workspace.isMinimized(
                        "anatomy",
                      )
                      ? "Restore Navigator"
                      : "Navigator Open"
                    : "Open Navigator"
                }
                detail={
                  panelById.get("anatomy")
                    ?.description
                }
                onClick={() => {
                  if (
                    workspace.isOpen(
                      "anatomy",
                    ) &&
                    workspace.isMinimized(
                      "anatomy",
                    )
                  ) {
                    workspace.restorePanel(
                      "anatomy",
                    );
                  } else {
                    workspace.openPanel(
                      "anatomy",
                    );
                  }
                }}
              />

              <MenuItem
                label="Minimize Navigator"
                disabled={
                  !workspace.isOpen(
                    "anatomy",
                  )
                }
                onClick={() =>
                  workspace.minimizePanel(
                    "anatomy",
                  )
                }
              />

              <MenuItem
                label="Close Navigator"
                disabled={
                  !workspace.isOpen(
                    "anatomy",
                  )
                }
                onClick={() =>
                  workspace.closePanel(
                    "anatomy",
                  )
                }
              />
            </MenuShell>
          )}
        </div>

        {/* =========================================================
            INSPECTOR
        ========================================================= */}

        <div className="relative">
          <MenuButton
            label="Inspector"
            active={
              workspace.openMenu ===
              "inspector"
            }
            onClick={() =>
              workspace.toggleWorkspaceMenu(
                "inspector",
              )
            }
          />

          {workspace.openMenu ===
            "inspector" && (
            <MenuShell>
              <div className="px-3 py-2">
                <div className="text-[9px] uppercase tracking-[0.18em] text-white/30">
                  Inspector
                </div>

                <div className="mt-1 text-xs text-white/75">
                  Selected structure controls
                </div>
              </div>

              <MenuItem
                label={
                  workspace.isOpen(
                    "inspector",
                  )
                    ? workspace.isMinimized(
                        "inspector",
                      )
                      ? "Restore Inspector"
                      : "Inspector Open"
                    : "Open Inspector"
                }
                onClick={() => {
                  if (
                    workspace.isOpen(
                      "inspector",
                    ) &&
                    workspace.isMinimized(
                      "inspector",
                    )
                  ) {
                    workspace.restorePanel(
                      "inspector",
                    );
                  } else {
                    workspace.openPanel(
                      "inspector",
                    );
                  }
                }}
              />

              <MenuItem
                label="Minimize Inspector"
                disabled={
                  !workspace.isOpen(
                    "inspector",
                  )
                }
                onClick={() =>
                  workspace.minimizePanel(
                    "inspector",
                  )
                }
              />

              <MenuItem
                label="Close Inspector"
                disabled={
                  !workspace.isOpen(
                    "inspector",
                  )
                }
                onClick={() =>
                  workspace.closePanel(
                    "inspector",
                  )
                }
              />
            </MenuShell>
          )}
        </div>

        {/* =========================================================
            NANOBOTS
        ========================================================= */}

        <div className="relative">
          <MenuButton
            label="Nanobots"
            active={
              workspace.openMenu ===
              "nanobots"
            }
            onClick={() =>
              workspace.toggleWorkspaceMenu(
                "nanobots",
              )
            }
          />

          {workspace.openMenu ===
            "nanobots" && (
            <MenuShell>
              <div className="border-b border-white/10 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.18em] text-red-300/45">
                      Nanobot System
                    </div>

                    <div className="mt-1 text-xs text-white/75">
                      Neural micro-agents
                    </div>
                    <div className="mt-1 max-w-44 text-[9px] leading-relaxed text-red-100/55">
                      {deploymentReason}
                    </div>
                  </div>

                  <span className="rounded-full bg-red-500/10 px-2 py-1 text-[8px] text-red-200">
                    {nanobotCount} units
                  </span>
                </div>
              </div>

              <MenuItem
                label={
                  workspace.isOpen(
                    "nanobots",
                  )
                    ? workspace.isMinimized(
                        "nanobots",
                      )
                      ? "Restore Nanobot System"
                      : "Nanobot System Open"
                    : "Open Nanobot System"
                }
                onClick={() => {
                  if (
                    workspace.isOpen(
                      "nanobots",
                    ) &&
                    workspace.isMinimized(
                      "nanobots",
                    )
                  ) {
                    workspace.restorePanel(
                      "nanobots",
                    );
                  } else {
                    workspace.openPanel(
                      "nanobots",
                    );
                  }
                }}
              />

              <MenuItem
                label="Deploy Scout"
                disabled={!canDeployNanobot}
                onClick={() =>
                  onDeployMission("scout")
                }
              />

              <MenuItem
                label="Deploy Diagnostic"
                disabled={!canDeployNanobot}
                onClick={() =>
                  onDeployMission(
                    "diagnostic",
                  )
                }
              />

              <MenuItem
                label="Deploy Repair"
                disabled={!canDeployNanobot}
                onClick={() =>
                  onDeployMission("repair")
                }
              />

              <MenuItem
                label="Deploy Delivery"
                disabled={!canDeployNanobot}
                onClick={() =>
                  onDeployMission(
                    "delivery",
                  )
                }
              />

              <MenuItem
                label="Deploy Monitor"
                disabled={!canDeployNanobot}
                onClick={() =>
                  onDeployMission("monitor")
                }
              />

              <div className="my-1 border-t border-white/10" />

              <MenuItem
                label="Pause Fleet"
                onClick={() => {
                  onPauseNanobots();
                  workspace.closeMenu();
                }}
              />

              <MenuItem
                label="Resume Fleet"
                onClick={() => {
                  onResumeNanobots();
                  workspace.closeMenu();
                }}
              />

              <MenuItem
                label="Return Fleet"
                onClick={() => {
                  onReturnNanobots();
                  workspace.closeMenu();
                }}
              />

              <MenuItem
                label="Clear Fleet"
                danger
                disabled={
                  nanobotCount === 0
                }
                onClick={() => {
                  onClearNanobots();
                  workspace.closeMenu();
                }}
              />

              <MenuItem
                label="Minimize Nanobot System"
                disabled={
                  !workspace.isOpen(
                    "nanobots",
                  )
                }
                onClick={() =>
                  workspace.minimizePanel(
                    "nanobots",
                  )
                }
              />

              <MenuItem
                label="Close Nanobot System"
                disabled={
                  !workspace.isOpen(
                    "nanobots",
                  )
                }
                onClick={() =>
                  workspace.closePanel(
                    "nanobots",
                  )
                }
              />
            </MenuShell>
          )}
        </div>

        {/* =========================================================
            LUNA
        ========================================================= */}

        <div className="relative">
          <MenuButton
            label="Luna"
            active={
              workspace.openMenu ===
              "luna"
            }
            onClick={() =>
              workspace.toggleWorkspaceMenu(
                "luna",
              )
            }
          />

          {workspace.openMenu ===
            "luna" && (
            <MenuShell>
              <div className="px-3 py-2">
                <div className="text-[9px] uppercase tracking-[0.18em] text-violet-200/60">
                  Luna Assistant
                </div>

                <div className="mt-1 text-xs text-white/75">
                  Assisted brain control
                </div>

                <div className="mt-1 text-[9px] leading-relaxed text-white/40">
                  State-grounded inspection and confirmation-gated Macro simulation plans.
                </div>
              </div>

              <MenuItem
                label={
                  workspace.isOpen("luna")
                    ? workspace.isMinimized("luna")
                      ? "Restore Luna Assistant"
                      : "Luna Assistant Open"
                    : "Open Luna Assistant"
                }
                detail={
                  panelById.get("luna")
                    ?.description
                }
                onClick={() => {
                  if (
                    workspace.isOpen("luna") &&
                    workspace.isMinimized("luna")
                  ) {
                    workspace.restorePanel("luna");
                  } else {
                    workspace.openPanel("luna");
                  }
                }}
              />

              <MenuItem
                label="Minimize Luna Assistant"
                disabled={!workspace.isOpen("luna")}
                onClick={() =>
                  workspace.minimizePanel("luna")
                }
              />

              <MenuItem
                label="Close Luna Assistant"
                disabled={!workspace.isOpen("luna")}
                onClick={() =>
                  workspace.closePanel("luna")
                }
              />
            </MenuShell>
          )}
        </div>

        {/* =========================================================
            SCALES
        ========================================================= */}

        <div className="relative">
          <MenuButton
            label="Scales"
            active={
              workspace.openMenu ===
              "scales"
            }
            onClick={() =>
              workspace.toggleWorkspaceMenu(
                "scales",
              )
            }
          />

          {workspace.openMenu ===
            "scales" && (
            <MenuShell>
              <div className="px-3 py-2">
                <div className="text-[9px] uppercase tracking-[0.18em] text-white/30">
                  Resolution
                </div>

                <div className="mt-1 text-xs text-white/75">
                  Brain observation scale
                </div>
              </div>

              {SCALE_OPTIONS.map(
                (option) => (
                  <MenuItem
                    key={option.value}
                    label={
                      activeScale ===
                      option.value
                        ? `✓ ${option.label}`
                        : option.label
                    }
                    detail={
                      option.detail
                    }
                    onClick={() => {
                      onScaleChange(
                        option.value,
                      );

                      workspace.closeMenu();
                    }}
                  />
                ),
              )}
            </MenuShell>
          )}
        </div>

        {/* =========================================================
            MISSIONS
        ========================================================= */}

        <div className="relative">
          <MenuButton
            label="Missions"
            active={
              workspace.openMenu ===
              "missions"
            }
            onClick={() =>
              workspace.toggleWorkspaceMenu(
                "missions",
              )
            }
          />

          {workspace.openMenu ===
            "missions" && (
            <MenuShell>
              <div className="px-3 py-2">
                <div className="text-[9px] uppercase tracking-[0.18em] text-white/30">
                  Mission Control
                </div>

                <div className="mt-1 text-xs text-white/75">
                  Deploy and manage agents
                </div>
                <div className="mt-1 text-[9px] leading-relaxed text-red-100/55">
                  {deploymentReason}
                </div>
              </div>

              <MenuItem
                label="Scout Mission"
                disabled={!canDeployNanobot}
                onClick={() => {
                  onDeployMission(
                    "scout",
                  );

                  workspace.closeMenu();
                }}
              />

              <MenuItem
                label="Diagnostic Mission"
                disabled={!canDeployNanobot}
                onClick={() => {
                  onDeployMission(
                    "diagnostic",
                  );

                  workspace.closeMenu();
                }}
              />

              <MenuItem
                label="Repair Mission"
                disabled={!canDeployNanobot}
                onClick={() => {
                  onDeployMission(
                    "repair",
                  );

                  workspace.closeMenu();
                }}
              />

              <MenuItem
                label="Delivery Mission"
                disabled={!canDeployNanobot}
                onClick={() => {
                  onDeployMission(
                    "delivery",
                  );

                  workspace.closeMenu();
                }}
              />

              <MenuItem
                label="Monitor Mission"
                disabled={!canDeployNanobot}
                onClick={() => {
                  onDeployMission(
                    "monitor",
                  );

                  workspace.closeMenu();
                }}
              />
            </MenuShell>
          )}
        </div>

        {/* =========================================================
            VIEW
        ========================================================= */}

        <div className="relative">
          <MenuButton
            label="View"
            active={
              workspace.openMenu ===
              "view"
            }
            onClick={() =>
              workspace.toggleWorkspaceMenu(
                "view",
              )
            }
          />

          {workspace.openMenu ===
            "view" && (
            <MenuShell>
              <div className="px-3 py-2">
                <div className="text-[9px] uppercase tracking-[0.18em] text-white/30">
                  Viewport
                </div>

                <div className="mt-1 text-xs text-white/75">
                  Brain visualization controls
                </div>
              </div>

              <MenuItem
                label="Reset Camera"
                onClick={() => {
                  onResetView();
                  workspace.closeMenu();
                }}
              />

              <MenuItem
                label="Toggle Cross-Section"
                onClick={() => {
                  onToggleCrossSection();
                  workspace.closeMenu();
                }}
              />

              <MenuItem
                label="Toggle Interior View"
                disabled={
                  !selectedStructure
                }
                onClick={() => {
                  onToggleInterior();
                  workspace.closeMenu();
                }}
              />
            </MenuShell>
          )}
        </div>

        {/* =========================================================
            STATUS
        ========================================================= */}

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-[8px] uppercase tracking-[0.16em] text-white/20 sm:block">
            {selectedStructure
              ? selectedStructure.displayName
              : "No structure selected"}
          </div>

          <div className="h-4 w-px bg-white/10" />

          <div className="text-[8px] uppercase tracking-[0.16em] text-white/20">
            {activeScale}
          </div>
        </div>
      </div>
    </div>
  );
}