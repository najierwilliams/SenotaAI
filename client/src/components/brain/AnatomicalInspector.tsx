import type { BrainStructure } from "./anatomy/BrainStructureRegistry";

interface AnatomicalInspectorProps {
  structure: BrainStructure | null;
  isIsolated: boolean;
  onToggleIsolation: () => void;
  onClear: () => void;
}

export default function AnatomicalInspector({
  structure,
  isIsolated,
  onToggleIsolation,
  onClear,
}: AnatomicalInspectorProps) {
  if (!structure) {
    return null;
  }

  const currentStructure = structure;

  const hemisphereLabel =
    currentStructure.hemisphere === "left"
      ? "Left"
      : currentStructure.hemisphere === "right"
        ? "Right"
        : currentStructure.hemisphere === "midline"
          ? "Midline"
          : "Unknown";

  const categoryLabel =
    currentStructure.category
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase(),
      );

  return (
    <aside className="absolute right-4 top-4 z-10 w-80 max-w-[calc(100%-2rem)] rounded-xl border border-white/10 bg-black/75 p-5 text-white shadow-2xl backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
            Anatomical Inspector
          </div>

          <h2 className="mt-2 text-xl font-semibold leading-tight">
            {currentStructure.displayName}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="rounded-md px-2 py-1 text-lg leading-none text-white/50 transition hover:bg-white/10 hover:text-white"
          aria-label="Close anatomical inspector"
        >
          ×
        </button>
      </div>

      <div className="mt-5 space-y-3">
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
            Category
          </div>

          <div className="mt-1 text-sm">
            {categoryLabel}
          </div>
        </div>

        {currentStructure.parentRegion && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              Parent region
            </div>

            <div className="mt-1 text-sm capitalize">
              {currentStructure.parentRegion}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            Model identifier
          </div>

          <div className="mt-1 break-all font-mono text-[11px] leading-relaxed text-white/60">
            {currentStructure.sourceName}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
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
          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          Close
        </button>
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="text-[10px] uppercase tracking-wider text-white/35">
          Luna anatomical system
        </div>

        <p className="mt-2 text-xs leading-relaxed text-white/55">
          This structure is currently identified from
          the anatomical mesh contained in the Luna
          brain model.
        </p>
      </div>
    </aside>
  );
}