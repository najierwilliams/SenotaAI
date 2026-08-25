import type { ReactNode } from "react";

import { useMemo, useState } from "react";

export type BrainWorkspacePanelId =
  | "anatomy"
  | "inspector"
  | "nanobots"
  | "scales"
  | "missions"
  | "view";

export interface BrainWorkspacePanelDefinition {
  id: BrainWorkspacePanelId;
  label: string;
  shortLabel?: string;
}

export interface BrainWorkspaceProps {
  children: ReactNode;
  panels?: BrainWorkspacePanelDefinition[];
}

const DEFAULT_PANELS: BrainWorkspacePanelDefinition[] = [
  { id: "anatomy", label: "Brain Anatomy" },
  { id: "inspector", label: "Inspector" },
  { id: "nanobots", label: "Nanobots" },
  { id: "scales", label: "Scales" },
  { id: "missions", label: "Missions" },
  { id: "view", label: "View" },
];

export interface BrainWorkspaceContextValue {
  openPanels: BrainWorkspacePanelId[];
  activePanel: BrainWorkspacePanelId | null;
  minimizedPanels: BrainWorkspacePanelId[];
  openPanel: (id: BrainWorkspacePanelId) => void;
  closePanel: (id: BrainWorkspacePanelId) => void;
  togglePanel: (id: BrainWorkspacePanelId) => void;
  minimizePanel: (id: BrainWorkspacePanelId) => void;
  restorePanel: (id: BrainWorkspacePanelId) => void;
  isOpen: (id: BrainWorkspacePanelId) => boolean;
  isMinimized: (id: BrainWorkspacePanelId) => boolean;
}

export function useBrainWorkspaceState(
  initialOpen: BrainWorkspacePanelId[] = [
    "anatomy",
    "inspector",
    "nanobots",
  ],
): BrainWorkspaceContextValue {
  const [openPanels, setOpenPanels] =
    useState<BrainWorkspacePanelId[]>(
      initialOpen,
    );

  const [activePanel, setActivePanel] =
    useState<BrainWorkspacePanelId | null>(
      initialOpen[0] ?? null,
    );

  const [minimizedPanels, setMinimizedPanels] =
    useState<BrainWorkspacePanelId[]>([]);

  const openPanel = (id: BrainWorkspacePanelId) => {
    const rightDockPanels: BrainWorkspacePanelId[] = [
      "inspector",
      "nanobots",
    ];

    setOpenPanels((current) => {
      let next = current.includes(id)
        ? current
        : [...current, id];

      if (rightDockPanels.includes(id)) {
        next = next.filter(
          (panelId) =>
            !rightDockPanels.includes(panelId) ||
            panelId === id,
        );
      }

      return next;
    });

    setMinimizedPanels((current) =>
      current.filter((panelId) => panelId !== id),
    );

    setActivePanel(id);
  };

  const closePanel = (id: BrainWorkspacePanelId) => {
    setOpenPanels((current) =>
      current.filter((panelId) => panelId !== id),
    );

    setMinimizedPanels((current) =>
      current.filter((panelId) => panelId !== id),
    );

    setActivePanel((current) =>
      current === id ? null : current,
    );
  };

  const minimizePanel = (id: BrainWorkspacePanelId) => {
    setMinimizedPanels((current) =>
      current.includes(id)
        ? current
        : [...current, id],
    );

    setActivePanel((current) =>
      current === id ? null : current,
    );
  };

  const restorePanel = (id: BrainWorkspacePanelId) => {
    setOpenPanels((current) =>
      current.includes(id)
        ? current
        : [...current, id],
    );

    setMinimizedPanels((current) =>
      current.filter((panelId) => panelId !== id),
    );

    setActivePanel(id);
  };

  const togglePanel = (id: BrainWorkspacePanelId) => {
    if (!openPanels.includes(id)) {
      openPanel(id);
      return;
    }

    if (minimizedPanels.includes(id)) {
      restorePanel(id);
      return;
    }

    setActivePanel((current) =>
      current === id ? null : id,
    );
  };

  const isOpen = (id: BrainWorkspacePanelId) =>
    openPanels.includes(id);

  const isMinimized = (id: BrainWorkspacePanelId) =>
    minimizedPanels.includes(id);

  return useMemo(
    () => ({
      openPanels,
      activePanel,
      minimizedPanels,
      openPanel,
      closePanel,
      togglePanel,
      minimizePanel,
      restorePanel,
      isOpen,
      isMinimized,
    }),
    [
      openPanels,
      activePanel,
      minimizedPanels,
    ],
  );
}

export default function BrainWorkspace({
  children,
}: BrainWorkspaceProps) {
  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      {children}
    </div>
  );
}

export { DEFAULT_PANELS };