import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  BrainReferenceSpace,
  JulichCorticalOverlay,
  MniScientificTemplateSurface,
  ScientificCoordinateQueryResult,
  ScientificSpatialProvider,
} from "@shared/brainScience";
import type {
  MniScientificTemplateState,
} from "./scientificMniTemplate";

interface SpatialBackboneResponse {
  visualModel: {
    label: string;
    role: string;
    lunaToMni: string;
    limitation: string;
  };
  scientificProvider: ScientificSpatialProvider;
  canonicalReference: BrainReferenceSpace;
  bigBrainReference: BrainReferenceSpace;
  julich: {
    providerParcellationId: string;
    providerReferenceSpaceId: string;
    datasetVersion: string;
    license: string;
    redistribution: string;
  };
  julichCorticalOverlay: JulichCorticalOverlay;
  limitations: string[];
}

function safeProviderSummary(value: unknown): string {
  if (!value) return "No provider assignment was returned.";
  try {
    const serialized = JSON.stringify(value);
    return serialized.length > 900
      ? `${serialized.slice(0, 900)}…`
      : serialized;
  } catch {
    return "Provider returned a non-serializable assignment payload.";
  }
}

interface ScientificSpatialExplorerProps {
  mniScientificTemplateSurface?: MniScientificTemplateSurface | null;
  mniScientificTemplateState?: MniScientificTemplateState;
  onMniScientificTemplateVisibilityChange?: (visible: boolean) => void;
  onMniScientificTemplateOpacityChange?: (opacity: number) => void;
}

export default function ScientificSpatialExplorer({
  mniScientificTemplateSurface = null,
  mniScientificTemplateState,
  onMniScientificTemplateVisibilityChange,
  onMniScientificTemplateOpacityChange,
}: ScientificSpatialExplorerProps) {
  const [backbone, setBackbone] = useState<SpatialBackboneResponse | null>(null);
  const [loadingBackbone, setLoadingBackbone] = useState(true);
  const [backboneError, setBackboneError] = useState<string | null>(null);
  const [point, setPoint] = useState({ x: "", y: "", z: "" });
  const [querying, setQuerying] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [result, setResult] = useState<ScientificCoordinateQueryResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/brain-science/spatial-backbone")
      .then(async (response) => {
        if (!response.ok) throw new Error(`Scientific backbone returned HTTP ${response.status}`);
        return response.json() as Promise<SpatialBackboneResponse>;
      })
      .then((payload) => {
        if (!cancelled) setBackbone(payload);
      })
      .catch((error) => {
        if (!cancelled) {
          setBackboneError(error instanceof Error ? error.message : "Unable to load scientific spatial metadata.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBackbone(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const referenceLabel = useMemo(() => {
    if (!backbone) return "MNI ICBM 152 2009c Nonlinear Asymmetric";
    return backbone.canonicalReference.label;
  }, [backbone]);

  async function submitQuery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const x = Number(point.x);
    const y = Number(point.y);
    const z = Number(point.z);

    if (![x, y, z].every(Number.isFinite)) {
      setQueryError("Enter finite X, Y, and Z coordinates in millimetres.");
      setResult(null);
      return;
    }

    if (!backbone) {
      setQueryError("The provider reference declaration is still loading.");
      return;
    }

    setQuerying(true);
    setQueryError(null);
    setResult(null);

    try {
      const params = new URLSearchParams({
        referenceSpaceId: backbone.canonicalReference.id,
        units: "millimetres",
        x: String(x),
        y: String(y),
        z: String(z),
      });
      const response = await fetch(`/api/brain-science/scientific-coordinate-query?${params.toString()}`);
      const payload = await response.json() as ScientificCoordinateQueryResult & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? `Scientific provider returned HTTP ${response.status}`);
      setResult(payload);
    } catch (error) {
      setQueryError(error instanceof Error ? error.message : "Scientific coordinate query failed.");
    } finally {
      setQuerying(false);
    }
  }

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-sky-300/20 bg-black/80 text-white shadow-2xl backdrop-blur-xl">
      <div className="border-b border-sky-300/15 p-5 pr-20">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-sky-100/60">Scientific Spatial Explorer</div>
        <h2 className="mt-2 text-xl font-semibold leading-tight">Provider-declared coordinate queries</h2>
        <p className="mt-2 text-[10px] leading-relaxed text-white/50">This workspace is independent of Luna’s HRA presentation mesh. It accepts only a coordinate you enter directly in the declared scientific reference space.</p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
        <section className="rounded-lg border border-amber-300/20 bg-amber-500/5 p-3 text-[10px] leading-relaxed text-amber-50/75">
          <div className="flex items-center justify-between gap-3">
            <span className="uppercase tracking-wider text-amber-100/60">Visual / scientific boundary</span>
            <span className="rounded-full border border-amber-300/20 px-2 py-0.5 text-[9px] font-semibold">NOT ESTABLISHED</span>
          </div>
          <p className="mt-2">Luna visual model: <span className="text-white/85">HRA Brain-Female v1.1</span>.</p>
          <p className="mt-1">Luna → MNI: <span className="font-semibold text-amber-100">NOT ESTABLISHED</span>. Mesh selection, bounds, camera, GLB origin, and Viewer coordinates are never submitted here.</p>
        </section>

        <section className="rounded-lg border border-sky-300/15 bg-sky-500/5 p-3 text-[10px] leading-relaxed text-white/55">
          <div className="uppercase tracking-wider text-sky-100/60">Declared scientific anchor</div>
          {loadingBackbone && <p className="mt-2 text-white/45">Loading provider reference-space metadata…</p>}
          {backboneError && <p className="mt-2 text-amber-100/75">{backboneError}</p>}
          {backbone && (
            <div className="mt-2 space-y-1.5">
              <p><span className="text-white/35">Provider:</span> {backbone.scientificProvider.label} · {backbone.scientificProvider.version ?? "version not supplied"}</p>
              <p><span className="text-white/35">Reference:</span> {backbone.canonicalReference.label}</p>
              <p><span className="text-white/35">Provider ID:</span> {backbone.canonicalReference.providerReferenceSpaceId ?? "unknown"}</p>
              <p><span className="text-white/35">Query units:</span> {backbone.canonicalReference.units ?? "unknown"} · <span className="text-white/35">provider-native:</span> {backbone.canonicalReference.providerNativeUnits ?? "unknown"}</p>
              <p><span className="text-white/35">Axes:</span> {backbone.canonicalReference.axisOrientation ?? "unknown"} · <span className="text-white/35">origin:</span> {backbone.canonicalReference.origin ?? "unknown"} · <span className="text-white/35">handedness:</span> {backbone.canonicalReference.handedness ?? "unknown"}</p>
              <p><span className="text-white/35">Source:</span> <a href={backbone.canonicalReference.provenanceUrl ?? backbone.scientificProvider.sourceUrl} target="_blank" rel="noreferrer" className="text-sky-100/75 underline decoration-sky-200/30 underline-offset-2 hover:text-white">provider metadata</a></p>
            </div>
          )}
        </section>

        {mniScientificTemplateSurface && (
          <section className="rounded-lg border border-cyan-300/20 bg-cyan-500/5 p-3 text-[10px] leading-relaxed text-white/55">
            <div className="flex items-center justify-between gap-3">
              <span className="uppercase tracking-wider text-cyan-100/70">Scientific Spatial Cortex · MNI 2009c</span>
              <span className="rounded-full border border-cyan-300/25 px-2 py-0.5 text-[9px] font-semibold text-cyan-100">{mniScientificTemplateSurface.status}</span>
            </div>
            <p className="mt-2 text-white/75">{mniScientificTemplateSurface.label}</p>
            <p className="mt-1">Provider reference: {mniScientificTemplateSurface.referenceSpaceId} · mesh label {mniScientificTemplateSurface.meshLabelIndex}.</p>
            <p className="mt-1 text-white/45">Two bounded cortical fragments stream directly from the provider only after visibility is enabled. No persistent cache or local bundle is used.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded border border-white/10 bg-black/20 p-2">
              <label className="flex items-center gap-2 text-white/70">
                <input type="checkbox" checked={mniScientificTemplateState?.visible ?? false} onChange={(event) => onMniScientificTemplateVisibilityChange?.(event.target.checked)} disabled={!onMniScientificTemplateVisibilityChange} aria-label="MNI scientific template visibility" className="accent-cyan-400" />
                Visibility · default off
              </label>
              <label className="text-white/70">
                Opacity · {Math.round((mniScientificTemplateState?.opacity ?? mniScientificTemplateSurface.rendering.defaultOpacity) * 100)}%
                <input type="range" min="0.08" max="0.82" step="0.01" value={mniScientificTemplateState?.opacity ?? mniScientificTemplateSurface.rendering.defaultOpacity} onChange={(event) => onMniScientificTemplateOpacityChange?.(Number(event.target.value))} disabled={!onMniScientificTemplateOpacityChange} aria-label="MNI scientific template opacity" className="mt-1 w-full accent-cyan-400 disabled:cursor-not-allowed" />
              </label>
            </div>
            <p className="mt-2 text-white/45">State: {mniScientificTemplateState?.loadState ?? "metadata only"}{mniScientificTemplateState?.error ? ` · ${mniScientificTemplateState.error}` : ""}.</p>
            <p className="mt-1 text-amber-100/75">{mniScientificTemplateSurface.limitation}</p>
            <p className="mt-1 text-white/40">No hover or region selection is offered: this provider surface has no stable Julich region labels. It is never aligned with, picked as, or navigated within the HRA visual brain.</p>
            <a href={mniScientificTemplateSurface.licensing.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sky-100/75 underline decoration-sky-200/30 underline-offset-2 hover:text-white">Open source and attribution terms</a>
          </section>
        )}

        {backbone && (
          <section className="rounded-lg border border-violet-300/20 bg-violet-500/5 p-3 text-[10px] leading-relaxed text-white/55">
            <div className="flex items-center justify-between gap-3">
              <span className="uppercase tracking-wider text-violet-100/70">Scientific Cortex · Julich v3.1</span>
              <span className="rounded-full border border-amber-300/25 px-2 py-0.5 text-[9px] font-semibold text-amber-100">{backbone.julichCorticalOverlay.surfaceDelivery.status}</span>
            </div>
            <p className="mt-2 text-white/75">{backbone.julichCorticalOverlay.label}</p>
            <p className="mt-1 break-all text-white/45">Parcellation: {backbone.julichCorticalOverlay.providerParcellationId}</p>
            <p className="mt-1">Reference: {backbone.julichCorticalOverlay.referenceSpaceId} · MNI ICBM 152 2009c Nonlinear Asymmetric only.</p>
            <p className="mt-1 text-amber-100/75">{backbone.julichCorticalOverlay.surfaceDelivery.reason}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded border border-white/10 bg-black/20 p-2">
              <label className="flex cursor-not-allowed items-center gap-2 text-white/45">
                <input type="checkbox" checked={false} disabled aria-label="Julich cortical overlay visibility unavailable" />
                Visibility · default off
              </label>
              <label className="text-white/45">
                Opacity · {Math.round(backbone.julichCorticalOverlay.rendering.defaultOpacity * 100)}%
                <input type="range" min="0.05" max="1" step="0.01" value={backbone.julichCorticalOverlay.rendering.defaultOpacity} disabled aria-label="Julich cortical overlay opacity unavailable" className="mt-1 w-full accent-violet-400 disabled:cursor-not-allowed" />
              </label>
            </div>
            <p className="mt-2 text-white/40">Hover and region selection are disabled because no eligible provider geometry has stable Julich region IDs. No region is inferred from an HRA mesh, name, or viewer position.</p>
            <p className="mt-1 text-white/40">License: {backbone.julichCorticalOverlay.licensing.license} · {backbone.julichCorticalOverlay.licensing.licenseStatus} · {backbone.julichCorticalOverlay.licensing.redistribution}.</p>
            <a href={backbone.julichCorticalOverlay.licensing.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sky-100/75 underline decoration-sky-200/30 underline-offset-2 hover:text-white">Open Julich v3.1 provider record</a>
          </section>
        )}

        <form onSubmit={submitQuery} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-[10px] text-white/55">
          <label className="block uppercase tracking-wider text-white/35">Scientific reference space</label>
          <select disabled className="mt-1 w-full rounded border border-white/10 bg-black/35 px-2 py-1.5 text-[10px] text-white/75">
            <option>{referenceLabel}</option>
          </select>
          <p className="mt-2 leading-relaxed text-white/40">Only this exact MNI variant is registered. MNI symmetric, MNI 2009b, CerebrA, HRA, Luna Local, and viewer coordinates are rejected.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(["x", "y", "z"] as const).map((axis) => (
              <label key={axis} className="uppercase tracking-wider text-white/35">
                {axis} mm
                <input
                  aria-label={`Scientific MNI ${axis.toUpperCase()} coordinate in millimetres`}
                  inputMode="decimal"
                  value={point[axis]}
                  onChange={(event) => setPoint((current) => ({ ...current, [axis]: event.target.value }))}
                  className="mt-1 w-full rounded border border-white/10 bg-black/35 px-2 py-1.5 text-[11px] normal-case text-white outline-none focus:border-sky-300/50"
                />
              </label>
            ))}
          </div>
          <button type="submit" disabled={querying || loadingBackbone} className="mt-3 rounded border border-sky-300/30 bg-sky-500/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-sky-50 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40">
            {querying ? "Querying siibra…" : "Query Julich in declared MNI space"}
          </button>
          {queryError && <p className="mt-2 text-amber-100/80">{queryError}</p>}
        </form>

        {result && (
          <section className="space-y-3 rounded-lg border border-emerald-300/15 bg-emerald-500/5 p-3 text-[10px] leading-relaxed text-white/55">
            <div className="flex items-center justify-between gap-2">
              <div className="uppercase tracking-wider text-emerald-100/65">Scientific coordinate result</div>
              <span className="rounded-full border border-emerald-300/20 px-2 py-0.5 text-[9px] text-emerald-100">{result.coordinate.source}</span>
            </div>
            <p><span className="text-white/35">Coordinate:</span> [{result.coordinate.x}, {result.coordinate.y}, {result.coordinate.z}] {result.coordinate.units} · {result.coordinate.referenceSpaceId}</p>
            <div className="rounded border border-violet-300/15 bg-violet-500/5 p-2">
              <p className="uppercase tracking-wider text-violet-100/55">Julich-Brain v3.1</p>
              <p className="mt-1">Status: <span className="text-white/80">{result.julich.status}</span> · parcellation {result.julich.providerParcellationId}</p>
              {result.julich.reason ? <p className="mt-1 text-amber-100/70">{result.julich.reason}</p> : <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-black/25 p-2 text-[9px] text-white/60">{safeProviderSummary(result.julich.assignment)}</pre>}
            </div>
            <div className="space-y-1 rounded border border-white/10 bg-black/20 p-2">
              <p><span className="text-white/35">BigBrain:</span> {result.bigBrain.status} · {result.bigBrain.reason}</p>
              {result.bigBrain.coordinate && <p className="break-words text-cyan-100/75">Provider BigBrain coordinate: [{result.bigBrain.coordinate.x}, {result.bigBrain.coordinate.y}, {result.bigBrain.coordinate.z}] {result.bigBrain.coordinate.units} · {result.bigBrain.coordinate.referenceSpaceId}. Context only; not a Luna target.</p>}
              <p><span className="text-white/35">Molecular:</span> {result.molecular.status} · {result.molecular.reason}</p>
              <p><span className="text-white/35">Cellular:</span> {result.cellular.status} · {result.cellular.reason}</p>
              <p><span className="text-white/35">Connectivity:</span> {result.connectivity.status} · {result.connectivity.reason}</p>
            </div>
            <div className="rounded border border-white/10 bg-black/20 p-2 text-white/45">
              <p className="uppercase tracking-wider text-white/35">Provenance and licensing</p>
              <p className="mt-1">Provenance: {result.provenanceIds.join(", ")}</p>
              <p className="mt-1">Licensing: {result.licenseIds.join(", ")}</p>
            </div>
            <ul className="space-y-1 text-amber-100/70">
              {result.limitations.map((limitation) => <li key={limitation}>• {limitation}</li>)}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}
