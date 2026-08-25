import { useMemo, useState } from "react";

import type { BrainStructure } from "./anatomy/BrainStructureRegistry";

import type {
  BrainObservationContext,
} from "./anatomy/BrainObservationContext";

import {
  buildBrainAnatomyHierarchy,
  type BrainAnatomyNode,
} from "./anatomy/BrainAnatomyHierarchy";

interface BrainAnatomyNavigatorProps {
  structures: BrainStructure[];
  selectedStructure: BrainStructure | null;
  onSelectStructure: (
    structure: BrainStructure,
  ) => void;
  observationContext: BrainObservationContext;
  onReturnToMacro: () => void;
}

interface TreeNodeProps {
  node: BrainAnatomyNode;
  structuresById: Map<string, BrainStructure>;
  selectedStructure: BrainStructure | null;
  onSelectStructure: (
    structure: BrainStructure,
  ) => void;
  depth: number;
  query: string;
}

function nodeMatchesQuery(
  node: BrainAnatomyNode,
  structuresById: Map<string, BrainStructure>,
  query: string,
): boolean {
  if (!query) {
    return true;
  }

  const normalized =
    query.toLowerCase().trim();

  if (
    node.label
      .toLowerCase()
      .includes(normalized)
  ) {
    return true;
  }

  return node.structureIds.some(
    (id) =>
      structuresById
        .get(id)
        ?.searchText.includes(
          normalized,
        ) ?? false,
  );
}

function TreeNode({
  node,
  structuresById,
  selectedStructure,
  onSelectStructure,
  depth,
  query,
}: TreeNodeProps) {
  const matches =
    nodeMatchesQuery(
      node,
      structuresById,
      query,
    );

  const childMatches =
    node.children.some(
      (child) =>
        nodeMatchesQuery(
          child,
          structuresById,
          query,
        ) ||
        child.children.some(
          (grandchild) =>
            nodeMatchesQuery(
              grandchild,
              structuresById,
              query,
            ),
        ),
    );

  const [expanded, setExpanded] =
    useState(
      Boolean(query) ||
        depth < 2,
    );

  const isStructure =
    node.type === "structure";

  const structure =
    isStructure
      ? structuresById.get(
          node.structureIds[0],
        ) ?? null
      : null;

  const isSelected =
    Boolean(
      structure &&
        selectedStructure?.id ===
          structure.id,
    );

  const hasChildren =
    node.children.length > 0;

  if (
    query &&
    !matches &&
    !childMatches
  ) {
    return null;
  }

  const handleClick = () => {
    if (isStructure && structure) {
      onSelectStructure(
        structure,
      );

      return;
    }

    if (
      node.structureIds.length > 0
    ) {
      const firstStructure =
        structuresById.get(
          node.structureIds[0],
        );

      if (firstStructure) {
        onSelectStructure(
          firstStructure,
        );
      }
    }

    if (hasChildren) {
      setExpanded(
        (current) => !current,
      );
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={[
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition",
          isSelected
            ? "bg-blue-500/20 text-white ring-1 ring-blue-400/30"
            : "text-white/70 hover:bg-white/10 hover:text-white",
        ].join(" ")}
        style={{
          paddingLeft:
            `${depth * 14 + 8}px`,
        }}
      >
        {hasChildren ? (
          <span className="w-3 text-center text-white/40">
            {expanded ? "▾" : "▸"}
          </span>
        ) : (
          <span className="w-3 text-center text-white/20">
            •
          </span>
        )}

        <span className="min-w-0 flex-1 truncate">
          {node.label}
        </span>

        {node.structureCount > 0 && (
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-white/30">
            {node.structureCount}
          </span>
        )}
      </button>

      {expanded &&
        hasChildren && (
          <div>
            {node.children.map(
              (child) => (
                <TreeNode
                  key={child.id}
                  node={child}
                  structuresById={
                    structuresById
                  }
                  selectedStructure={
                    selectedStructure
                  }
                  onSelectStructure={
                    onSelectStructure
                  }
                  depth={depth + 1}
                  query={query}
                />
              ),
            )}
          </div>
        )}
    </div>
  );
}

export default function BrainAnatomyNavigator({
  structures,
  selectedStructure,
  onSelectStructure,
  observationContext,
  onReturnToMacro,
}: BrainAnatomyNavigatorProps) {
  const hierarchy = useMemo(
    () =>
      buildBrainAnatomyHierarchy(
        structures,
      ),
    [structures],
  );

  const structuresById =
    useMemo(() => {
      return new Map(
        structures.map(
          (structure) => [
            structure.id,
            structure,
          ],
        ),
      );
    }, [structures]);

  const [query, setQuery] =
    useState("");

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-black/75 text-white shadow-2xl backdrop-blur-xl">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
          Brain Anatomy
        </div>

        <div className="mt-1 text-sm font-semibold">
          Anatomical Navigator
        </div>

        {observationContext.scale === "macro" ? (
          <>
            <div className="mt-1 text-[10px] text-white/40">
              Browse the structures in the
              Luna brain model.
            </div>

            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
              placeholder="Search structures..."
              className="mt-3 w-full rounded-md border border-white/5 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-blue-400/40 focus:bg-white/10"
              aria-label="Search brain structures"
            />

            <div className="mt-2 flex items-center justify-between text-[9px] text-white/30">
              <span>
                {structures.length} structures
              </span>

              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="hover:text-white"
                >
                  Clear search
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="mt-3 rounded-lg border border-blue-400/15 bg-blue-500/5 p-3">
            <div className="text-[9px] uppercase tracking-[0.16em] text-blue-200/55">
              Observation context
            </div>
            <div className="mt-1 text-xs font-medium text-white/85">
              {observationContext.structureName ?? "No structure selected"}
            </div>
            <div className="mt-1 text-[10px] text-white/40">
              {observationContext.scaleLabel} observation
            </div>
            {observationContext.datasetLabel && (
              <div className="mt-2 text-[10px] leading-relaxed text-blue-100/60">
                Source: {observationContext.datasetLabel} · {observationContext.scientificStatus ?? "local"}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {observationContext.scale === "macro" ? (
          <TreeNode
            node={hierarchy.root}
            structuresById={
              structuresById
            }
            selectedStructure={
              selectedStructure
            }
            onSelectStructure={
              onSelectStructure
            }
            depth={0}
            query={query}
          />
        ) : (
          <div className="flex min-h-full flex-col justify-between rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div>
              <div className="text-[9px] uppercase tracking-[0.16em] text-white/35">
                {observationContext.scaleLabel} navigator
              </div>
              <p className="mt-2 text-xs leading-relaxed text-white/60">
                {observationContext.message}
              </p>

              {observationContext.findings.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-[9px] uppercase tracking-[0.16em] text-blue-200/55">
                    Provider observations
                  </div>
                  {observationContext.findings.map((finding) => (
                    <div
                      key={finding.id}
                      className="rounded-md border border-white/8 bg-black/20 px-3 py-2"
                    >
                      <div className="text-[10px] text-white/75">
                        {finding.label}
                      </div>
                      <div className="mt-1 text-xs font-medium text-blue-100/80">
                        {finding.value}{finding.unit ? ` ${finding.unit}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {observationContext.structureMapping && (
                <div className="mt-4 rounded-md border border-white/8 bg-black/20 px-3 py-2 text-[10px] leading-relaxed text-white/45">
                  Structure mapping: {observationContext.structureMapping.status}. {observationContext.structureMapping.note}
                </div>
              )}

              {observationContext.referenceSpace && (
                <div className="mt-3 text-[10px] leading-relaxed text-white/35">
                  Reference space: {observationContext.referenceSpace.label}
                </div>
              )}

              {observationContext.spatialCapability && (
                <div className="mt-3 rounded-md border border-amber-300/15 bg-amber-300/5 px-3 py-2 text-[10px] leading-relaxed text-amber-50/65">
                  <div className="uppercase tracking-[0.14em] text-amber-100/45">Spatial target</div>
                  <div className="mt-1">
                    {observationContext.spatialCapability.operationEnabled
                      ? "Available"
                      : "Unavailable"}
                    {" · "}
                    {observationContext.spatialCapability.reason}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onReturnToMacro}
              className="mt-5 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Return to Macro
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}