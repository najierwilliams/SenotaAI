import { useMemo, useState } from "react";

import type { BrainStructure } from "./anatomy/BrainStructureRegistry";

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
    <aside className="absolute bottom-4 left-4 top-20 z-10 w-72 overflow-hidden rounded-xl border border-white/10 bg-black/75 text-white shadow-2xl backdrop-blur-xl">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
          Brain Anatomy
        </div>

        <div className="mt-1 text-sm font-semibold">
          Anatomical Navigator
        </div>

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
          className="mt-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-blue-400/40 focus:bg-white/10"
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
      </div>

      <div className="h-[calc(100%-142px)] overflow-y-auto p-2">
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
      </div>
    </aside>
  );
}