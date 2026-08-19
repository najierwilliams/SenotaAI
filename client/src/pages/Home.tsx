import { AIChatBox } from "@/components/AIChatBox";
import { useChatSessions } from "@/contexts/ChatSessionsContext";
import { Badge } from "@/components/ui/badge";
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
import { BrainCircuit, BrainCog, Github, Plus, Rocket, Search, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const suggestedPrompts = [
  "Plan a production-ready React app for my idea.",
  "Review this coding task and propose the safest execution plan.",
  "Help me debug an error in my project.",
];

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
  const chat = trpc.agent.chat.useMutation();
  const { data: connections } = trpc.agent.connections.useQuery(undefined, { retry: false });
  const cloudMemory = trpc.agent.workspaceMemory.list.useQuery({ workspaceId }, { retry: false });
  const syncMemory = trpc.agent.workspaceMemory.sync.useMutation();
  const removeCloudMemory = trpc.agent.workspaceMemory.remove.useMutation();

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

  const shownMemories = useMemo(() => {
    const query = memorySearch.trim();
    if (!query) return memories.slice(0, 5);
    return memories.filter((memory) => `${memory.category} ${memory.content}`.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
  }, [memories, memorySearch]);

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
          />
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
    </div>
  );
}

function Readiness({ label, active, icon: Icon }: { label: string; active: boolean; icon: typeof BrainCircuit }) {
  return <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-card/60 p-4"><div className={`grid size-9 place-items-center rounded-lg ${active ? "bg-emerald-300/10 text-emerald-300" : "bg-white/5 text-slate-500"}`}><Icon className="size-4" /></div><div><p className="text-sm font-medium text-slate-200">{label}</p><p className="mt-1 text-xs text-slate-500">{active ? "Ready" : "Unavailable"}</p></div></div>;
}
