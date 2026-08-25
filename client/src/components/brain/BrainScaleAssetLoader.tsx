import {
  useEffect,
} from "react";

import type {
  BrainScale,
  BrainStructure,
} from "./anatomy/BrainStructureRegistry";

import {
  getObservationScaleAsset,
  type BrainScaleAsset,
} from "./anatomy/BrainScaleAssetRegistry";

interface BrainScaleAssetLoaderProps {
  structure: BrainStructure | null;
  activeScale: BrainScale;
  retryToken?: number;
  onAssetStateChange?: (
    state: {
      loading: boolean;
      error: string | null;
      asset: BrainScaleAsset | null;
    },
  ) => void;
}

export default function BrainScaleAssetLoader({
  structure,
  activeScale,
  retryToken = 0,
  onAssetStateChange,
}: BrainScaleAssetLoaderProps) {
  useEffect(() => {
    const asset =
      getObservationScaleAsset(
        structure,
        activeScale,
      );

    onAssetStateChange?.({
      loading: false,
      error: null,
      asset,
    });
  }, [
    structure,
    activeScale,
    retryToken,
    onAssetStateChange,
  ]);

  return null;
}