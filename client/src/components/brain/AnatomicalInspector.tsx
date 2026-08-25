import { useState } from "react";

import type {
  BrainScale,
  BrainStructure,
} from "./anatomy/BrainStructureRegistry";

import {
  BRAIN_SCALE_OPTIONS,
} from "./anatomy/BrainStructureRegistry";

import {
  isBrainScaleAvailable,
} from "./anatomy/BrainScaleAssetRegistry";

interface AnatomicalInspectorProps {
  structure: BrainStructure | null;
  isIsolated: boolean;
  interiorMode: boolean;
  interiorOpacity: number;
  cutawayDepth: number;
  crossSectionMode: boolean;
  crossSectionDepth: number;
  onToggleCrossSectionMode: () => void;
  onCrossSectionDepthChange: (
    value: number,
  ) => void;
  onToggleInteriorMode: () => void;
  onInteriorOpacityChange: (
    value: number,
  ) => void;
  onCutawayDepthChange: (
    value: number,
  ) => void;
  onToggleIsolation: () => void;
  onFocusStructure: () => void;
  onClear: () => void;
  activeScale: BrainScale;
  onScaleChange: (
    scale: BrainScale,
  ) => void;
}

export default function AnatomicalInspector({
  structure,
  isIsolated,
  interiorMode,
  interiorOpacity,
  cutawayDepth,
  crossSectionMode,
  crossSectionDepth,
  onToggleCrossSectionMode,
  onCrossSectionDepthChange,
  onToggleInteriorMode,
  onInteriorOpacityChange,
  onCutawayDepthChange,
  onToggleIsolation,
  onFocusStructure,
  onClear,
  activeScale,
  onScaleChange,
}: AnatomicalInspectorProps) {
  const [isMinimized, setIsMinimized] =
    useState(false);

  if (!structure) {
    return null;
  }

  const hemisphereLabel =
    structure.hemisphere === "left"
      ? "Left"
      : structure.hemisphere === "right"
        ? "Right"
        : structure.hemisphere === "midline"
          ? "Midline"
          : "Unknown";

  const categoryLabel =
    structure.category
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase(),
      );

  const depthLabel =
    structure.depth
      .replace(
        /^\w/,
        (letter) =>
          letter.toUpperCase(),
      );

  const parentRegionLabel =
    structure.parentRegion
      ? structure.parentRegion
          .replace(/_/g, " ")
          .replace(/\b\w/g, (letter) =>
            letter.toUpperCase(),
          )
      : null;

  return (
    <aside
      className={[
        "absolute right-4 top-4 z-10 w-80 max-w-[calc(100%-2rem)] overflow-hidden rounded-xl border border-white/10 bg-black/75 text-white shadow-2xl backdrop-blur-xl",
        isMinimized
          ? ""
          : "max-h-[calc(100vh-2rem)]",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
            Anatomical Inspector
          </div>

          <h2 className="mt-2 truncate text-xl font-semibold leading-tight">
            {structure.displayName}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() =>
              setIsMinimized(
                (current) => !current,
              )
            }
            className="rounded-md px-2 py-1 text-sm leading-none text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label={
              isMinimized
                ? "Expand anatomical inspector"
                : "Minimize anatomical inspector"
            }
            title={
              isMinimized
                ? "Expand"
                : "Minimize"
            }
          >
            {isMinimized
              ? "□"
              : "−"}
          </button>

          <button
            type="button"
            onClick={onClear}
            className="rounded-md px-2 py-1 text-lg leading-none text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label="Close anatomical inspector"
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="max-h-[calc(100vh-6rem)] overflow-y-auto p-5">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-wider text-white/40">
                  Hemisphere
                </div>

                <div className="mt-1 text-sm">
                  {hemisphereLabel}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-wider text-white/40">
                  Depth
                </div>

                <div className="mt-1 text-sm">
                  {depthLabel}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/40">
                Category
              </div>

              <div className="mt-1 text-sm">
                {categoryLabel}
              </div>
            </div>

            {parentRegionLabel && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-wider text-white/40">
                  Parent region
                </div>

                <div className="mt-1 text-sm">
                  {parentRegionLabel}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/40">
                Model identifier
              </div>

              <div className="mt-1 break-all font-mono text-[11px] leading-relaxed text-white/60">
                {structure.sourceName}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Dataset availability
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1">
              {BRAIN_SCALE_OPTIONS.map(
                (option) => {
                  const available =
                    isBrainScaleAvailable(
                      structure,
                      option.value as BrainScale,
                    );

                  return (
                    <div
                      key={
                        option.value
                      }
                      className="rounded-md border border-white/5 bg-black/10 px-2 py-1.5"
                    >
                      <div className="text-[10px] text-white/60">
                        {option.label}
                      </div>

                      <div className="mt-0.5 text-[9px] text-white/30">
                        {available
                          ? "Available"
                          : "Not connected"}
                      </div>
                    </div>
                  );
                },
              )}
            </div>

            <p className="mt-2 text-[9px] leading-relaxed text-white/30">
              Additional scale datasets can
              be registered without replacing
              the existing macro model.
            </p>
          </div>

          <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Exploration scale
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1">
              {BRAIN_SCALE_OPTIONS.map(
                (option) => (
                  <button
                    key={
                      option.value
                    }
                    type="button"
                    onClick={() =>
                      onScaleChange(
                        option.value,
                      )
                    }
                    className={[
                      "rounded-md px-2 py-1.5 text-[10px] transition",
                      activeScale ===
                      option.value
                        ? "bg-blue-500/20 text-blue-100 ring-1 ring-blue-400/30"
                        : "text-white/45 hover:bg-white/5 hover:text-white/80",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                ),
              )}
            </div>

            <p className="mt-2 text-[9px] leading-relaxed text-white/30">
              Tissue through molecular views are
              scale targets ready for future
              multi-resolution datasets.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onFocusStructure}
              className="rounded-lg border border-blue-400/20 bg-blue-500/15 px-3 py-2 text-xs font-medium text-blue-100 transition hover:bg-blue-500/25"
            >
              Focus structure
            </button>

            <button
              type="button"
              onClick={onToggleIsolation}
              className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15"
            >
              {isIsolated
                ? "Show full brain"
                : "Isolate structure"}
            </button>

            <button
              type="button"
              onClick={onClear}
              className="col-span-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={
                onToggleInteriorMode
              }
              className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15"
            >
              {interiorMode
                ? "Exit interior view"
                : "Interior view"}
            </button>
          </div>

          {interiorMode && (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-white/40">
                  Interior depth
                </div>

                <div className="font-mono text-[10px] text-white/55">
                  {Math.round(
                    interiorOpacity *
                      100,
                  )}
                  %
                </div>
              </div>

              <input
                type="range"
                min="0.03"
                max="0.5"
                step="0.01"
                value={
                  interiorOpacity
                }
                onChange={(event) =>
                  onInteriorOpacityChange(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                className="mt-3 w-full accent-blue-500"
                aria-label="Interior view opacity"
              />

              <div className="mt-1 flex justify-between text-[9px] text-white/30">
                <span>Deeper</span>
                <span>More surface</span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-white/40">
                  Cutaway depth
                </div>

                <div className="font-mono text-[10px] text-white/55">
                  {Math.round(
                    cutawayDepth *
                      100,
                  )}
                  %
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={
                  cutawayDepth
                }
                onChange={(event) =>
                  onCutawayDepthChange(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                className="mt-3 w-full accent-blue-500"
                aria-label="Progressive cutaway depth"
              />

              <div className="mt-1 flex justify-between text-[9px] text-white/30">
                <span>Surface</span>
                <span>Deep</span>
              </div>
            </div>
          )}

          <div className="mt-3">
            <button
              type="button"
              onClick={
                onToggleCrossSectionMode
              }
              className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15"
            >
              {crossSectionMode
                ? "Exit cross-section"
                : "Cross-section view"}
            </button>
          </div>

          {crossSectionMode && (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-white/40">
                  Section depth
                </div>

                <div className="font-mono text-[10px] text-white/55">
                  {Math.round(
                    crossSectionDepth *
                      100,
                  )}
                  %
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={
                  crossSectionDepth
                }
                onChange={(event) =>
                  onCrossSectionDepthChange(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                className="mt-3 w-full accent-blue-500"
                aria-label="Cross-section depth"
              />

              <div className="mt-1 flex justify-between text-[9px] text-white/30">
                <span>Surface</span>
                <span>Deep</span>
              </div>
            </div>
          )}

          <div className="mt-5 border-t border-white/10 pt-4">
            <div className="text-[10px] uppercase tracking-wider text-white/35">
              Luna anatomical system
            </div>

            <p className="mt-2 text-xs leading-relaxed text-white/55">
              This structure is identified
              from the anatomical mesh
              contained in the Luna brain
              model.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}