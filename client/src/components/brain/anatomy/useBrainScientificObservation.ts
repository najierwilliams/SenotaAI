import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  BrainScientificObservation,
} from "@shared/brainScience";

import type {
  BrainScale,
  BrainStructure,
} from "./BrainStructureRegistry";

interface UseBrainScientificObservationOptions {
  scale: BrainScale;
  structure: BrainStructure | null;
}

interface BrainScientificObservationState {
  observation: BrainScientificObservation | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useBrainScientificObservation({
  scale,
  structure,
}: UseBrainScientificObservationOptions): BrainScientificObservationState {
  const [observation, setObservation] =
    useState<BrainScientificObservation | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [retryToken, setRetryToken] =
    useState(0);

  const retry = useCallback(() => {
    setRetryToken((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        scale,
      });

      if (structure?.id) {
        params.set("structureId", structure.id);
      }

      if (structure?.displayName) {
        params.set(
          "structureName",
          structure.displayName,
        );
      }

      if (retryToken) {
        params.set("refresh", "true");
      }

      try {
        const response = await fetch(
          `/api/brain-science/observation?${params.toString()}`,
          {
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(
            `Dataset service returned HTTP ${response.status}`,
          );
        }

        const next =
          (await response.json()) as BrainScientificObservation;

        if (current) {
          setObservation(next);
        }
      } catch (caught) {
        if (
          controller.signal.aborted ||
          !current
        ) {
          return;
        }

        setObservation(null);
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load scientific observation",
        );
      } finally {
        if (current) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      current = false;
      controller.abort();
    };
  }, [
    retryToken,
    scale,
    structure?.id,
    structure?.displayName,
  ]);

  return {
    observation,
    loading,
    error,
    retry,
  };
}
