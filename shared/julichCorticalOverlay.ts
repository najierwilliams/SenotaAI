import type {
  JulichCorticalOverlay,
  JulichCorticalOverlayState,
  JulichScientificRegion,
} from "./brainScience";

const MIN_OPACITY = 0.05;
const MAX_OPACITY = 1;

export function isJulichCorticalOverlayRenderable(
  overlay: JulichCorticalOverlay,
): boolean {
  return (
    overlay.surfaceDelivery.status === "READY_PROVIDER_STREAM" &&
    overlay.surfaceDelivery.assetUrl !== null &&
    overlay.surfaceDelivery.surfaceId !== null &&
    overlay.surfaceDelivery.format !== null &&
    overlay.surfaceDelivery.bytes !== null &&
    overlay.rendering.visibilityControl === "ENABLED" &&
    overlay.rendering.opacityControl === "ENABLED" &&
    overlay.licensing.licenseStatus === "CLEARED"
  );
}

export function createJulichCorticalOverlayState(
  overlay: JulichCorticalOverlay,
): JulichCorticalOverlayState {
  return {
    visible: false,
    opacity: Math.min(MAX_OPACITY, Math.max(MIN_OPACITY, overlay.rendering.defaultOpacity)),
    selectedRegion: null,
  };
}

export function setJulichCorticalOverlayVisibility(
  overlay: JulichCorticalOverlay,
  state: JulichCorticalOverlayState,
  visible: boolean,
): JulichCorticalOverlayState {
  return {
    ...state,
    // A blocked asset is never made visible merely because a UI control changed.
    visible: visible && isJulichCorticalOverlayRenderable(overlay),
  };
}

export function setJulichCorticalOverlayOpacity(
  overlay: JulichCorticalOverlay,
  state: JulichCorticalOverlayState,
  opacity: number,
): JulichCorticalOverlayState {
  if (!isJulichCorticalOverlayRenderable(overlay)) return state;
  return {
    ...state,
    opacity: Math.min(MAX_OPACITY, Math.max(MIN_OPACITY, opacity)),
  };
}

export function selectJulichScientificRegion(
  overlay: JulichCorticalOverlay,
  state: JulichCorticalOverlayState,
  region: JulichScientificRegion | null,
): JulichCorticalOverlayState {
  const supported =
    overlay.rendering.selectionCapability === "AVAILABLE" &&
    region !== null &&
    region.scientificTarget.targetKind === "region-probabilistic-target" &&
    region.scientificTarget.coordinate === null &&
    region.scientificTarget.structureUberonId === null &&
    region.scientificTarget.structureFmaId === null;

  return {
    ...state,
    selectedRegion: supported ? region : null,
  };
}
