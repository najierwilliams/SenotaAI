import type {
  NanobotMission,
  NanobotMissionResult,
} from "./NanobotTypes";

export type NanobotMissionSequenceStatus =
  | "planned"
  | "active"
  | "completed"
  | "failed"
  | "cancelled";

export type NanobotMissionSequenceStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "blocked"
  | "cancelled";

export interface NanobotMissionSequenceStepInput {
  id: string;
  mission: NanobotMission;
  structureId: string;
  structureName: string;
  dependsOnStepId?: string | null;
}

export interface NanobotMissionSequenceStep
  extends Required<NanobotMissionSequenceStepInput> {
  status: NanobotMissionSequenceStepStatus;
  missionId: string | null;
  result: NanobotMissionResult | null;
  message: string;
}

export interface NanobotMissionSequence {
  id: string;
  label: string;
  createdAt: number;
  updatedAt: number;
  status: NanobotMissionSequenceStatus;
  currentStepId: string | null;
  failureReason: string | null;
  cancellationReason: string | null;
  /** Required to dispatch the first step of this reviewed sequence. */
  confirmationToken: string;
  confirmedAt: number | null;
  steps: NanobotMissionSequenceStep[];
}

export interface NanobotMissionSequenceStart {
  ok: boolean;
  missionId: string | null;
  message: string;
}

/**
 * This executor is deliberately application-level. It has no access to React,
 * Three.js, navigation positions, or mission state transitions. BrainViewer
 * supplies the only permitted way to deploy a resolved step.
 */
export interface NanobotMissionSequenceExecutor {
  startStep: (
    step: NanobotMissionSequenceStep,
  ) => NanobotMissionSequenceStart;
}

export interface CreateNanobotMissionSequenceInput {
  id?: string;
  label: string;
  steps: NanobotMissionSequenceStepInput[];
}

function cloneSequence(
  sequence: NanobotMissionSequence,
): NanobotMissionSequence {
  return structuredClone(sequence);
}

const MAX_RETAINED_TERMINAL_SEQUENCES = 20;

function now(): number {
  return Date.now();
}

function sequenceId(): string {
  return `sequence-${now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function confirmationToken(): string {
  return `sequence-confirm-${now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function requiredStep(
  step: NanobotMissionSequenceStepInput,
): Required<NanobotMissionSequenceStepInput> {
  return {
    ...step,
    dependsOnStepId: step.dependsOnStepId ?? null,
  };
}

export function validateMissionSequenceInput(
  input: CreateNanobotMissionSequenceInput,
): string | null {
  if (!input.label.trim()) {
    return "A mission sequence needs a label.";
  }

  if (!input.steps.length) {
    return "A mission sequence must contain at least one step.";
  }

  const ids = new Set<string>();
  for (let index = 0; index < input.steps.length; index += 1) {
    const step = requiredStep(input.steps[index]);
    if (!step.id.trim() || !step.structureId.trim() || !step.structureName.trim()) {
      return "Every sequence step needs a canonical step ID and target structure.";
    }
    if (ids.has(step.id)) {
      return `Sequence step IDs must be unique: ${step.id}.`;
    }
    if (step.dependsOnStepId && !ids.has(step.dependsOnStepId)) {
      return `Step ${step.id} must depend only on an earlier declared step.`;
    }
    ids.add(step.id);
  }

  return null;
}

/**
 * Coordinates mission-level dependencies only. NanobotMissionEngine remains the
 * authority for all per-agent deployment, navigation, pause, resume, return,
 * failure, verification, and completion transitions.
 */
export class NanobotMissionSequenceRegistry {
  private readonly sequences = new Map<string, NanobotMissionSequence>();

  create(
    input: CreateNanobotMissionSequenceInput,
  ): { sequence: NanobotMissionSequence | null; error: string | null } {
    const error = validateMissionSequenceInput(input);
    if (error) {
      return { sequence: null, error };
    }

    const createdAt = now();
    const sequence: NanobotMissionSequence = {
      id: input.id ?? sequenceId(),
      label: input.label.trim(),
      createdAt,
      updatedAt: createdAt,
      status: "planned",
      currentStepId: null,
      failureReason: null,
      cancellationReason: null,
      confirmationToken: confirmationToken(),
      confirmedAt: null,
      steps: input.steps.map((entry) => {
        const step = requiredStep(entry);
        return {
          ...step,
          status: "pending",
          missionId: null,
          result: null,
          message: "Waiting for sequence execution.",
        };
      }),
    };

    if (this.sequences.has(sequence.id)) {
      return {
        sequence: null,
        error: `A mission sequence already uses ID ${sequence.id}.`,
      };
    }

    this.pruneTerminalSequences();
    this.sequences.set(sequence.id, sequence);
    return { sequence: cloneSequence(sequence), error: null };
  }

  get(id: string): NanobotMissionSequence | null {
    const sequence = this.sequences.get(id);
    return sequence ? cloneSequence(sequence) : null;
  }

  list(): NanobotMissionSequence[] {
    return Array.from(this.sequences.values()).map(cloneSequence);
  }

  cancel(
    id: string,
    reason = "Cancelled before all sequence steps were dispatched.",
  ): NanobotMissionSequence | null {
    const sequence = this.sequences.get(id);
    if (!sequence || ["completed", "failed", "cancelled"].includes(sequence.status)) {
      return null;
    }

    sequence.status = "cancelled";
    sequence.cancellationReason = reason;
    sequence.currentStepId = null;
    sequence.steps.forEach((step) => {
      if (step.status === "pending") {
        step.status = "cancelled";
        step.message = "Cancelled before dispatch.";
      }
    });
    sequence.updatedAt = now();
    return cloneSequence(sequence);
  }

  execute(
    id: string,
    token: string | null | undefined,
    executor: NanobotMissionSequenceExecutor,
  ): NanobotMissionSequence | null {
    const sequence = this.sequences.get(id);
    if (
      !sequence ||
      sequence.status !== "planned" ||
      !token ||
      token !== sequence.confirmationToken
    ) {
      return null;
    }

    sequence.status = "active";
    sequence.confirmedAt = now();
    sequence.updatedAt = now();
    this.startNextEligible(sequence, executor);
    return cloneSequence(sequence);
  }

  /**
   * Called only after BrainViewer has archived the engine result. A failed or
   * cancelled prerequisite blocks all still-pending descendants; it never
   * launches a compensating or downstream mission automatically.
   */
  acceptMissionResult(
    result: NanobotMissionResult,
    executor: NanobotMissionSequenceExecutor,
  ): NanobotMissionSequence | null {
    const sequence = Array.from(this.sequences.values()).find((candidate) =>
      candidate.steps.some((step) => step.missionId === result.missionId),
    );

    if (!sequence || sequence.status !== "active") {
      return sequence ? cloneSequence(sequence) : null;
    }

    const step = sequence.steps.find(
      (candidate) => candidate.missionId === result.missionId,
    );
    if (!step || step.status !== "running") {
      return cloneSequence(sequence);
    }

    step.result = structuredClone(result);
    step.status = result.success ? "completed" : "failed";
    step.message = result.success
      ? "Prerequisite completed and archived."
      : `Prerequisite failed: ${result.summary}`;
    sequence.currentStepId = null;
    sequence.updatedAt = now();

    if (!result.success) {
      this.failPendingSteps(
        sequence,
        `Blocked because prerequisite ${step.id} failed.`,
      );
      sequence.status = "failed";
      sequence.failureReason = step.message;
      return cloneSequence(sequence);
    }

    this.startNextEligible(sequence, executor);
    return cloneSequence(sequence);
  }

  private pruneTerminalSequences(): void {
    const terminal = Array.from(this.sequences.values())
      .filter((sequence) =>
        ["completed", "failed", "cancelled"].includes(sequence.status),
      )
      .sort((left, right) => left.updatedAt - right.updatedAt);

    while (terminal.length >= MAX_RETAINED_TERMINAL_SEQUENCES) {
      const oldest = terminal.shift();
      if (oldest) {
        this.sequences.delete(oldest.id);
      }
    }
  }

  private startNextEligible(
    sequence: NanobotMissionSequence,
    executor: NanobotMissionSequenceExecutor,
  ): void {
    const next = sequence.steps.find((step) => {
      if (step.status !== "pending") return false;
      if (!step.dependsOnStepId) return true;
      return sequence.steps.some(
        (dependency) =>
          dependency.id === step.dependsOnStepId &&
          dependency.status === "completed",
      );
    });

    if (!next) {
      if (sequence.steps.every((step) => step.status === "completed")) {
        sequence.status = "completed";
        sequence.currentStepId = null;
        sequence.updatedAt = now();
      }
      return;
    }

    const started = executor.startStep(
      structuredClone(next),
    );

    if (!started.ok || !started.missionId) {
      next.status = "failed";
      next.message = started.message || "Sequence step could not be dispatched.";
      sequence.status = "failed";
      sequence.currentStepId = null;
      sequence.failureReason = next.message;
      this.failPendingSteps(
        sequence,
        `Blocked because sequence step ${next.id} could not start.`,
      );
      sequence.updatedAt = now();
      return;
    }

    next.status = "running";
    next.missionId = started.missionId;
    next.message = started.message;
    sequence.currentStepId = next.id;
    sequence.updatedAt = now();
  }

  private failPendingSteps(
    sequence: NanobotMissionSequence,
    reason: string,
  ): void {
    sequence.steps.forEach((step) => {
      if (step.status === "pending") {
        step.status = "blocked";
        step.message = reason;
      }
    });
  }
}

export const nanobotMissionSequenceRegistry =
  new NanobotMissionSequenceRegistry();
