import { AIChatBox } from "@/components/AIChatBox";
import { useChatSessions } from "@/contexts/ChatSessionsContext";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  addWorkspaceMemory,
  createWorkspaceMemory,
  findRelevantMemories,
  getWorkspaceId,
  loadWorkspaceMemories,
  mergeWorkspaceMemories,
  persistWorkspaceMemories,
  type MemoryCategory,
  type WorkspaceMemory,
} from "@/lib/workspaceMemory";
import { BookOpenCheck, BrainCircuit, BrainCog, Check, ChevronDown, FilePenLine, Github, Layers3, Plus, Rocket, Search, Send, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const suggestedPrompts = [
  "Plan a production-ready React app for my idea.",
  "Review this coding task and propose the safest execution plan.",
  "Help me debug an error in my project.",
];

type CanonDraft = {
  npcId: string;
  displayName: string;
  path: string;
  noteContent: string;
  summary: string;
  sourceSha: string | null;
  excerptLength: number;
  conflicts: Array<{ severity: "warning" | "blocking"; existingClaim: string; proposedClaim: string; rationale: string }>;
};

type CanonTarget = { npcId: string; displayName: string; path: string };

export function canonRequestFromSelectedMessage(selectedRequest: string | undefined, existingDraftRequest: string, latestUserMessage: string) {
  return selectedRequest ?? (existingDraftRequest || latestUserMessage);
}

export default function Home() {
  const { activeSession, updateMessages } = useChatSessions();
  const [workspaceId] = useState(() => getWorkspaceId());
  const [memories, setMemories] = useState<WorkspaceMemory[]>(() => loadWorkspaceMemories());
  const [memoryDraft, setMemoryDraft] = useState("");
  const [memoryCategory, setMemoryCategory] = useState<MemoryCategory>("context");
  const [memoryImportance, setMemoryImportance] = useState(3);
  const [memorySearch, setMemorySearch] = useState("");
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [isCanonDialogOpen, setIsCanonDialogOpen] = useState(false);
  const [canonNpcId, setCanonNpcId] = useState("");
  const [canonDisplayName, setCanonDisplayName] = useState("");
  const [canonRequest, setCanonRequest] = useState("");
  const [selectedCanonTargets, setSelectedCanonTargets] = useState<CanonTarget[]>([]);
  const [canonDrafts, setCanonDrafts] = useState<CanonDraft[]>([]);
  const [activeCanonDraftNpcId, setActiveCanonDraftNpcId] = useState<string | null>(null);
  const latestCanonDrafts = useRef<CanonDraft[]>([]);
  const [canonDraftError, setCanonDraftError] = useState<string | null>(null);
  const [canonPublishedMessage, setCanonPublishedMessage] = useState<string | null>(null);
  const [canonConflictOverride, setCanonConflictOverride] = useState(false);
  const [isNpcAdminUnlocked, setIsNpcAdminUnlocked] = useState(false);
  const chat = trpc.agent.chat.useMutation();
  const { data: connections } = trpc.agent.connections.useQuery(undefined, { retry: false });
  const cloudMemory = trpc.agent.workspaceMemory.list.useQuery({ workspaceId }, { retry: false });
  const syncMemory = trpc.agent.workspaceMemory.sync.useMutation();
  const removeCloudMemory = trpc.agent.workspaceMemory.remove.useMutation();
  const canonTargets = trpc.agent.canon.targets.useQuery(undefined, { enabled: isNpcAdminUnlocked, retry: false });
  const createCanonDraft = trpc.agent.canon.draftBatch.useMutation();
  const validateCanonDraft = trpc.agent.canon.validate.useMutation();
  const publishCanonDraft = trpc.agent.canon.publish.useMutation();

  useEffect(() => {
    if (!cloudMemory.data?.available) return;
    setMemories((current) => {
      const next = mergeWorkspaceMemories(current, cloudMemory.data.memories.map((memory) => ({
        ...memory,
        category: memory.category as MemoryCategory,
      })));
      persistWorkspaceMemories(next);
      return next;
    });
  }, [cloudMemory.data]);

  useEffect(() => {
    fetch("/api/npc/admin/status", { credentials: "include" })
      .then((response) => response.json().catch(() => ({})))
      .then((status) => setIsNpcAdminUnlocked(Boolean(status.authenticated)))
      .catch(() => setIsNpcAdminUnlocked(false));
  }, []);

  const shownMemories = useMemo(() => {
    const query = memorySearch.trim();
    if (!query) return memories.slice(0, 5);
    return memories.filter((memory) => `${memory.category} ${memory.content}`.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
  }, [memories, memorySearch]);

  const draftTargets = useMemo(() => {
    const next = [...selectedCanonTargets];
    if (canonNpcId.trim() || canonDisplayName.trim()) {
      if (canonNpcId.trim() && canonDisplayName.trim()) next.push({ npcId: canonNpcId.trim().toLowerCase(), displayName: canonDisplayName.trim(), path: `NPCs/${canonNpcId.trim().toLowerCase()}.md` });
    }
    return Array.from(new Map(next.map(target => [target.npcId.toLowerCase(), target])).values());
  }, [canonDisplayName, canonNpcId, selectedCanonTargets]);

  const canonDraft = canonDrafts.find(draft => draft.npcId === activeCanonDraftNpcId) ?? canonDrafts[0] ?? null;

  const sendMessage = (content: string) => {
    const sessionId = activeSession.id;
    const nextMessages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...activeSession.messages.filter((message): message is { role: "user" | "assistant"; content: string } => message.role !== "system"),
      { role: "user", content },
    ];
    updateMessages(sessionId, nextMessages);
    const recalledMemory = findRelevantMemories(memories, content);
    chat.mutate({ messages: nextMessages, memory: recalledMemory }, {
      onSuccess: response => {
        updateMessages(sessionId, [...nextMessages, {
          role: "assistant",
          content: response.content || "I completed the reasoning pass but did not receive a displayable response. Please try again.",
        }]);
      },
    });
  };

  const addMemory = () => {
    try {
      const nextMemory = createWorkspaceMemory({ category: memoryCategory, content: memoryDraft, importance: memoryImportance });
      setMemories((current) => {
        const next = addWorkspaceMemory(current, nextMemory);
        persistWorkspaceMemories(next);
        return next;
      });
      syncMemory.mutate({ workspaceId, memory: nextMemory });
      setMemoryDraft("");
      setMemoryError(null);
      setIsAddingMemory(false);
    } catch (error) {
      setMemoryError(error instanceof Error ? error.message : "Unable to save memory.");
    }
  };

  const removeMemory = (memoryId: string) => {
    setMemories((current) => {
      const next = current.filter((memory) => memory.id !== memoryId);
      persistWorkspaceMemories(next);
      return next;
    });
    removeCloudMemory.mutate({ workspaceId, memoryId });
  };

  const openCanonDraft = (selectedRequest?: string) => {
    const latestUserMessage = [...activeSession.messages].reverse().find((message) => message.role === "user")?.content ?? "";
    setCanonRequest(canonRequestFromSelectedMessage(selectedRequest, canonRequest, latestUserMessage));
    latestCanonDrafts.current = [];
    setCanonDrafts([]);
    setActiveCanonDraftNpcId(null);
    setSelectedCanonTargets([]);
    setCanonNpcId("");
    setCanonDisplayName("");
    setCanonDraftError(null);
    setCanonPublishedMessage(null);
    setCanonConflictOverride(false);
    setIsCanonDialogOpen(true);
  };

  const generateCanonDraft = () => {
    if (!draftTargets.length) { setCanonDraftError("Select an existing NPC, or provide both a new NPC ID and display name."); return; }
    if ((canonNpcId.trim() || canonDisplayName.trim()) && !(canonNpcId.trim() && canonDisplayName.trim())) { setCanonDraftError("A new NPC target needs both an ID and a display name."); return; }
    setCanonDraftError(null);
    createCanonDraft.mutate({ targets: draftTargets.map(({ npcId, displayName }) => ({ npcId, displayName })), request: canonRequest }, {
      onSuccess: ({ drafts }) => { latestCanonDrafts.current = drafts; setCanonDrafts(drafts); setActiveCanonDraftNpcId(drafts[0]?.npcId ?? null); setCanonConflictOverride(false); },
      onError: (error) => setCanonDraftError(error.message),
    });
  };

  const publishCanon = () => {
    const latestDraft = latestCanonDrafts.current.find(draft => draft.npcId === activeCanonDraftNpcId) ?? latestCanonDrafts.current[0] ?? canonDraft;
    if (!latestDraft) return;
    setCanonDraftError(null);
    const approvedDraft = {
      npcId: latestDraft.npcId,
      displayName: latestDraft.displayName,
      noteContent: latestDraft.noteContent,
      sourceSha: latestDraft.sourceSha,
      conflictOverride: canonConflictOverride,
    };
    validateCanonDraft.mutate(approvedDraft, {
      onSuccess: () => publishCanonDraft.mutate(approvedDraft, {
        onSuccess: (result) => { setCanonPublishedMessage(`Published ${result.path}. ${result.sync}`); void canonTargets.refetch(); },
        onError: (error) => setCanonDraftError(error.message),
      }),
      onError: (error) => setCanonDraftError(`This note is not ready to publish: ${error.message} Add a meaningful Runtime excerpt or canon section, then try confirmation again.`),
    });
  };

  return (
    <div className="senota-page mx-auto flex w-full max-w-6xl flex-col gap-5">
      <section className="senota-hero-grid relative overflow-hidden rounded-[1.75rem] border border-cyan-300/15 bg-card/70 px-6 py-7 sm:px-8">
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300"><Sparkles className="size-4" /> SenotaAI / Direct chat</div>
            <h1 className="font-display text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">Talk directly to your<br /><span className="text-white/45">software agent.</span></h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Ask for architecture, code, debugging, or an execution plan. SenotaAI will keep destructive and deployment actions in confirmation mode by default.</p>
          </div>
          <Badge className="w-fit border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-cyan-100">No sign-in required</Badge>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_250px]">
        <div className="min-w-0">
          <AIChatBox
            messages={activeSession.messages}
            onSendMessage={sendMessage}
            isLoading={chat.isPending}
            height="min(66vh, 680px)"
            placeholder="Ask SenotaAI to plan, code, or debug..."
            emptyStateMessage="Start a direct conversation with SenotaAI."
            suggestedPrompts={suggestedPrompts}
            onSelectMessageForCanon={(message) => openCanonDraft(message.content)}
          />
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-violet-300/15 bg-violet-300/[0.035] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5"><div className="mt-0.5 grid size-8 place-items-center rounded-lg bg-violet-300/10 text-violet-200"><BookOpenCheck className="size-4" /></div><div><p className="text-sm font-medium text-violet-100">Turn a chat idea into NPC canon</p><p className="mt-0.5 text-xs leading-5 text-slate-500">SenotaAI drafts a private Obsidian note; you can edit, approve, or discard it before anything is published.</p></div></div>
            <button onClick={() => openCanonDraft()} disabled={!isNpcAdminUnlocked} title={isNpcAdminUnlocked ? "Create a reviewable canon draft" : "Unlock NPC management first"} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-violet-300/25 bg-violet-300/10 px-3 py-2 text-xs font-semibold text-violet-100 transition hover:bg-violet-300/20 disabled:cursor-not-allowed disabled:opacity-45"><FilePenLine className="size-3.5" /> {isNpcAdminUnlocked ? "Draft NPC canon" : "Unlock NPC management first"}</button>
          </div>
          {chat.error ? <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{chat.error.message}</p> : null}
        </div>
        <aside className="space-y-3">
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Agent readiness</p>
          <Readiness label="Reasoning brain" active={Boolean(connections?.ollamaConfigured)} icon={BrainCircuit} />
          <Readiness label="GitHub workspace" active={Boolean(connections?.githubConfigured)} icon={Github} />
          <Readiness label="Vercel deploys" active={Boolean(connections?.vercelConfigured)} icon={Rocket} />
          <Readiness label="NPC cloud memory" active={Boolean(connections?.npcMemoryConfigured)} icon={BrainCog} />
          <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.03] p-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="flex items-center gap-2 text-sm font-medium text-cyan-100"><BrainCog className="size-4" /> Memory vault</p><p className="mt-1 text-xs leading-5 text-slate-500">Browser-owned context, recalled for chat.</p></div>
              <Badge className="border border-cyan-300/20 bg-transparent text-[10px] text-cyan-200">{memories.length}/60</Badge>
            </div>
            <p className={`mt-3 text-[11px] ${cloudMemory.data?.available ? "text-emerald-300" : "text-slate-500"}`}>{cloudMemory.data?.available ? "Cloud sync active for this workspace" : "Device-only mode — cloud sync is unavailable"}</p>
            <div className="mt-3 flex gap-2">
              <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-slate-500" /><input value={memorySearch} onChange={(event) => setMemorySearch(event.target.value)} className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-8 pr-2 text-xs text-slate-200 outline-none transition focus:border-cyan-300/50" placeholder="Search memory" /></div>
              <button onClick={() => setIsAddingMemory((open) => !open)} className="grid size-8 place-items-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-200 transition hover:bg-cyan-300/20" aria-label="Add memory"><Plus className="size-4" /></button>
            </div>
            {isAddingMemory ? <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-black/20 p-3"><textarea value={memoryDraft} onChange={(event) => setMemoryDraft(event.target.value)} className="min-h-20 w-full resize-y rounded-md border border-white/10 bg-transparent p-2 text-xs text-slate-200 outline-none focus:border-cyan-300/50" placeholder="Save a project fact, preference, or decision..." /><div className="grid grid-cols-[1fr_auto] gap-2"><select value={memoryCategory} onChange={(event) => setMemoryCategory(event.target.value as MemoryCategory)} className="rounded-md border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-slate-300"><option value="context">Context</option><option value="project">Project</option><option value="preference">Preference</option><option value="decision">Decision</option></select><select value={memoryImportance} onChange={(event) => setMemoryImportance(Number(event.target.value))} className="rounded-md border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-slate-300"><option value={2}>Low</option><option value={3}>Normal</option><option value={5}>High</option></select></div>{memoryError ? <p className="text-[11px] leading-4 text-red-300">{memoryError}</p> : null}<button onClick={addMemory} className="w-full rounded-md bg-cyan-300 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-200">Save to memory</button></div> : null}
            <div className="mt-3 space-y-2">{shownMemories.length ? shownMemories.map((memory) => <div key={memory.id} className="group rounded-lg border border-white/8 bg-black/10 p-2.5"><div className="flex items-start justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-300/80">{memory.category}</p><button onClick={() => removeMemory(memory.id)} className="text-slate-600 opacity-100 transition hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100" aria-label={`Delete ${memory.category} memory`}><Trash2 className="size-3.5" /></button></div><p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-400">{memory.content}</p></div>) : <p className="py-2 text-xs leading-5 text-slate-500">Save durable preferences, decisions, or project facts. Passwords and API keys are blocked.</p>}</div>
          </div>
          <p className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-xs leading-5 text-slate-500">Saved context stays browser-owned. If a project database is configured, SenotaAI synchronizes the same workspace vault; passwords and API keys are blocked in both modes.</p>
        </aside>
      </section>
      <Dialog open={isCanonDialogOpen} onOpenChange={setIsCanonDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-violet-300/20 bg-slate-950 text-slate-100 sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-white"><BookOpenCheck className="size-5 text-violet-200" /> Draft NPC canon for review</DialogTitle>
            <DialogDescription className="leading-6 text-slate-400">Nothing is sent to Obsidian or GitHub while you are drafting. A publish occurs only after you review the summary and click the final confirmation button.</DialogDescription>
          </DialogHeader>
          {!canonDraft ? <div className="space-y-4 py-2">
            <div className="rounded-xl border border-violet-300/15 bg-violet-300/[0.035] p-4"><div className="flex items-start gap-2"><Layers3 className="mt-0.5 size-4 text-violet-200" /><div><p className="text-sm font-medium text-violet-100">Existing NPC targets</p><p className="mt-1 text-xs leading-5 text-slate-500">Select one or more established NPC ID and name pairs. A draft is prepared for every selected target.</p></div></div><details className="mt-3 rounded-lg border border-white/10 bg-black/15"><summary className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-xs font-medium text-slate-200">{selectedCanonTargets.length ? `${selectedCanonTargets.length} existing NPC${selectedCanonTargets.length === 1 ? "" : "s"} selected` : "Choose existing NPCs"}<ChevronDown className="size-4 text-slate-500" /></summary><div className="max-h-44 space-y-1 overflow-y-auto border-t border-white/10 p-2">{canonTargets.isLoading ? <p className="p-2 text-xs text-slate-500">Loading private canon targets…</p> : canonTargets.data?.targets?.length ? canonTargets.data.targets.map(target => { const selected = selectedCanonTargets.some(item => item.npcId === target.npcId); return <label key={target.npcId} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs text-slate-300 hover:bg-white/5"><input type="checkbox" checked={selected} onChange={() => setSelectedCanonTargets(current => selected ? current.filter(item => item.npcId !== target.npcId) : [...current, target])} /><span className="min-w-0"><span className="font-medium text-slate-100">{target.displayName}</span><span className="ml-2 font-mono text-violet-200/80">{target.npcId}</span></span></label>; }) : <p className="p-2 text-xs text-slate-500">No existing NPC notes are available yet.</p>}</div></details>{selectedCanonTargets.length ? <div className="mt-3 flex flex-wrap gap-1.5">{selectedCanonTargets.map(target => <Badge key={target.npcId} className="gap-1 border border-violet-300/20 bg-violet-300/10 text-violet-100">{target.displayName} <span className="font-mono opacity-70">{target.npcId}</span><button onClick={() => setSelectedCanonTargets(current => current.filter(item => item.npcId !== target.npcId))} className="ml-0.5 rounded p-0.5 hover:bg-white/10" aria-label={`Remove ${target.displayName}`}><X className="size-3" /></button></Badge>)}</div> : null}</div>
            <div className="rounded-xl border border-white/10 bg-black/15 p-4"><p className="text-sm font-medium text-slate-200">Add a new NPC target</p><p className="mt-1 text-xs leading-5 text-slate-500">Optional. Typing a new ID and display name creates a new note when you approve it; that NPC will appear in this selector afterward.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-xs font-medium text-slate-300">NPC ID<input list="existing-npc-ids" value={canonNpcId} onChange={(event) => { const value = event.target.value; setCanonNpcId(value); const matched = canonTargets.data?.targets.find(target => target.npcId === value); if (matched) setCanonDisplayName(matched.displayName); }} placeholder="new-npc-id" className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-violet-300/60" /></label><label className="space-y-1.5 text-xs font-medium text-slate-300">NPC display name<input list="existing-npc-names" value={canonDisplayName} onChange={(event) => { const value = event.target.value; setCanonDisplayName(value); const matched = canonTargets.data?.targets.find(target => target.displayName.toLowerCase() === value.toLowerCase()); if (matched) setCanonNpcId(matched.npcId); }} placeholder="New NPC" className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-violet-300/60" /></label></div><datalist id="existing-npc-ids">{canonTargets.data?.targets.map(target => <option key={target.npcId} value={target.npcId}>{target.displayName}</option>)}</datalist><datalist id="existing-npc-names">{canonTargets.data?.targets.map(target => <option key={target.npcId} value={target.displayName}>{target.npcId}</option>)}</datalist></div>
            <label className="block space-y-1.5 text-xs font-medium text-slate-300">What should be permanent NPC canon?<textarea value={canonRequest} onChange={(event) => setCanonRequest(event.target.value)} placeholder="Describe the lore, personality, relationship, place, or dialogue boundary you want added..." className="min-h-36 w-full resize-y rounded-lg border border-white/10 bg-black/25 p-3 text-sm leading-6 text-white outline-none focus:border-violet-300/60" /></label>
            <p className="rounded-lg border border-amber-300/15 bg-amber-300/[0.04] px-3 py-2 text-xs leading-5 text-amber-100/90">Only permanent NPC lore belongs here. Player histories, secrets, tokens, passwords, and raw conversation transcripts are blocked.</p>
          </div> : <div className="space-y-4 py-2">
            {canonDrafts.length > 1 ? <div className="flex flex-wrap gap-1.5">{canonDrafts.map(draft => <button key={draft.npcId} onClick={() => { setActiveCanonDraftNpcId(draft.npcId); setCanonConflictOverride(false); setCanonPublishedMessage(null); }} className={`rounded-lg border px-2.5 py-1.5 text-xs ${canonDraft.npcId === draft.npcId ? "border-violet-300/35 bg-violet-300/15 text-violet-100" : "border-white/10 text-slate-400 hover:bg-white/5"}`}>{draft.displayName} <span className="font-mono opacity-70">{draft.npcId}</span></button>)}</div> : null}
            <div className="rounded-xl border border-violet-300/20 bg-violet-300/[0.06] p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200">SenotaAI’s summary of this proposed change</p><p className="mt-2 text-sm leading-6 text-slate-200">{canonDraft.summary}</p><p className="mt-3 text-xs text-slate-500">Target: <span className="font-mono text-violet-200">{canonDraft.path}</span> · Runtime excerpt: {canonDraft.excerptLength.toLocaleString()} characters</p></div>
            <label className="block space-y-1.5 text-xs font-medium text-slate-300">Review and edit the complete Obsidian note<textarea value={canonDraft.noteContent} onChange={(event) => { const nextDrafts = latestCanonDrafts.current.map(draft => draft.npcId === canonDraft.npcId ? { ...draft, noteContent: event.target.value } : draft); latestCanonDrafts.current = nextDrafts; setCanonDrafts(nextDrafts); }} className="min-h-80 w-full resize-y rounded-lg border border-white/10 bg-black/25 p-3 font-mono text-xs leading-5 text-slate-200 outline-none focus:border-violet-300/60" /></label>
            {canonDraft.conflicts?.length ? <div className="space-y-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">Canon conflict review</p><p className="text-xs leading-5 text-amber-100/80">SenotaAI found potential factual contradictions against the current private canon. Review them before publishing. An approved blocking revision removes only the exact conflicting existing claim, then adds the approved replacement; unrelated canon remains unchanged.</p>{canonDraft.conflicts.map((conflict, index) => <div key={`${conflict.existingClaim}-${index}`} className="rounded-lg border border-amber-300/15 bg-black/15 p-3 text-xs leading-5 text-slate-300"><p><span className={`font-semibold ${conflict.severity === "blocking" ? "text-red-200" : "text-amber-100"}`}>{conflict.severity === "blocking" ? "Blocking" : "Warning"}</span> · {conflict.rationale}</p><p className="mt-2 text-slate-400">Will remove: “{conflict.existingClaim}”</p><p className="text-slate-200">Will add: “{conflict.proposedClaim}”</p></div>)}{canonDraft.conflicts.some(conflict => conflict.severity === "blocking") ? <label className="flex items-start gap-2 rounded-lg border border-red-300/20 bg-red-300/[0.05] p-3 text-xs leading-5 text-red-100"><input type="checkbox" checked={canonConflictOverride} onChange={event => setCanonConflictOverride(event.target.checked)} className="mt-1" />I reviewed these contradictions and intentionally approve this precise claim replacement.</label> : null}</div> : <p className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.04] px-3 py-2 text-xs leading-5 text-emerald-100/90">No direct canon conflicts were found in this draft.</p>}
            <p className="rounded-lg border border-violet-300/15 bg-violet-300/[0.04] px-3 py-2 text-xs leading-5 text-violet-100/90">Before publishing, SenotaAI checks that the note keeps its frontmatter and has a meaningful <code>## Runtime excerpt</code> or canon body. If validation fails, no GitHub write is attempted.</p>
          </div>}
          {canonDraftError ? <p className="rounded-lg border border-red-300/20 bg-red-300/[0.06] px-3 py-2 text-sm text-red-200">{canonDraftError}</p> : null}
          {canonPublishedMessage ? <p className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-2 text-sm leading-6 text-emerald-100">{canonPublishedMessage}</p> : null}
          <DialogFooter className="gap-2 sm:gap-0">
            {!canonPublishedMessage ? <button onClick={() => setIsCanonDialogOpen(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5">Discard</button> : <button onClick={() => setIsCanonDialogOpen(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5">Close</button>}
            {!canonDraft ? <button onClick={generateCanonDraft} disabled={!draftTargets.length || !canonRequest.trim() || createCanonDraft.isPending} className="inline-flex items-center gap-2 rounded-lg bg-violet-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-violet-200 disabled:opacity-50"><Sparkles className="size-4" />{createCanonDraft.isPending ? "Drafting…" : `Generate ${draftTargets.length || ""} review draft${draftTargets.length === 1 ? "" : "s"}`}</button> : !canonPublishedMessage ? <div className="flex gap-2"><button onClick={() => { latestCanonDrafts.current = []; setCanonDrafts([]); setActiveCanonDraftNpcId(null); }} disabled={validateCanonDraft.isPending || publishCanonDraft.isPending} className="rounded-lg border border-violet-300/20 px-4 py-2 text-sm text-violet-100 transition hover:bg-violet-300/10">Revise request</button><button onClick={publishCanon} disabled={validateCanonDraft.isPending || publishCanonDraft.isPending || (canonDraft.conflicts?.some(conflict => conflict.severity === "blocking") && !canonConflictOverride)} className="inline-flex items-center gap-2 rounded-lg bg-violet-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-violet-200 disabled:opacity-50"><Send className="size-4" />{validateCanonDraft.isPending ? "Checking note…" : publishCanonDraft.isPending ? "Publishing…" : canonDraft.conflicts?.some(conflict => conflict.severity === "blocking") && !canonConflictOverride ? "Review conflict override" : "Confirm and send to NPC canon"}</button></div> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Readiness({ label, active, icon: Icon }: { label: string; active: boolean; icon: typeof BrainCircuit }) {
  return <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-card/60 p-4"><div className={`grid size-9 place-items-center rounded-lg ${active ? "bg-emerald-300/10 text-emerald-300" : "bg-white/5 text-slate-500"}`}><Icon className="size-4" /></div><div><p className="text-sm font-medium text-slate-200">{label}</p><p className="mt-1 text-xs text-slate-500">{active ? "Ready" : "Unavailable"}</p></div></div>;
}
