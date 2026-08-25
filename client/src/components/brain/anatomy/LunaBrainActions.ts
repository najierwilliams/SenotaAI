import {
  BRAIN_SCALE_OPTIONS,
  type BrainScale,
  type BrainStructure,
} from "./BrainStructureRegistry";

import type {
  BrainObservationContext,
} from "./BrainObservationContext";

import {
  nanobotActions,
  type NanobotFleetInspection,
} from "./NanobotActions";

import {
  nanobotMissionSequenceRegistry,
  type CreateNanobotMissionSequenceInput,
  type NanobotMissionSequence,
} from "./NanobotMissionSequence";

import type {
  Nanobot,
  NanobotMissionResult,
  NanobotPosition,
  NanobotType,
} from "./NanobotTypes";

export type LunaAutonomyLevel =
  | "manual"
  | "assisted"
  | "autonomous";

export interface LunaBrainState {
  selectedStructure: BrainStructure | null;
  structures: BrainStructure[];
  observationContext: BrainObservationContext;
  fleet: Nanobot[];
  missionHistory: NanobotMissionResult[];
  autonomy: LunaAutonomyLevel;
  updatedAt: number;
}

export interface LunaStructureResolution {
  query: string;
  structure: BrainStructure | null;
  candidates: BrainStructure[];
  reason: string | null;
}

export interface LunaBrainActionResult<T = null> {
  ok: boolean;
  message: string;
  data: T;
}

/**
 * Bridge implemented by BrainViewer. It intentionally exposes only approved
 * application commands; it never exposes a React setter or Three.js object.
 */
export interface LunaBrainCommandBridge {
  selectStructure: (structure: BrainStructure) => void;
  setObservationScale: (scale: BrainScale) => void;
  resolveMacroPosition: (
    structure: BrainStructure,
  ) => NanobotPosition | null;
  deployMission: (
    type: NanobotType,
    structure: BrainStructure,
  ) => string | null;
  pauseNanobot: (id: string) => boolean;
  resumeNanobot: (id: string) => boolean;
  returnNanobot: (id: string) => boolean;
  pauseFleet: () => void;
  resumeFleet: () => void;
  returnFleet: () => void;
}

type StateListener = (
  state: LunaBrainState | null,
) => void;

let currentState: LunaBrainState | null = null;
let currentBridge: LunaBrainCommandBridge | null = null;
const stateListeners = new Set<StateListener>();

function publishState(): void {
  stateListeners.forEach((listener) =>
    listener(currentState),
  );
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(the|a|an|show|inspect|look at|brain)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStructures(
  structures: BrainStructure[],
): BrainStructure[] {
  return Array.from(
    new Map(
      structures.map((structure) => [
        structure.id,
        structure,
      ]),
    ).values(),
  );
}

function activeState(): LunaBrainState | null {
  return currentState;
}

export const lunaBrainActions = {
  getState(): LunaBrainState | null {
    return activeState();
  },

  getObservationContext(): BrainObservationContext | null {
    return activeState()?.observationContext ?? null;
  },

  getAvailableScales() {
    return BRAIN_SCALE_OPTIONS.map((option) => ({
      ...option,
      active:
        option.value ===
        activeState()?.observationContext.scale,
    }));
  },

  findStructure(query: string): LunaStructureResolution {
    const state = activeState();
    const normalized = normalize(query);

    if (!state) {
      return {
        query,
        structure: null,
        candidates: [],
        reason:
          "Luna Brain is not currently open, so no live anatomy registry is available.",
      };
    }

    if (!normalized) {
      return {
        query,
        structure: null,
        candidates: [],
        reason: "Specify an anatomical structure to inspect.",
      };
    }

    const exact = state.structures.filter((structure) =>
      [
        structure.id,
        structure.sourceName,
        structure.displayName,
      ]
        .map(normalize)
        .includes(normalized),
    );

    if (exact.length === 1) {
      return {
        query,
        structure: exact[0],
        candidates: exact,
        reason: null,
      };
    }

    const queryTokens = normalized.split(" ");
    const candidates = uniqueStructures(
      state.structures.filter((structure) => {
        const haystack = normalize(
          `${structure.id} ${structure.sourceName} ${structure.displayName} ${structure.hemisphere} ${structure.searchText}`,
        );
        return queryTokens.every((token) =>
          haystack.includes(token),
        );
      }),
    );

    if (candidates.length === 1) {
      return {
        query,
        structure: candidates[0],
        candidates,
        reason: null,
      };
    }

    return {
      query,
      structure: null,
      candidates: candidates.slice(0, 5),
      reason: candidates.length
        ? "More than one canonical structure matches. Please specify the hemisphere or a more precise name."
        : "No loaded canonical structure matches that request.",
    };
  },

  selectStructure(
    structureId: string,
  ): LunaBrainActionResult<BrainStructure> {
    const state = activeState();
    const structure = state?.structures.find(
      (candidate) => candidate.id === structureId,
    );

    if (!state || !structure || !currentBridge) {
      return {
        ok: false,
        message:
          "That structure cannot be selected because the live Luna Brain controller is unavailable.",
        data: null as never,
      };
    }

    currentBridge.selectStructure(structure);
    return {
      ok: true,
      message: `Selected ${structure.displayName}.`,
      data: structure,
    };
  },

  inspectStructure(
    structureId: string,
  ): LunaBrainActionResult<BrainStructure> {
    return this.selectStructure(structureId);
  },

  setObservationScale(
    scale: BrainScale,
  ): LunaBrainActionResult<BrainScale> {
    if (!activeState() || !currentBridge) {
      return {
        ok: false,
        message:
          "Luna Brain is not currently open, so the observation scale cannot be changed.",
        data: null as never,
      };
    }

    currentBridge.setObservationScale(scale);
    return {
      ok: true,
      message:
        `Requested ${scale} observation. The live dataset and spatial status will update from the observation context.`,
      data: scale,
    };
  },

  getDatasetStatus(): LunaBrainActionResult<BrainObservationContext> {
    const context = activeState()?.observationContext;

    if (!context) {
      return {
        ok: false,
        message:
          "No live observation context is available while Luna Brain is closed.",
        data: null as never,
      };
    }

    return {
      ok: true,
      message: context.message,
      data: context,
    };
  },

  getSpatialCapability(
    structureId: string,
  ): LunaBrainActionResult<ReturnType<typeof nanobotActions.getTargetCapability>> {
    const context = activeState()?.observationContext;

    if (!context) {
      return {
        ok: false,
        message: "No live observation context is available.",
        data: null as never,
      };
    }

    const capability = nanobotActions.getTargetCapability(
      structureId,
      context,
    );

    return {
      ok: capability.status === "available",
      message: capability.reason,
      data: capability,
    };
  },

  resolveSpatialTarget(
    structureId: string,
  ): LunaBrainActionResult<ReturnType<typeof nanobotActions.resolveTarget>> {
    const state = activeState();
    const structure = state?.structures.find(
      (candidate) => candidate.id === structureId,
    );

    if (!state || !structure) {
      return {
        ok: false,
        message: "No loaded canonical structure matches that target.",
        data: null as never,
      };
    }

    const resolution = nanobotActions.resolveTarget({
      structure,
      observationContext: state.observationContext,
      macroPosition:
        currentBridge?.resolveMacroPosition(structure) ??
        null,
    });

    return {
      ok: resolution.spatialStatus === "resolved",
      message: resolution.message,
      data: resolution,
    };
  },

  getNanobotFleet(): Nanobot[] {
    return nanobotActions.getFleet();
  },

  inspectFleet(): NanobotFleetInspection {
    return nanobotActions.inspectFleet();
  },

  getNanobot(id: string): Nanobot | null {
    return nanobotActions.getFleet().find(
      (nanobot) => nanobot.id === id,
    ) ?? null;
  },

  getMissionHistory(): NanobotMissionResult[] {
    return nanobotActions.getMissionHistory();
  },

  getMissionResult(
    missionId: string,
  ): NanobotMissionResult | null {
    return nanobotActions
      .getMissionHistory()
      .find((result) => result.missionId === missionId) ?? null;
  },

  deployMission(
    type: NanobotType,
    structureId: string,
  ): LunaBrainActionResult<string | null> {
    const state = activeState();
    const structure = state?.structures.find(
      (candidate) => candidate.id === structureId,
    );

    if (!state || !structure || !currentBridge) {
      return {
        ok: false,
        message:
          "The mission cannot execute because the live target/controller is unavailable.",
        data: null,
      };
    }

    const target = this.resolveSpatialTarget(structureId);

    if (
      state.observationContext.scale !== "macro" ||
      !target.ok
    ) {
      return {
        ok: false,
        message:
          target.message ||
          "The requested mission requires a coordinate-resolved Macro target.",
        data: null,
      };
    }

    const nanobotId = currentBridge.deployMission(type, structure);
    return nanobotId
      ? {
          ok: true,
          message:
            `Requested ${type} simulation deployment for ${structure.displayName}.`,
          data: nanobotId,
        }
      : {
          ok: false,
          message:
            `The ${type} mission could not be created for ${structure.displayName}.`,
          data: null,
        };
  },

  pauseNanobot(id: string): LunaBrainActionResult<boolean> {
    if (!currentBridge) {
      return { ok: false, message: "Luna Brain is not open.", data: false };
    }
    const paused = currentBridge.pauseNanobot(id);
    return {
      ok: paused,
      message: paused
        ? `Paused nanobot ${id}; other fleet missions remain unchanged.`
        : `Nanobot ${id} cannot be paused in its current state.`,
      data: paused,
    };
  },

  resumeNanobot(id: string): LunaBrainActionResult<boolean> {
    if (!currentBridge) {
      return { ok: false, message: "Luna Brain is not open.", data: false };
    }
    const resumed = currentBridge.resumeNanobot(id);
    return {
      ok: resumed,
      message: resumed
        ? `Resumed nanobot ${id}; other fleet missions remain unchanged.`
        : `Nanobot ${id} cannot be resumed in its current state.`,
      data: resumed,
    };
  },

  returnNanobot(id: string): LunaBrainActionResult<boolean> {
    if (!currentBridge) {
      return { ok: false, message: "Luna Brain is not open.", data: false };
    }
    const returning = currentBridge.returnNanobot(id);
    return {
      ok: returning,
      message: returning
        ? `Requested physical return for nanobot ${id}; other fleet missions remain unchanged.`
        : `Nanobot ${id} cannot return in its current state.`,
      data: returning,
    };
  },

  planSequence(
    input: CreateNanobotMissionSequenceInput,
  ): LunaBrainActionResult<NanobotMissionSequence> {
    const state = activeState();
    if (!state || !currentBridge) {
      return {
        ok: false,
        message: "Luna Brain is not open, so a live sequence cannot be planned.",
        data: null as never,
      };
    }

    for (const step of input.steps) {
      const structure = state.structures.find(
        (candidate) => candidate.id === step.structureId,
      );
      if (!structure) {
        return {
          ok: false,
          message: `Sequence step ${step.id} does not name a loaded canonical target.`,
          data: null as never,
        };
      }
      const target = this.resolveSpatialTarget(structure.id);
      if (state.observationContext.scale !== "macro" || !target.ok) {
        return {
          ok: false,
          message: `Sequence step ${step.id} cannot be planned: ${target.message}`,
          data: null as never,
        };
      }
    }

    const created = nanobotMissionSequenceRegistry.create(input);
    return created.sequence
      ? {
          ok: true,
          message: `Planned sequence ${created.sequence.label} with ${created.sequence.steps.length} dependency-safe step${created.sequence.steps.length === 1 ? "" : "s"}. Confirmation is required before dispatch.`,
          data: created.sequence,
        }
      : {
          ok: false,
          message: created.error ?? "Sequence plan could not be created.",
          data: null as never,
        };
  },

  inspectSequence(id: string): NanobotMissionSequence | null {
    return nanobotMissionSequenceRegistry.get(id);
  },

  listSequences(): NanobotMissionSequence[] {
    return nanobotMissionSequenceRegistry.list();
  },

  executeSequence(
    id: string,
    confirmationToken: string | null | undefined,
  ): LunaBrainActionResult<NanobotMissionSequence> {
    const sequence = nanobotMissionSequenceRegistry.execute(
      id,
      confirmationToken,
      {
      startStep: (step) => {
        const deployment = this.deployMission(
          step.mission,
          step.structureId,
        );
        return {
          ok: deployment.ok,
          missionId: deployment.data,
          message: deployment.message,
        };
      },
      },
    );
    return sequence
      ? {
          ok: sequence.status === "active" || sequence.status === "completed",
          message: `Sequence ${sequence.label} is ${sequence.status}.`,
          data: sequence,
        }
      : {
          ok: false,
          message: "The sequence is unavailable or is not in a planned state.",
          data: null as never,
        };
  },

  cancelSequence(id: string): LunaBrainActionResult<NanobotMissionSequence> {
    const sequence = nanobotMissionSequenceRegistry.cancel(id);
    return sequence
      ? {
          ok: true,
          message: `Sequence ${sequence.label} was cancelled. Any already-dispatched mission remains under the user's direct return controls.`,
          data: sequence,
        }
      : {
          ok: false,
          message: "The sequence cannot be cancelled in its current state.",
          data: null as never,
        };
  },

  pauseFleet(): LunaBrainActionResult<number> {
    if (!currentBridge) {
      return { ok: false, message: "Luna Brain is not open.", data: 0 };
    }
    currentBridge.pauseFleet();
    return {
      ok: true,
      message: "Requested pause for the active fleet.",
      data: nanobotActions.getFleet().length,
    };
  },

  resumeFleet(): LunaBrainActionResult<number> {
    if (!currentBridge) {
      return { ok: false, message: "Luna Brain is not open.", data: 0 };
    }
    currentBridge.resumeFleet();
    return {
      ok: true,
      message: "Requested resume for the active fleet.",
      data: nanobotActions.getFleet().length,
    };
  },

  returnFleet(): LunaBrainActionResult<number> {
    if (!currentBridge) {
      return { ok: false, message: "Luna Brain is not open.", data: 0 };
    }
    currentBridge.returnFleet();
    return {
      ok: true,
      message: "Requested physical return for the active fleet.",
      data: nanobotActions.getFleet().length,
    };
  },

  cancelFleet(): LunaBrainActionResult<number> {
    const result = this.returnFleet();
    return {
      ...result,
      message: result.ok
        ? "Cancelled pending fleet work by requesting physical return for active agents; archived results are preserved."
        : result.message,
    };
  },
};

export function updateLunaBrainState(
  state: Omit<LunaBrainState, "autonomy" | "updatedAt">,
): void {
  currentState = {
    ...state,
    autonomy: "assisted",
    updatedAt: Date.now(),
  };
  publishState();
}

export function registerLunaBrainCommandBridge(
  bridge: LunaBrainCommandBridge,
): () => void {
  currentBridge = bridge;

  return () => {
    if (currentBridge === bridge) {
      currentBridge = null;
    }
  };
}

export function subscribeToLunaBrainState(
  listener: StateListener,
): () => void {
  stateListeners.add(listener);
  listener(currentState);

  return () => {
    stateListeners.delete(listener);
  };
}
