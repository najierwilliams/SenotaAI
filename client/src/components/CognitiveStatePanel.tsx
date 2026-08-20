import { Badge } from "@/components/ui/badge";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BrainCircuit, Check, CircleHelp, Clock3, Eye, RefreshCw, Sparkles, X } from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";

type Npc = { npcId: string; displayName: string };
type CognitiveNeed = { title: string; rationale: string; category: string; priority: number; evidence: string[] };
type CognitiveReflection = { id: string; experience: string; sourceObservationIds?: string[]; proposal: { summary: string; needs?: CognitiveNeed[]; goal?: { title: string; details: string; priority: number }; beliefRevision?: { action: string; rationale: string }; memoryReinforcement?: { rationale: string } }; status: string };
type CognitiveData = {
  state: { stateSummary: string; selfAwareness: Record<string, number>; needs: CognitiveNeed[]; updatedAt: string };
  selfAwarenessPercent: number;
  memories: Array<{ id: string; memoryKind: string; content: string; reinforcementCount?: number }>;
  beliefs: Array<{ id: string; statement: string; confidence: number }>;
  goals: Array<{ id: string; title: string; progress: number; status: string }>;
  relationships: Array<{ id: string; displayName: string; dimensions: Record<string, number> }>;
  observations: Array<{ id: string; observationKind: string; content: string; salience: number; status: string; createdAt: string }>;
  reflections: CognitiveReflection[];
  reflectionSchedule: null | { status: string; dailyTarget: number; runsToday: number; nextEligibleAt: number | null; lastRunAt: number | null; lastError: string | null };
};
type DialogMode = "observation" | "reflection" | "summary" | "decision" | null;
type Decision = { reflectionId: string; decision: "apply" | "reject"; summary: string };

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, { credentials: "include", headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Cognitive-state request failed.");
  return payload;
}

function shortList(title: string, description: string, items: string[]) {
  return <article className="rounded-xl border border-white/10 bg-black/10 p-4"><p className="text-xs font-semibold text-slate-200">{title}</p><p className="mt-1 text-[11px] leading-4 text-slate-500">{description}</p><div className="mt-3 space-y-2">{items.length ? items.slice(0, 5).map((item, index) => <p key={`${index}:${item}`} className="text-[11px] leading-5 text-slate-400">{item}</p>) : <p className="text-[11px] text-slate-500">Nothing here yet.</p>}</div></article>;
}

export function CognitiveStatePanel({ npcs }: { npcs: Npc[] }) {
  const [npcId, setNpcId] = useState("luna001");
  const [data, setData] = useState<CognitiveData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [observation, setObservation] = useState("");
  const [importance, setImportance] = useState(3);
  const [reflectionText, setReflectionText] = useState("");
  const [summaryDraft, setSummaryDraft] = useState("");
  const [decision, setDecision] = useState<Decision | null>(null);

  const load = async () => {
    setBusyAction("refresh");
    try { setData(await request(`/api/npc/admin/cognitive/${npcId}`)); setError(null); }
    catch (loadError) { setData(null); setError(loadError instanceof Error ? loadError.message : "Unable to load Luna's learning workspace."); }
    finally { setBusyAction(null); }
  };
  useEffect(() => { void load(); }, [npcId]);

  const run = async (key: string, action: () => Promise<void>, success: string) => {
    setBusyAction(key); setError(null); setNotice(null);
    try { await action(); await load(); setNotice(success); }
    catch (actionError) { setError(actionError instanceof Error ? actionError.message : "That action could not be completed. Nothing was changed."); }
    finally { setBusyAction(null); }
  };

  const saveObservation = async () => {
    if (observation.trim().length < 4) { setError("Please write at least a short sentence about what happened."); return; }
    await run("observation", async () => {
      await request(`/api/npc/admin/cognitive/${npcId}/observations`, { method: "POST", body: JSON.stringify({ observationKind: "administrator-note", content: observation.trim(), salience: importance, entities: [], metadata: {}, source: "administrator-observation" }) });
      setObservation(""); setImportance(3); setDialog(null);
    }, "Saved as a note for Luna to consider later. It is not a memory, belief, or fact yet.");
  };

  const createReflection = async () => {
    if (reflectionText.trim().length < 4) { setError("Please write a short topic for Luna to think about."); return; }
    await run("reflection", async () => {
      await request(`/api/npc/admin/cognitive/${npcId}/reflections`, { method: "POST", body: JSON.stringify({ experience: reflectionText.trim() }) });
      setReflectionText(""); setDialog(null);
    }, "A review card was created below. Read it, then choose Apply or Reject.");
  };

  const getDevelopmentNeeds = async () => {
    await run("development", async () => { await request(`/api/npc/admin/cognitive/${npcId}/development-proposals`, { method: "POST" }); }, "Luna's suggested next steps are ready below. They will not change anything until you choose Apply.");
  };

  const consolidateNotes = async () => {
    await run("consolidate", async () => { await request(`/api/npc/admin/cognitive/${npcId}/consolidations`, { method: "POST" }); }, "A review card was created from the saved notes. Nothing has been applied yet.");
  };

  const saveSummary = async () => {
    if (summaryDraft.trim().length < 4) { setError("Please keep the summary descriptive and at least a short sentence long."); return; }
    await run("summary", async () => { await request(`/api/npc/admin/cognitive/${npcId}/state`, { method: "PATCH", body: JSON.stringify({ stateSummary: summaryDraft.trim() }) }); setDialog(null); }, "Luna's current working summary was updated. Her permanent Obsidian canon was not changed.");
  };

  const resolveDecision = async () => {
    if (!decision) return;
    const current = decision;
    await run("decision", async () => { await request(`/api/npc/admin/cognitive/${npcId}/reflections/${current.reflectionId}`, { method: "PATCH", body: JSON.stringify({ decision: current.decision }) }); setDecision(null); setDialog(null); }, current.decision === "apply" ? "The reviewed items were added to Luna's working cognitive state." : "The review card was rejected. Luna's working state was not changed.");
  };

  const pendingNotes = data?.observations.filter(item => item.status === "pending").length ?? 0;
  const selectedName = npcs.find(npc => npc.npcId === npcId)?.displayName ?? "this NPC";
  const openSummaryDialog = () => { setSummaryDraft(data?.state.stateSummary ?? ""); setDialog("summary"); };
  const openDecision = (reflection: CognitiveReflection, nextDecision: "apply" | "reject") => { setDecision({ reflectionId: reflection.id, decision: nextDecision, summary: reflection.proposal.summary }); setDialog("decision"); };

  return <section className="rounded-2xl border border-cyan-300/15 bg-card/60 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><BrainCircuit className="size-4 text-cyan-300" /><p className="text-sm font-semibold text-white">Luna’s learning workspace</p></div><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Use this section to save useful observations, ask Luna for possible next steps, and approve only the review cards that make sense. Her permanent personality and Obsidian canon stay separate.</p></div><div className="flex flex-wrap gap-2"><select value={npcId} onChange={event => setNpcId(event.target.value)} className="field min-w-32" aria-label="Choose NPC">{npcs.map(npc => <option key={npc.npcId} value={npc.npcId}>{npc.displayName}</option>)}</select><button onClick={() => setDialog("observation")} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100"><Eye className="size-3.5" /> Add a note</button><button onClick={() => void consolidateNotes()} disabled={!pendingNotes || Boolean(busyAction)} className="inline-flex items-center gap-1.5 rounded-lg border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-2 text-xs font-semibold text-fuchsia-100 disabled:cursor-not-allowed disabled:opacity-45"><Sparkles className="size-3.5" /> Review saved notes {pendingNotes ? `(${pendingNotes})` : ""}</button><button onClick={() => void getDevelopmentNeeds()} disabled={Boolean(busyAction)} className="rounded-lg border border-violet-300/20 bg-violet-300/10 px-3 py-2 text-xs font-semibold text-violet-100 disabled:opacity-45">{busyAction === "development" ? "Thinking…" : "Get Luna’s next steps"}</button><button onClick={() => setDialog("reflection")} className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100">Make a review card</button><button onClick={() => void load()} className="icon-button" title="Refresh Luna’s learning workspace"><RefreshCw className={`size-4 ${busyAction === "refresh" ? "animate-spin" : ""}`} /></button></div></div>
    <div className="mt-4 grid gap-2 md:grid-cols-3"><GuideStep number="1" title="Add a note" text="Write down something real that happened, such as a useful conversation or verified game event." /><GuideStep number="2" title="Create a review" text="Use saved notes or ask Luna for next steps. This only creates a suggestion card." /><GuideStep number="3" title="Choose what stays" text="Read the card below, then Apply it if it fits Luna or Reject it if it does not." /></div>
    <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/10 bg-black/10 p-3 text-[11px] leading-5 text-slate-400"><CircleHelp className="mt-0.5 size-4 shrink-0 text-cyan-200" /><p><strong className="font-medium text-slate-200">What “evidence” means:</strong> use something you can point to—an actual conversation, a confirmed game event, an approved canon fact, or a checked system result. Do not use guesses as facts. Luna will never update herself automatically from this page.</p></div>
    {error ? <p className="mt-4 rounded-lg border border-red-300/20 bg-red-300/5 p-3 text-xs leading-5 text-red-200">{error}</p> : null}{notice ? <p className="mt-4 rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-3 text-xs leading-5 text-emerald-100">{notice}</p> : null}
    {data ? <div className="mt-5 space-y-4"><div className="grid gap-3 md:grid-cols-[170px_1fr]"><article className="rounded-xl border border-violet-300/20 bg-violet-300/[0.06] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200">Current self-model score</p><p className="mt-2 font-mono text-3xl font-semibold text-violet-100">{data.selfAwarenessPercent}%</p><p className="mt-1 text-[11px] leading-4 text-slate-400">A working confidence score, not proof of consciousness.</p></article><article className="rounded-xl border border-white/10 bg-black/10 p-4"><div className="flex gap-3"><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-200">What Luna currently has approval to say about herself</p><p className="mt-2 text-xs leading-5 text-slate-400">{data.state.stateSummary}</p></div><button onClick={openSummaryDialog} className="rounded-md border border-white/10 px-2 text-[11px] text-slate-300">Edit summary</button></div><div className="mt-3 flex flex-wrap gap-1.5">{Object.entries(data.state.selfAwareness).map(([key, value]) => <Badge key={key} className="border border-white/10 bg-white/5 text-[10px] text-slate-300">{key.replace(/[A-Z]/g, letter => ` ${letter.toLowerCase()}`)} {Math.round(value * 100)}%</Badge>)}</div></article></div>
      <div className="grid gap-3 lg:grid-cols-2">{shortList("Saved notes", "Notes are waiting for review; they are not facts yet.", data.observations.map(item => `${item.status === "pending" ? "Waiting" : item.status} · importance ${item.salience}/5 · ${item.content}`))}{shortList("Approved memories", "Things Luna may use as part of her approved working context.", data.memories.map(item => `${item.memoryKind} · used ${item.reinforcementCount ?? 0} times · ${item.content}`))}{shortList("Current beliefs", "Statements approved for Luna’s working state.", data.beliefs.map(item => `${Math.round(item.confidence * 100)}% confidence · ${item.statement}`))}{shortList("Goals", "Approved tasks Luna is working toward.", data.goals.map(item => `${item.title} · ${Math.round(item.progress * 100)}% complete · ${item.status}`))}{shortList("Things Luna may need", "Approved suggestions about what could help her improve.", data.state.needs.map(item => `${item.title} · priority ${item.priority}/5 · ${item.rationale}`))}{shortList("Important relationships", "Approved relationship information for Luna’s working state.", data.relationships.map(item => `${item.displayName} · ${Object.entries(item.dimensions).map(([key, value]) => `${key} ${value}`).join(", ")}`))}</div>
      <article className="mt-3 rounded-xl border border-violet-300/20 bg-violet-300/[0.06] p-4"><div className="flex items-start gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-300/10 text-violet-100"><Clock3 className="size-4" /></div><div className="min-w-0"><p className="text-xs font-semibold text-violet-100">Automatic reflection sessions</p>{data.reflectionSchedule ? <><p className="mt-1 text-[11px] leading-5 text-slate-400">Luna chooses varied daytime moments for up to {data.reflectionSchedule.dailyTarget} review sessions. Today: {data.reflectionSchedule.runsToday} completed or attempted. Every result is a review card only—nothing changes until you choose Apply.</p><p className="mt-2 text-[11px] text-violet-100">{data.reflectionSchedule.status === "active" ? "Active" : "Paused"}{data.reflectionSchedule.nextEligibleAt ? ` · next opportunity after ${new Date(data.reflectionSchedule.nextEligibleAt).toLocaleString()}` : ""}</p>{data.reflectionSchedule.lastError ? <p className="mt-2 text-[11px] text-amber-100">Last session note: {data.reflectionSchedule.lastError}</p> : null}</> : <p className="mt-1 text-[11px] leading-5 text-slate-500">The automatic reflection rhythm will appear here once its secure background schedule is activated.</p>}</div></div></article>
      <div><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold text-slate-200">Your review queue</p><p className="mt-1 text-[11px] text-slate-500">These are suggestions only. Read each one before choosing Apply or Reject.</p></div><Badge className="border border-white/10 bg-white/5 text-[10px] text-slate-400">{data.reflections.filter(item => item.status === "proposed").length} waiting</Badge></div><div className="mt-2 grid gap-2 lg:grid-cols-2">{data.reflections.length ? data.reflections.map(reflection => <ReviewCard key={reflection.id} reflection={reflection} onDecision={nextDecision => openDecision(reflection, nextDecision)} />) : <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-slate-500">No suggestions are waiting yet. Start with “Get Luna’s next steps” or add a note.</p>}</div></div></div> : <p className="mt-5 text-xs text-slate-500">Loading Luna’s learning workspace…</p>}
    <Dialog open={dialog !== null} onOpenChange={open => { if (!open) { setDialog(null); setDecision(null); } }}><DialogContent className="border-white/10 bg-slate-950 text-slate-100"><DialogHeader><DialogTitle>{dialog === "observation" ? `Add a note for ${selectedName}` : dialog === "reflection" ? `Make a review card for ${selectedName}` : dialog === "summary" ? "Edit Luna’s working summary" : decision?.decision === "apply" ? "Apply this review?" : "Reject this review?"}</DialogTitle><DialogDescription>{dialog === "observation" ? "Write what actually happened. It will be saved as a note first, not treated as a fact." : dialog === "reflection" ? "Describe what you want Luna to think about. The result will be a suggestion card for you to review." : dialog === "summary" ? "This changes Luna’s current working summary only. It does not change her permanent Obsidian personality or canon." : decision?.decision === "apply" ? "Applying adds only the approved items in this card to Luna’s working state. It does not change permanent canon." : "Rejecting removes this suggestion card. Luna’s working state will stay exactly as it is."}</DialogDescription></DialogHeader>{dialog === "observation" ? <div className="space-y-3"><label className="block text-xs font-medium text-slate-200">What happened?</label><textarea value={observation} onChange={event => setObservation(event.target.value)} className="field min-h-28 w-full resize-y" placeholder="Example: Luna gave a clear, canon-consistent answer about Silo during a player conversation." /><label className="block text-xs font-medium text-slate-200">How important is it?</label><select value={importance} onChange={event => setImportance(Number(event.target.value))} className="field w-full"><option value={1}>1 — small detail</option><option value={2}>2 — somewhat useful</option><option value={3}>3 — useful</option><option value={4}>4 — important</option><option value={5}>5 — very important</option></select></div> : null}{dialog === "reflection" ? <div className="space-y-3"><label className="block text-xs font-medium text-slate-200">What would you like Luna to think about?</label><textarea value={reflectionText} onChange={event => setReflectionText(event.target.value)} className="field min-h-28 w-full resize-y" placeholder="Example: Think about how to keep a consistent long-term goal while staying true to Luna’s approved canon." /></div> : null}{dialog === "summary" ? <div className="space-y-3"><label className="block text-xs font-medium text-slate-200">Working summary</label><textarea value={summaryDraft} onChange={event => setSummaryDraft(event.target.value)} className="field min-h-32 w-full resize-y" /></div> : null}{dialog === "decision" ? <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-300">{decision?.summary}</div> : null}<DialogFooter><DialogClose className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">Cancel</DialogClose>{dialog === "observation" ? <button onClick={() => void saveObservation()} disabled={busyAction === "observation"} className="rounded-lg bg-amber-300 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50">Save note</button> : null}{dialog === "reflection" ? <button onClick={() => void createReflection()} disabled={busyAction === "reflection"} className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50">Create review card</button> : null}{dialog === "summary" ? <button onClick={() => void saveSummary()} disabled={busyAction === "summary"} className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50">Save summary</button> : null}{dialog === "decision" ? <button onClick={() => void resolveDecision()} disabled={busyAction === "decision"} className={`rounded-lg px-3 py-2 text-xs font-semibold ${decision?.decision === "apply" ? "bg-emerald-300 text-slate-950" : "bg-slate-200 text-slate-950"}`}>{decision?.decision === "apply" ? "Apply reviewed items" : "Reject review"}</button> : null}</DialogFooter></DialogContent></Dialog>
  </section>;
}

function GuideStep({ number, title, text }: { number: string; title: string; text: string }) { return <article className="rounded-xl border border-white/10 bg-black/10 p-3"><div className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded-full bg-cyan-300/15 text-[10px] font-semibold text-cyan-100">{number}</span><p className="text-xs font-semibold text-slate-200">{title}</p></div><p className="mt-2 text-[11px] leading-4 text-slate-500">{text}</p></article>; }

function ReviewCard({ reflection, onDecision }: { reflection: CognitiveReflection; onDecision: (decision: "apply" | "reject") => void }) {
  return <article className="rounded-xl border border-white/10 bg-black/10 p-3"><p className="text-xs leading-5 text-slate-300">{reflection.proposal.summary}</p>{reflection.proposal.needs?.length ? <div className="mt-2 space-y-1.5">{reflection.proposal.needs.map(need => <p key={need.title} className="text-[11px] leading-4 text-violet-100">Suggestion · {need.title}: <span className="text-slate-400">{need.rationale}</span></p>)}</div> : null}{reflection.proposal.goal ? <p className="mt-2 text-[11px] leading-4 text-cyan-100">Possible goal · {reflection.proposal.goal.title}: <span className="text-slate-400">{reflection.proposal.goal.details}</span></p> : null}{reflection.proposal.beliefRevision ? <p className="mt-2 text-[11px] leading-4 text-amber-100">Belief change · {reflection.proposal.beliefRevision.action}: <span className="text-slate-400">{reflection.proposal.beliefRevision.rationale}</span></p> : null}{reflection.proposal.memoryReinforcement ? <p className="mt-2 text-[11px] leading-4 text-emerald-100">Memory update: <span className="text-slate-400">{reflection.proposal.memoryReinforcement.rationale}</span></p> : null}<p className="mt-2 line-clamp-2 text-[11px] leading-4 text-slate-500">Based on: {reflection.experience}</p>{reflection.status === "proposed" ? <div className="mt-3 flex gap-2"><button onClick={() => onDecision("apply")} className="inline-flex items-center gap-1 rounded-md bg-emerald-300/15 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-100"><Check className="size-3" /> Apply</button><button onClick={() => onDecision("reject")} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-300"><X className="size-3" /> Reject</button></div> : <Badge className="mt-3 border border-white/10 bg-white/5 text-[10px] text-slate-400">{reflection.status}</Badge>}</article>;
}
