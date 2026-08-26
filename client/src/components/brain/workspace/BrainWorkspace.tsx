import {
  useEffect,
  useState,
} from "react";

export type BrainWorkspacePanelId =
  | "anatomy"
  | "inspector"
  | "nanobots"
  | "luna"
  | "review"
  | "science";

export interface BrainWorkspacePanelDefinition {
  id: BrainWorkspacePanelId;
  label: string;
  description: string;
}

export const DEFAULT_PANELS: BrainWorkspacePanelDefinition[] = [
  {
    id: "anatomy",
    label: "Brain Anatomy",
    description: "Browse anatomical structures.",
  },
  {
    id: "inspector",
    label: "Inspector",
    description: "Inspect selected anatomy.",
  },
  {
    id: "nanobots",
    label: "Nanobots",
    description: "Control the nanobot fleet.",
  },
  {
    id: "luna",
    label: "Luna",
    description: "Assisted, state-grounded brain control.",
  },
  {
    id: "review",
    label: "Scientific Review",
    description: "Review source-backed anatomical identity evidence.",
  },
  {
    id: "science",
    label: "Scientific Spatial Explorer",
    description: "Query independently entered coordinates in the declared EBRAINS/siibra MNI reference space.",
  },
];

export type BrainWorkspaceMenu =
  | BrainWorkspacePanelId
  | "scales"
  | "missions"
  | "view"
  | null;

export interface BrainWorkspaceState {
  openPanels: Record<BrainWorkspacePanelId, boolean>;
  minimizedPanels: Record<BrainWorkspacePanelId, boolean>;
  openMenu: BrainWorkspaceMenu;

  isOpen: (
    id: BrainWorkspacePanelId,
  ) => boolean;

  isMinimized: (
    id: BrainWorkspacePanelId,
  ) => boolean;

  openPanel: (
    id: BrainWorkspacePanelId,
  ) => void;

  closePanel: (
    id: BrainWorkspacePanelId,
  ) => void;

  minimizePanel: (
    id: BrainWorkspacePanelId,
  ) => void;

  restorePanel: (
    id: BrainWorkspacePanelId,
  ) => void;

  togglePanel: (
    id: BrainWorkspacePanelId,
  ) => void;

  openWorkspaceMenu: (
    menu: Exclude<
      BrainWorkspaceMenu,
      null
    >,
  ) => void;

  closeMenu: () => void;

  toggleWorkspaceMenu: (
    menu: Exclude<
      BrainWorkspaceMenu,
      null
    >,
  ) => void;
}

export function useBrainWorkspaceState(): BrainWorkspaceState {
  const [openPanels, setOpenPanels] =
    useState<
      Record<
        BrainWorkspacePanelId,
        boolean
      >
    >({
      anatomy: true,
      inspector: true,
      nanobots: true,
      luna: false,
      review: false,
      science: false,
    });

  const [
    minimizedPanels,
    setMinimizedPanels,
  ] =
    useState<
      Record<
        BrainWorkspacePanelId,
        boolean
      >
    >({
      anatomy: false,
      inspector: false,
      nanobots: false,
      luna: false,
      review: false,
      science: false,
    });

  const [openMenu, setOpenMenu] =
    useState<BrainWorkspaceMenu>(null);

  /*
   * OPEN
   *
   * Always makes the panel visible.
   * Also clears minimized state.
   */
  const openPanel = (
    id: BrainWorkspacePanelId,
  ) => {
    setOpenPanels((current) => ({
      ...current,
      [id]: true,
    }));

    setMinimizedPanels((current) => ({
      ...current,
      [id]: false,
    }));

    setOpenMenu(null);
  };

  /*
   * RESTORE
   *
   * Explicitly restores a minimized panel.
   */
  const restorePanel = (
    id: BrainWorkspacePanelId,
  ) => {
    setOpenPanels((current) => ({
      ...current,
      [id]: true,
    }));

    setMinimizedPanels((current) => ({
      ...current,
      [id]: false,
    }));

    setOpenMenu(null);
  };

  /*
   * CLOSE
   */
  const closePanel = (
    id: BrainWorkspacePanelId,
  ) => {
    setOpenPanels((current) => ({
      ...current,
      [id]: false,
    }));

    setMinimizedPanels((current) => ({
      ...current,
      [id]: false,
    }));

    setOpenMenu(null);
  };

  /*
   * MINIMIZE
   */
  const minimizePanel = (
    id: BrainWorkspacePanelId,
  ) => {
    setOpenPanels((current) => ({
      ...current,
      [id]: true,
    }));

    setMinimizedPanels((current) => ({
      ...current,
      [id]: true,
    }));

    setOpenMenu(null);
  };

  /*
   * TOGGLE
   */
  const togglePanel = (
    id: BrainWorkspacePanelId,
  ) => {
    setOpenPanels((currentOpen) => {
      const currentlyOpen =
        currentOpen[id];

      setMinimizedPanels(
        (currentMinimized) => {
          if (!currentlyOpen) {
            return {
              ...currentMinimized,
              [id]: false,
            };
          }

          if (currentMinimized[id]) {
            return {
              ...currentMinimized,
              [id]: false,
            };
          }

          return {
            ...currentMinimized,
            [id]: true,
          };
        },
      );

      return {
        ...currentOpen,
        [id]: true,
      };
    });

    setOpenMenu(null);
  };

  const openWorkspaceMenu = (
    menu: Exclude<
      BrainWorkspaceMenu,
      null
    >,
  ) => {
    setOpenMenu(menu);
  };

  const closeMenu = () => {
    setOpenMenu(null);
  };

  const toggleWorkspaceMenu = (
    menu: Exclude<
      BrainWorkspaceMenu,
      null
    >,
  ) => {
    setOpenMenu((current) =>
      current === menu
        ? null
        : menu,
    );
  };

  useEffect(() => {
    const handlePointerDown =
      (event: PointerEvent) => {
        const target =
          event.target;

        if (
          target instanceof Element &&
          target.closest(
            "[data-brain-workspace]",
          )
        ) {
          return;
        }

        setOpenMenu(null);
      };

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );
    };
  }, []);

  return {
    openPanels,
    minimizedPanels,
    openMenu,

    isOpen: (
      id: BrainWorkspacePanelId,
    ) => openPanels[id],

    isMinimized: (
      id: BrainWorkspacePanelId,
    ) => minimizedPanels[id],

    openPanel,
    closePanel,
    minimizePanel,
    restorePanel,
    togglePanel,

    openWorkspaceMenu,
    closeMenu,
    toggleWorkspaceMenu,
  };
}

export default function BrainWorkspace({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-brain-workspace
      className="relative h-full w-full"
    >
      {children}
    </div>
  );
}