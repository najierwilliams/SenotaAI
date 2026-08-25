import {
  useEffect,
} from "react";

import type {
  BrainScale,
  BrainStructure,
} from "./anatomy/BrainStructureRegistry";

import {
  getBrainScaleAsset,
  type BrainScaleAsset,
} from "./anatomy/BrainScaleAssetRegistry";

interface BrainScaleAssetLoaderProps {
  structure: BrainStructure | null;
  activeScale: BrainScale;
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
  onAssetStateChange,
}: BrainScaleAssetLoaderProps) {
  useEffect(() => {
    if (!structure) {
      onAssetStateChange?.({
        loading: false,
        error: null,
        asset: null,
      });

      return;
    }

    const asset =
      getBrainScaleAsset(
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
    onAssetStateChange,
  ]);

  return null;
}