import { useEffect, useMemo, useState } from "react";
import type { BrainStructure } from "../anatomy/BrainStructureRegistry";
import type { CanonicalReviewRecord, ScientificReviewStatus } from "./useScientificReviewRegistry";

export interface ScientificReviewCenterProps {
  records: CanonicalReviewRecord[];
  loading: boolean;
  summary: { total: number; highConfidence: number; ambiguous: number; approved: number; rejected: number; requiresReview: number; unmapped: number };
  effectiveStatus: (record: CanonicalReviewRecord) => ScientificReviewStatus;
  setDecision: (id: string, status: "APPROVED" | "REJECTED", reviewer: string, reason: string | null) => void;
  resetToReview: (id: string) => void;
  structures: BrainStructure[];
  onSelectStructure: (structure: BrainStructure) => void;
  focusStructureId: string | null;
}

type Filter = "all" | "needs-review" | "high-confidence" | "ambiguous" | "approved" | "rejected" | "unmapped";

function isComposite(record: CanonicalReviewRecord) {
  return /(complex|region|matter|part_of|body)/i.test(record.lunaStructureName);
}

export default function ScientificReviewCenter({ records, loading, summary, effectiveStatus, setDecision, resetToReview, structures, onSelectStructure, focusStructureId }: ScientificReviewCenterProps) {
  const [filter, setFilter] = useState<Filter>("needs-review");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState("Local reviewer");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const selected = records.find((record) => record.lunaStructureId === selectedId) ?? null;

  useEffect(() => {
    if (focusStructureId && records.some((record) => record.lunaStructureId === focusStructureId)) {
      setSelectedId(focusStructureId);
    }
  }, [focusStructureId, records]);

  const displayed = useMemo(() => records.filter((record) => {
    const status = effectiveStatus(record);
    const searchable = `${record.lunaStructureName} ${record.uberonId ?? ""} ${record.hraEntityId ?? ""} ${record.canonicalName ?? ""}`.toLowerCase();
    if (query && !searchable.includes(query.toLowerCase().trim())) return false;
    if (filter === "needs-review") return status === "REQUIRES_REVIEW";
    if (filter === "high-confidence") return status === "REQUIRES_REVIEW" && !isComposite(record);
    if (filter === "ambiguous") return status === "REQUIRES_REVIEW" && isComposite(record);
    if (filter === "approved") return status === "APPROVED";
    if (filter === "rejected") return status === "REJECTED";
    if (filter === "unmapped") return status === "UNMAPPED";
    return true;
  }).sort((a, b) => a.lunaStructureName.localeCompare(b.lunaStructureName)), [records, effectiveStatus, filter, query]);

  const decide = (status: "APPROVED" | "REJECTED") => {
    if (!selected) return;
    try {
      setDecision(selected.lunaStructureId, status, reviewer, status === "REJECTED" ? reason : null);
      setError("");
      if (status === "REJECTED") setReason("");
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Decision could not be saved.");
    }
  };

  const selectRecord = (record: CanonicalReviewRecord) => {
    setSelectedId(record.lunaStructureId);
    setError("");
    const structure = structures.find((candidate) => candidate.id === record.lunaStructureId);
    if (structure) onSelectStructure(structure);
  };

  return <aside className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-red-400/20 bg-black/75 text-white shadow-2xl backdrop-blur-xl" aria-label="Scientific Review Center">
    <header className="border-b border-white/10 px-4 py-3">
      <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200">Scientific Review</div><div className="mt-1 text-sm font-semibold">Human anatomical identity review</div><p className="mt-1 text-[10px] leading-relaxed text-white/45">Approval accepts anatomical identity only. It does not establish Luna → MNI, Luna → Julich, a coordinate, or nanobot capability.</p></div><div className="rounded-md border border-red-300/35 bg-red-500/10 px-2 py-1 text-right"><div className="text-lg font-semibold text-red-100">{summary.requiresReview}</div><div className="text-[8px] uppercase tracking-[0.14em] text-red-200/70">Remaining</div></div></div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[9px]"><div className="rounded border border-white/8 bg-white/[0.03] p-2"><span className="text-white/35">Progress</span><div className="mt-1 text-white/85">{summary.approved + summary.rejected} / {summary.total}</div></div><div className="rounded border border-white/8 bg-white/[0.03] p-2"><span className="text-white/35">High confidence</span><div className="mt-1 text-white/85">{summary.highConfidence}</div></div><div className="rounded border border-white/8 bg-white/[0.03] p-2"><span className="text-white/35">Ambiguous</span><div className="mt-1 text-white/85">{summary.ambiguous}</div></div></div>
    </header>
    <div className="border-b border-white/10 p-3"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, UBERON, HRA, or GLB path" className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-red-300/45" aria-label="Search scientific review records" /><div className="mt-2 flex flex-wrap gap-1">{([ ["all", "All"], ["needs-review", "Needs Review"], ["high-confidence", "High Confidence"], ["ambiguous", "Ambiguous"], ["approved", "Approved"], ["rejected", "Rejected"], ["unmapped", "Unmapped"] ] as Array<[Filter, string]>).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={filter === value ? "rounded bg-red-500/20 px-2 py-1 text-[9px] text-red-100 ring-1 ring-red-300/30" : "rounded bg-white/5 px-2 py-1 text-[9px] text-white/55 hover:bg-white/10"}>{label}</button>)}</div></div>
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(270px,0.9fr)]"><div className="min-h-0 overflow-y-auto p-2"><div className="mb-2 text-[9px] uppercase tracking-[0.15em] text-white/35">{filter.replace(/-/g, " ")} · {displayed.length} records</div>{loading ? <div className="p-4 text-xs text-white/40">Loading review evidence…</div> : displayed.map((record) => { const status = effectiveStatus(record); const composite = isComposite(record); return <button key={record.lunaStructureId} type="button" onClick={() => selectRecord(record)} data-scientific-review-status={status} data-scientific-review-structure-id={record.lunaStructureId} className={selectedId === record.lunaStructureId ? "mb-1 w-full rounded-md border border-red-300/35 bg-red-500/10 p-3 text-left" : "mb-1 w-full rounded-md border border-white/8 bg-white/[0.025] p-3 text-left hover:bg-white/[0.06]"}><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-medium text-white/85">{record.lunaStructureName}</span><span className={status === "REQUIRES_REVIEW" ? "rounded border border-red-300/35 px-1.5 py-0.5 text-[8px] font-semibold text-red-200" : status === "REJECTED" ? "rounded border border-red-400/50 px-1.5 py-0.5 text-[8px] font-semibold text-red-100" : status === "APPROVED" ? "rounded border border-emerald-300/25 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-100" : "rounded border border-white/15 bg-white/[0.03] px-1.5 py-0.5 text-[8px] font-semibold text-white/55"}>{status.replace(/_/g, " ")}</span></div><div className="mt-1 text-[9px] text-white/40">{record.uberonId ?? "No exact source-supported identity"} · {composite ? "Ambiguous/composite" : "High-confidence direct identity"}</div></button>; })}</div>
      <div className="min-h-0 overflow-y-auto border-l border-white/10 bg-black/20 p-4">{selected ? <><div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-red-200">Scientific identity review</div><h3 className="mt-1 text-base font-semibold">{selected.lunaStructureName}</h3><dl className="mt-3 space-y-2 text-[10px] leading-relaxed"><div><dt className="text-white/35">GLB node/path</dt><dd className="text-white/75">{selected.lunaStructureName}</dd></div><div><dt className="text-white/35">HRA entity / version</dt><dd className="text-white/75">{selected.hraEntityId ?? "Not supplied"} · {selected.sourceVersion}</dd></div><div><dt className="text-white/35">UBERON identity</dt><dd className="text-white/75">{selected.uberonId ?? "No exact identity"} {selected.canonicalName ? `· ${selected.canonicalName}` : ""}</dd></div><div><dt className="text-white/35">Evidence</dt><dd className="text-white/60">{selected.evidence}</dd></div><div><dt className="text-white/35">Laterality / scope</dt><dd className="text-white/60">Verify source label and intended product use during human review.</dd></div></dl><div className="mt-4 rounded border border-amber-300/20 bg-amber-300/5 p-2 text-[10px] leading-relaxed text-amber-50/70">This decision preserves the original evidence and changes review metadata only. It does not establish a coordinate, reference-space registration, molecular/cellular measurement, or lower-scale nanobot target.</div><div className="mt-4 space-y-2"><input value={reviewer} onChange={(event) => setReviewer(event.target.value)} placeholder="Reviewer" className="w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white" aria-label="Reviewer name" /><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Rejection reason (required only to reject)" className="min-h-16 w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white" aria-label="Rejection reason" />{error && <p className="text-[10px] text-red-200">{error}</p>}<div className="flex flex-wrap gap-2"><button type="button" onClick={() => decide("APPROVED")} className="rounded bg-emerald-300 px-3 py-1.5 text-[10px] font-semibold text-slate-950">Approve</button><button type="button" onClick={() => decide("REJECTED")} className="rounded border border-red-300/40 bg-red-500/10 px-3 py-1.5 text-[10px] font-semibold text-red-100">Reject</button><button type="button" onClick={() => resetToReview(selected.lunaStructureId)} className="rounded border border-white/15 px-3 py-1.5 text-[10px] text-white/70">Keep for review</button></div></div></> : <div className="grid h-full place-items-center text-center text-xs leading-relaxed text-white/40">Select a record to review its source evidence and make a human decision.</div>}</div></div>
  </aside>;
}
