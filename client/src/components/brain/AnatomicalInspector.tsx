import {
  useEffect,
  useState,
} from "react";

import type {
  BrainScale,
  BrainStructure,
} from "./anatomy/BrainStructureRegistry";

import {
  BRAIN_SCALE_OPTIONS,
} from "./anatomy/BrainStructureRegistry";

import type {
  BrainObservationContext,
} from "./anatomy/BrainObservationContext";

import type {
  Nanobot,
} from "./anatomy/NanobotTypes";

import {
  getDatasetStatusLabel,
} from "@shared/brainScience";

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
  observationContext: BrainObservationContext;
  onReturnToMacro: () => void;
  activeNanobots: Nanobot[];
  onSelectNanobot: (id: string) => void;
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
  observationContext,
  onReturnToMacro,
  activeNanobots,
  onSelectNanobot,
}: AnatomicalInspectorProps) {
  const [structureEvidence, setStructureEvidence] = useState<{
    lunaStructure: { id: string; sourceName: string; meshBacked: boolean };
    canonicalIdentity: { ontology: string; id: string; hraEntityId: string | null; hraEntityLabel: string | null; status: string; evidence?: string; provenance?: string; version?: string; reviewStatus?: string } | null;
    scientificFeatures: { julich: string };
    julichObservation?: { status: string; evidenceTier: string };
    evidenceTier: string;
    scientificTarget: { status: string; coordinate: null; limitation: string | null };
  } | null>(null);

  useEffect(() => {
    if (!structure?.id) { setStructureEvidence(null); return; }
    const controller = new AbortController();
    void fetch(`/api/brain-science/structure/${encodeURIComponent(structure.id)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (!controller.signal.aborted) setStructureEvidence(payload); })
      .catch(() => { if (!controller.signal.aborted) setStructureEvidence(null); });
    return () => controller.abort();
  }, [structure?.id]);

  if (!structure) {
    return (
      <aside className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-black/75 text-white shadow-2xl backdrop-blur-xl">
        <div className="border-b border-white/10 p-5 pr-20">
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
            Anatomical Inspector
          </div>

          <h2 className="mt-2 text-xl font-semibold leading-tight">
            No structure selected
          </h2>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 p-5">
          <p className="text-sm leading-relaxed text-white/55">
            Select an anatomical structure from the navigator or directly in the brain viewer to inspect it here.
          </p>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/60">
            <div className="text-[9px] uppercase tracking-[0.16em] text-white/35">
              Observation
            </div>
            <div className="mt-1 text-white/85">
              {observationContext.scaleLabel}
            </div>
            <div className="mt-1 text-[10px] text-white/40">
              {observationContext.message}
            </div>
          </div>
        </div>
      </aside>
    );
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
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-black/75 text-white shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="border-b border-white/10 p-5 pr-20">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
            Anatomical Inspector
          </div>

          <h2 className="mt-2 truncate text-xl font-semibold leading-tight">
            {structure.displayName}
          </h2>
          <div className="mt-1 text-[10px] text-white/40">
            {observationContext.scaleLabel} observation
          </div>
        </div>

      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="space-y-3">
            <div className="rounded-lg border border-blue-400/15 bg-blue-500/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] uppercase tracking-wider text-blue-100/55">
                  Observation dataset
                </div>
                <div className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-white/55">
                  {observationContext.scaleLabel}
                </div>
              </div>
              <div className="mt-2 text-xs text-white/80">
                {observationContext.datasetLabel ?? "Dataset not connected"}
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-white/45">
                {observationContext.message}
              </p>
              {observationContext.scientificStatus && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-white/50">
                  <div>
                    <span className="block text-white/30">Status</span>
                    {getDatasetStatusLabel(observationContext.scientificStatus)}
                  </div>
                  {observationContext.provenance && (
                    <div>
                      <span className="block text-white/30">Provider</span>
                      {observationContext.provenance.provider}
                    </div>
                  )}
                </div>
              )}
              {observationContext.referenceSpace && (
                <div className="mt-3 text-[10px] leading-relaxed text-white/45">
                  <span className="text-white/30">Reference space: </span>
                  {observationContext.referenceSpace.label}
                </div>
              )}
              {observationContext.hraSpatialRegistration && observationContext.scale === "macro" && (
                <div className="mt-2 rounded-md border border-emerald-300/10 bg-emerald-300/5 p-2.5 text-[10px] leading-relaxed text-white/50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="uppercase tracking-wider text-white/35">HRA spatial reference</span>
                    <span className={observationContext.hraSpatialRegistration.status === "established" ? "text-emerald-300" : "text-amber-200"}>
                      {observationContext.hraSpatialRegistration.status === "established" ? "Established" : "Revalidation required"}
                    </span>
                  </div>
                  <p className="mt-1 text-white/55">
                    {observationContext.hraSpatialRegistration.asset.label} · HRA Brain-Female / HRA CCF body placement.
                  </p>
                  <p className="mt-1 text-white/40">
                    Source asset checksum is pinned; landmark validation is {observationContext.hraSpatialRegistration.validation.validationStatus}. Viewer presentation coordinates remain visual only.
                  </p>
                  <p className="mt-1 text-amber-100/60">
                    MNI status: {observationContext.hraSpatialRegistration.mni.status}.
                  </p>
                </div>
              )}
              {observationContext.registration && (
                <div className="mt-2 rounded-md border border-amber-300/10 bg-amber-300/5 p-2.5 text-[10px] leading-relaxed text-white/50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="uppercase tracking-wider text-white/35">MNI registration</span>
                    <span className={observationContext.registration.status === "validated" ? "text-emerald-300" : "text-amber-200"}>
                      {observationContext.registration.status === "validated" ? "Validated" : "Unavailable"}
                    </span>
                  </div>
                  <p className="mt-1 text-white/55">
                    {observationContext.registration.sourceAsset.label}; not a documented MNI frame.
                  </p>
                  <p className="mt-1 text-white/40">
                    {observationContext.registration.validation.summary}
                  </p>
                </div>
              )}
              {structureEvidence && (
                <div className="mt-2 rounded-md border border-cyan-300/10 bg-cyan-300/5 p-2.5 text-[10px] leading-relaxed text-white/50">
                  <div className="uppercase tracking-wider text-white/35">Anatomical identity</div>
                  {structureEvidence.canonicalIdentity ? <p className="mt-1 text-cyan-100/75">Canonical: {structureEvidence.canonicalIdentity.ontology} {structureEvidence.canonicalIdentity.id} · {structureEvidence.canonicalIdentity.hraEntityLabel ?? "HRA evidence-backed structure"}</p> : <p className="mt-1 text-white/45">Canonical identity: Unmapped — no identifier inferred from the mesh name.</p>}
                  <p className="mt-1 text-white/40">Evidence tier: {structureEvidence.evidenceTier.replace(/-/g, " ")} · {structureEvidence.canonicalIdentity?.reviewStatus ?? "not applicable"}.</p>
                  {structureEvidence.canonicalIdentity?.reviewStatus === "evidence-backed-requires-review" && (
                    <div className="mt-2 rounded border border-red-300/35 bg-red-500/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-red-100 shadow-[0_0_12px_rgba(248,113,113,0.35)]">
                      <div>Review required · Human anatomical identity review only</div>
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent("luna-open-scientific-review", { detail: { structureId: structureEvidence.lunaStructure.id } }))}
                        className="mt-1 text-[9px] normal-case tracking-normal text-red-100 underline decoration-red-200/50 underline-offset-2 hover:text-white"
                      >
                        Review This Structure
                      </button>
                    </div>
                  )}
                  {structureEvidence.canonicalIdentity && (
                    <div className="mt-2 space-y-1 border-t border-white/8 pt-2 text-white/40">
                      <p>GLB node/path: {structureEvidence.lunaStructure.sourceName}</p>
                      <p>HRA entity: {structureEvidence.canonicalIdentity.hraEntityId ?? "not supplied"}</p>
                      <p>HRA version: {structureEvidence.canonicalIdentity.version ?? "not supplied"}</p>
                      <p>Evidence: {structureEvidence.canonicalIdentity.evidence ?? "source-backed identity"}</p>
                    </div>
                  )}
                  <p className="mt-1 text-white/40">Julich-Brain: {structureEvidence.julichObservation?.status === "unmapped" ? "No authoritative crosswalk established" : structureEvidence.scientificFeatures.julich} · provider-space context only.</p>
                  <p className="mt-1 text-white/40">Scientific target: {structureEvidence.scientificTarget.status} · coordinate unavailable.</p>
                  <p className="mt-1 text-amber-100/60">Luna → MNI: Not established. Structure identity is not a coordinate or mission target.</p>
                </div>
              )}
              {observationContext.structureMapping && (
                <div className="mt-2 text-[10px] leading-relaxed text-white/40">
                  <span className="text-white/30">Structure mapping: </span>
                  {observationContext.structureMapping.status} · {observationContext.structureMapping.note}
                </div>
              )}
              {observationContext.spatialCapability && (
                <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-2.5 text-[10px] leading-relaxed text-white/50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="uppercase tracking-wider text-white/35">Spatial target</span>
                    <span className={observationContext.spatialCapability.operationEnabled ? "text-emerald-300" : "text-amber-200"}>
                      {observationContext.spatialCapability.operationEnabled
                        ? "Available"
                        : "Unavailable"}
                    </span>
                  </div>
                  <p className="mt-1 text-white/55">
                    {observationContext.spatialCapability.reason}
                  </p>
                  {observationContext.spatialTarget?.coordinateType !== "unavailable" && (
                    <div className="mt-2 text-white/40">
                      <span className="text-white/30">Target type: </span>
                      {observationContext.spatialTarget?.coordinateType}
                      {observationContext.spatialTarget?.targetDerivation
                        ? ` · ${observationContext.spatialTarget.targetDerivation}`
                        : ""}
                    </div>
                  )}
                  {observationContext.spatialTarget?.coordinate && (
                    <div className="mt-2 text-white/40">
                      <span className="text-white/30">Coordinate: </span>
                      [{observationContext.spatialTarget.coordinate.x}, {observationContext.spatialTarget.coordinate.y}, {observationContext.spatialTarget.coordinate.z}]
                      {observationContext.spatialTarget.coordinate.units
                        ? ` ${observationContext.spatialTarget.coordinate.units}`
                        : ""}
                    </div>
                  )}
                  {observationContext.coordinateTransform && (
                    <div className="mt-2 text-white/40">
                      <span className="text-white/30">Transform: </span>
                      {observationContext.coordinateTransform.transformType} · {observationContext.coordinateTransform.note}
                    </div>
                  )}
                </div>
              )}
              {observationContext.provenance?.citation && (
                <div className="mt-3 text-[9px] leading-relaxed text-white/30">
                  Citation: {observationContext.provenance.citation}
                </div>
              )}
              {observationContext.scale !== "macro" && (
                <button
                  type="button"
                  onClick={onReturnToMacro}
                  className="mt-3 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  Return to Macro
                </button>
              )}
            </div>

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

            <div className="rounded-lg border border-red-500/15 bg-red-500/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] uppercase tracking-wider text-red-100/70">
                  Target-linked nanobots
                </div>
                <div className="rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] text-red-100/75">
                  {activeNanobots.length}
                </div>
              </div>
              {activeNanobots.length ? (
                <div className="mt-2 space-y-1">
                  {activeNanobots.map((nanobot) => (
                    <button key={nanobot.id} type="button" onClick={() => onSelectNanobot(nanobot.id)} className="flex w-full items-center justify-between rounded-md border border-white/5 bg-black/10 px-2 py-1.5 text-left text-[10px] text-white/65 transition hover:bg-red-500/10 hover:text-white">
                      <span className="truncate">{nanobot.metadata.label} · {nanobot.type}</span>
                      <span className="ml-2 text-[9px] text-red-100/60">{nanobot.state}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-[10px] leading-relaxed text-white/40">
                  No current fleet member is targeted to this canonical structure ID.
                </div>
              )}
            </div>

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
              Scientific observations
            </div>

            {observationContext.findings.length > 0 ? (
              <div className="mt-2 space-y-2">
                {observationContext.findings.map((finding) => (
                  <div
                    key={finding.id}
                    className="rounded-md border border-white/5 bg-black/10 px-2 py-2"
                  >
                    <div className="text-[10px] text-white/60">
                      {finding.label}
                    </div>
                    <div className="mt-0.5 text-xs text-blue-100/85">
                      {finding.value}{finding.unit ? ` ${finding.unit}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[10px] leading-relaxed text-white/40">
                No provider measurement is displayed for this context. Luna does not infer scientific values when a dataset lacks a supported result.
              </p>
            )}
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
    </aside>
  );
}