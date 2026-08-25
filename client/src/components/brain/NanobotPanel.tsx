import {
  useState,
} from "react";

import type {
  BrainStructure,
} from "./anatomy/BrainStructureRegistry";

import type {
  Nanobot,
  NanobotMissionPhase,
  NanobotMissionResult,
  NanobotType,
} from "./anatomy/NanobotTypes";

import type {
  BrainObservationContext,
} from "./anatomy/BrainObservationContext";

interface NanobotPanelProps {
  nanobots: Nanobot[];
  missionHistory: NanobotMissionResult[];
  selectedNanobotId: string | null;
  selectedStructure: BrainStructure | null;
  observationContext: BrainObservationContext;
  onDeploy: (
    type: NanobotType,
  ) => void;
  onPause: () => void;
  onResume: () => void;
  onReturn: () => void;
  onClear: () => void;
  onSelectNanobot: (
    id: string,
  ) => void;
}

function labelize(
  value: string,
): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function stateLabel(
  state: Nanobot["state"],
): string {
  return labelize(state);
}

function missionPhaseLabel(
  phase: NanobotMissionPhase,
): string {
  return labelize(phase);
}

export default function NanobotPanel({
  nanobots,
  missionHistory,
  selectedNanobotId,
  selectedStructure,
  observationContext,
  onDeploy,
  onPause,
  onResume,
  onReturn,
  onClear,
  onSelectNanobot,
}: NanobotPanelProps) {
  const [showAllHistory, setShowAllHistory] =
    useState(false);

  const activeCount =
    nanobots.filter(
      (nanobot) =>
        nanobot.state !==
          "completed" &&
        nanobot.state !==
          "error",
    ).length;

  const completedCount =
    nanobots.filter(
      (nanobot) =>
        nanobot.state ===
        "completed",
    ).length;

  const selectedNanobot =
    nanobots.find(
      (nanobot) =>
        nanobot.id ===
        selectedNanobotId,
    ) ?? null;

  const canDeploy =
    Boolean(selectedStructure) &&
    observationContext.scale === "macro" &&
    observationContext.available;

  const deploymentReason = !selectedStructure
    ? "Select a structure to resolve a Macro target."
    : observationContext.scale !== "macro"
      ? observationContext.spatialCapability?.reason ??
        "Operation not supported: this scale has no coordinate-resolved mission data."
      : !observationContext.available
        ? "Macro anatomy asset is not available."
        : "Macro simulation mission uses a real viewer-mesh target and a simulated lifecycle.";

  const visibleHistory = showAllHistory
    ? missionHistory
    : missionHistory.slice(0, 5);

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-red-500/25 bg-black/75 text-white shadow-2xl backdrop-blur-xl">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-red-300/65">
          Nanobot System
        </div>

        <div className="mt-1 flex items-center justify-between">
          <div className="text-sm font-semibold">
            Neural Micro-Agents
          </div>

          <div className="flex gap-1">
            <div className="rounded-full bg-red-500/15 px-2 py-1 text-[9px] text-red-200">
              {activeCount} active
            </div>

            {completedCount > 0 && (
              <div className="rounded-full bg-white/5 px-2 py-1 text-[9px] text-white/40">
                {completedCount} complete
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            Current target
          </div>

          <div className="mt-1 text-sm text-white/85">
            {selectedStructure
              ? selectedStructure.displayName
              : "Select a brain structure"}
          </div>

          {selectedStructure && (
            <div className="mt-1 text-[9px] text-white/35">
              {labelize(
                selectedStructure.hemisphere,
              )}{" "}
              ·{" "}
              {labelize(
                selectedStructure.depth,
              )}
            </div>
          )}

          <div className="mt-2 text-[10px] text-red-100/65">
            {observationContext.scaleLabel} observation · {observationContext.scientificStatus ?? "local asset state"}
          </div>
          {observationContext.datasetLabel && (
            <div className="mt-1 text-[9px] leading-relaxed text-red-100/45">
              Dataset: {observationContext.datasetLabel}
            </div>
          )}

          <div className="mt-2 text-[9px] leading-relaxed text-white/40">
            {deploymentReason}
          </div>
        </div>

        {observationContext.scale !== "macro" && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-[11px] leading-relaxed text-red-100/65">
            <div className="font-medium">Spatial target unavailable</div>
            <div className="mt-1">
              {observationContext.spatialCapability?.reason ??
                (observationContext.scientificAvailable
                  ? "Scientific metadata is available, but no provider-supported coordinate-resolved mission data is connected."
                  : `${observationContext.scaleLabel} scientific dataset is ${observationContext.scientificStatus ?? "unavailable"}.`)}
            </div>
            <div className="mt-1 text-red-100/45">Existing missions retain their original targets; new lower-scale missions remain disabled.</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              onDeploy("scout")
            }
            disabled={
              !canDeploy
            }
            className="rounded-lg border border-red-500/25 bg-red-500/15 px-3 py-2 text-xs font-medium text-blue-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Deploy scout
          </button>

          <button
            type="button"
            onClick={() =>
              onDeploy(
                "diagnostic",
              )
            }
            disabled={
              !canDeploy
            }
            className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Diagnostic
          </button>

          <button
            type="button"
            onClick={() =>
              onDeploy("repair")
            }
            disabled={
              !canDeploy
            }
            className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Repair
          </button>

          <button
            type="button"
            onClick={() =>
              onDeploy("monitor")
            }
            disabled={
              !canDeploy
            }
            className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Monitor
          </button>
        </div>

        {selectedNanobot && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider text-white/40">
                Selected nanobot
              </div>

              <div className="font-mono text-[9px] text-red-200/60">
                {selectedNanobot.id}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <div className="text-[9px] uppercase text-white/30">
                  Type
                </div>

                <div className="mt-1 text-xs text-white/75">
                  {labelize(
                    selectedNanobot.type,
                  )}
                </div>
              </div>

              <div>
                <div className="text-[9px] uppercase text-white/30">
                  State
                </div>

                <div className="mt-1 text-xs text-white/75">
                  {stateLabel(
                    selectedNanobot.state,
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-md border border-white/5 bg-black/10 p-2">
              <div className="flex items-center justify-between">
                <div className="text-[9px] uppercase tracking-wider text-white/30">
                  Mission
                </div>

                <div className="text-[9px] text-red-200/60">
                  {labelize(
                    selectedNanobot
                      .mission
                      .mission,
                  )}
                </div>
              </div>

              <div className="mt-2 text-[10px] text-white/65">
                {selectedNanobot
                  .mission
                  .message}
              </div>

              <div className="mt-2 flex items-center justify-between text-[9px] text-white/35">
                <span>
                  Phase
                </span>

                <span>
                  {missionPhaseLabel(
                    selectedNanobot
                      .mission
                      .phase,
                  )}
                </span>
              </div>
            </div>

            {selectedNanobot.target && (
              <div className="mt-3">
                <div className="text-[9px] uppercase tracking-wider text-white/30">
                  Target lock
                </div>

                <div className="mt-1 text-[10px] text-white/70">
                  {
                    selectedNanobot
                      .target
                      .structureName
                  }
                </div>

                <div className="mt-1 text-[9px] text-white/30">
                  {labelize(
                    selectedNanobot
                      .target
                      .hemisphere,
                  )}{" "}
                  ·{" "}
                  {labelize(
                    selectedNanobot
                      .target
                      .depth,
                  )}{" "}
                  ·{" "}
                  {labelize(
                    selectedNanobot
                      .target
                      .observationScale,
                  )}
                </div>
              </div>
            )}

            {selectedNanobot.target && (
              <div className="mt-3 space-y-1 rounded-md border border-white/5 bg-black/10 p-2 text-[9px] leading-relaxed text-white/45">
                <div>
                  Original observation: {labelize(selectedNanobot.target.observationScale)} · {selectedNanobot.target.observationContextLabel}
                </div>
                <div>
                  Spatial status: {labelize(selectedNanobot.target.spatialStatus)}{selectedNanobot.target.targetResolution ? ` · ${selectedNanobot.target.targetResolution}` : ""}
                </div>
                <div>{selectedNanobot.target.spatialMessage}</div>
                {selectedNanobot.target.referenceSpace && (
                  <div>
                    Reference space: {selectedNanobot.target.referenceSpace.label}
                    {selectedNanobot.target.referenceSpace.version
                      ? ` · ${selectedNanobot.target.referenceSpace.version}`
                      : ""}
                  </div>
                )}
                {selectedNanobot.target.spatialTarget?.coordinateType !== "unavailable" && (
                  <div>
                    Target type: {selectedNanobot.target.spatialTarget?.coordinateType}
                    {selectedNanobot.target.spatialTarget?.targetDerivation
                      ? ` · ${selectedNanobot.target.spatialTarget.targetDerivation}`
                      : ""}
                  </div>
                )}
                {selectedNanobot.target.spatialTarget?.coordinate && (
                  <div>
                    Coordinate: [{selectedNanobot.target.spatialTarget.coordinate.x}, {selectedNanobot.target.spatialTarget.coordinate.y}, {selectedNanobot.target.spatialTarget.coordinate.z}]
                    {selectedNanobot.target.spatialTarget.coordinate.units
                      ? ` ${selectedNanobot.target.spatialTarget.coordinate.units}`
                      : ""}
                  </div>
                )}
                {selectedNanobot.target.coordinateTransform && (
                  <div>
                    Transform: {selectedNanobot.target.coordinateTransform.transformType} · {selectedNanobot.target.coordinateTransform.status}
                  </div>
                )}
                <div>
                  Viewer presentation: {labelize(selectedNanobot.presentation.viewerScale)} · {selectedNanobot.presentation.contextLabel}
                </div>
                {selectedNanobot.presentation.transition && (
                  <div className="text-red-100/65">
                    View-only transition: {selectedNanobot.presentation.transition.message}
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] text-white/45">
              <div>Distance to target: {selectedNanobot.telemetry.distanceToTarget.toFixed(3)}</div>
              <div>Elapsed: {selectedNanobot.mission.totalElapsedSeconds.toFixed(1)}s</div>
              <div>Mode: {labelize(selectedNanobot.mission.operationMode)}</div>
              <div>Verification: {labelize(selectedNanobot.mission.verificationStatus)}</div>
            </div>

            {selectedNanobot.mission.result && (
              <div className="mt-3 rounded-md border border-red-500/15 bg-red-500/5 p-2 text-[9px] leading-relaxed text-red-50/70">
                <div className="font-medium text-red-100">Mission result · {selectedNanobot.mission.result.success ? "completed" : "failed"}</div>
                <div className="mt-1">{selectedNanobot.mission.result.summary}</div>
                {selectedNanobot.mission.result.findings.map((finding) => (
                  <div key={finding.id} className="mt-1 text-white/55">{finding.title}: {finding.detail}</div>
                ))}
                {selectedNanobot.mission.result.warnings.map((warning) => (
                  <div key={warning} className="mt-1 text-amber-100/70">Warning: {warning}</div>
                ))}
              </div>
            )}

            <div className="mt-3">
              <div className="flex items-center justify-between text-[9px] text-white/35">
                <span>
                  Mission progress
                </span>

                <span>
                  {Math.round(
                    selectedNanobot
                      .mission
                      .progress *
                      100,
                  )}
                  %
                </span>
              </div>

              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-red-500 transition-all"
                  style={{
                    width: `${
                      selectedNanobot
                        .mission
                        .progress *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onPause}
            disabled={
              !selectedNanobot
            }
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-[10px] text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            Pause
          </button>

          <button
            type="button"
            onClick={onResume}
            disabled={
              !selectedNanobot
            }
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-[10px] text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            Resume
          </button>

          <button
            type="button"
            onClick={onReturn}
            disabled={
              !selectedNanobot
            }
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-[10px] text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            Return
          </button>
        </div>

        {nanobots.length > 0 && (
          <div>
            <div className="mb-2 text-[10px] uppercase tracking-wider text-white/35">
              Active fleet
            </div>

            <div className="space-y-1">
              {nanobots.map(
                (nanobot) => (
                  <button
                    key={
                      nanobot.id
                    }
                    type="button"
                    onClick={() =>
                      onSelectNanobot(
                        nanobot.id,
                      )
                    }
                    className={[
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition",
                      selectedNanobotId ===
                      nanobot.id
                        ? "bg-red-500/15 text-white ring-1 ring-blue-400/20"
                        : "text-white/55 hover:bg-white/5 hover:text-white",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "h-2 w-2 rounded-full",
                        nanobot.state ===
                        "error"
                          ? "bg-red-400"
                          : nanobot.state ===
                            "completed"
                            ? "bg-emerald-400"
                            : nanobot.state ===
                              "paused"
                              ? "bg-amber-300"
                              : "bg-red-500",
                      ].join(" ")}
                    />

                    <span className="min-w-0 flex-1 truncate text-[10px]">
                      {nanobot.metadata.label}
                    </span>

                    <span className="text-[9px] text-white/30">
                      {stateLabel(
                        nanobot.state,
                      )}
                    </span>
                  </button>
                ),
              )}
            </div>
          </div>
        )}

        {missionHistory.length > 0 && (
          <div className="rounded-lg border border-red-500/15 bg-red-500/5 p-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider text-red-100/70">
                Mission history · {missionHistory.length}
              </div>
              {missionHistory.length > 5 && (
                <button type="button" onClick={() => setShowAllHistory((value) => !value)} className="text-[9px] text-red-200/65 hover:text-red-100">
                  {showAllHistory ? "Show latest" : "Show all"}
                </button>
              )}
            </div>
            <div className="mt-2 space-y-1.5">
              {visibleHistory.map((result) => (
                <div key={result.missionId} className="rounded border border-white/5 bg-black/10 p-2 text-[9px] leading-relaxed text-white/50">
                  <div className="flex justify-between gap-2 text-white/70">
                    <span>#{result.missionNumber} · {labelize(result.mission)}</span>
                    <span>{result.success ? "Verified" : result.status}</span>
                  </div>
                  <div>{result.target.structureName} · original {labelize(result.originalScale)} · {labelize(result.operationMode)}</div>
                  <div>{result.summary}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClear}
          disabled={
            nanobots.length === 0
          }
          className="w-full rounded-lg border border-red-400/10 px-3 py-2 text-[10px] text-white/40 transition hover:bg-red-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
        >
          Clear nanobot fleet
        </button>
      </div>
    </aside>
  );
}