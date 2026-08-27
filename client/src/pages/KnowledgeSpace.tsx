import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  formatKnowledgeObjectType,
  formatKnowledgeTruthState,
  type KnowledgeObject,
  type KnowledgeObjectType,
  type KnowledgeAutonomyLevel,
  type KnowledgeTruthState,
  type KnowledgeWorkerRole,
} from "@shared/knowledgeSpace";
import {
  Activity,
  Archive,
  ArrowUpRight,
  BookOpen,
  Bot,
  Brain,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Database,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  GitFork,
  HeartPulse,
  Info,
  Link2,
  Loader2,
  Network,
  PauseCircle,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const truthTone: Record<KnowledgeTruthState, string> = {
  VERIFIED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  PROVIDER_CONFIRMED: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  USER_APPROVED: "border-indigo-400/30 bg-indigo-400/10 text-indigo-100",
  PROBABILISTIC: "border-violet-400/30 bg-violet-400/10 text-violet-100",
  INFERRED: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  PROPOSED: "border-slate-500/30 bg-slate-400/10 text-slate-200",
  REQUIRES_REVIEW: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  CONTRADICTED: "border-rose-400/30 bg-rose-400/10 text-rose-100",
  UNMAPPED: "border-orange-400/30 bg-orange-400/10 text-orange-100",
  NOT_ESTABLISHED: "border-rose-400/30 bg-rose-400/10 text-rose-100",
  UNAVAILABLE: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

const objectIcons: Partial<Record<KnowledgeObjectType, typeof FileText>> = {
  FOLDER: Folder,
  SCIENTIFIC_STRUCTURE: Brain,
  SCIENTIFIC_REGION: Brain,
  DATASET: Database,
  RESEARCH_QUESTION: CircleDot,
  NANOBOT_MISSION: Bot,
  NANOBOT_REPORT: ClipboardList,
  REFERENCE: BookOpen,
  HYPOTHESIS: Sparkles,
  EVIDENCE_RECORD: ShieldCheck,
};

const creationTypes: KnowledgeObjectType[] = [
  "NOTE", "DOCUMENT", "RESEARCH_QUESTION", "HYPOTHESIS", "DATASET", "OBSERVATION", "FOLDER", "TASK",
];

const workerRoles: KnowledgeWorkerRole[] = ["RESEARCHER", "VALIDATOR", "ORGANIZER", "LINKER", "DATA_ANALYST", "PROVENANCE_AGENT"];

function ObjectIcon({ type, className = "size-4" }: { type: KnowledgeObjectType; className?: string }) {
  const Icon = objectIcons[type] ?? FileText;
  return <Icon className={className} />;
}

function TruthBadge({ state }: { state: KnowledgeTruthState }) {
  return <Badge variant="outline" className={`border px-1.5 py-0 text-[9px] font-semibold tracking-[0.08em] ${truthTone[state]}`}>{formatKnowledgeTruthState(state)}</Badge>;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString();
}

export default function KnowledgeSpace() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"workspace" | "graph" | "activity">("workspace");
  const [query, setQuery] = useState("");
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [missionDialogOpen, setMissionDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [relationshipDialogOpen, setRelationshipDialogOpen] = useState(false);
  const [referenceDialogOpen, setReferenceDialogOpen] = useState(false);
  const ownerStatus = trpc.knowledge.owner.status.useQuery(undefined, { retry: false });
  const ownerUnlock = trpc.knowledge.owner.unlock.useMutation({
    onSuccess: async () => {
      toast.success("Knowledge Space unlocked for this private session.");
      await utils.knowledge.owner.status.invalidate();
      await utils.knowledge.snapshot.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const ownerAuthenticated = ownerStatus.data?.authenticated === true;
  const snapshot = trpc.knowledge.snapshot.useQuery(undefined, { enabled: ownerAuthenticated, retry: false });
  const status = trpc.knowledge.status.useQuery(undefined, { retry: false });
  const search = trpc.knowledge.search.useQuery({ query }, { enabled: ownerAuthenticated && query.trim().length >= 2, retry: false });
  const graph = trpc.knowledge.relationship.graph.useQuery(
    { focusObjectId: selectedId ?? undefined },
    { enabled: ownerAuthenticated && activePanel === "graph" && Boolean(selectedId), retry: false },
  );
  const audit = trpc.knowledge.audit.useQuery(
    { limit: 100 },
    { enabled: ownerAuthenticated && activePanel === "activity", retry: false },
  );
  const createObject = trpc.knowledge.object.create.useMutation({
    onSuccess: async (object) => {
      toast.success("Knowledge object created.");
      setSelectedId(object.id);
      setNewDialogOpen(false);
      await utils.knowledge.snapshot.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const updateObject = trpc.knowledge.object.update.useMutation({
    onSuccess: async (object) => {
      toast.success("Version saved to the audit trail.");
      setSelectedId(object.id);
      setEditing(false);
      await utils.knowledge.snapshot.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const createRelationship = trpc.knowledge.relationship.create.useMutation({
    onSuccess: async () => { toast.success("Knowledge relationship created as a proposed link."); setRelationshipDialogOpen(false); await utils.knowledge.snapshot.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const createReference = trpc.knowledge.object.reference.useMutation({
    onSuccess: async () => { toast.success("Folder reference added without duplicating the object."); setReferenceDialogOpen(false); await utils.knowledge.snapshot.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const trashObject = trpc.knowledge.object.trash.useMutation({
    onSuccess: async () => {
      toast.success("Moved to trash. It remains restorable.");
      setSelectedId(null);
      await utils.knowledge.snapshot.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const runMission = trpc.knowledge.mission.run.useMutation({
    onSuccess: async () => {
      toast.success("Knowledge worker completed an inferred report.");
      await utils.knowledge.snapshot.invalidate();
    },
    onError: async (error) => {
      toast.error(error.message);
      await utils.knowledge.snapshot.invalidate();
    },
  });
  const stopMission = trpc.knowledge.mission.stop.useMutation({
    onSuccess: async () => { toast.success("Mission stopped."); await utils.knowledge.snapshot.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const stopAllMissions = trpc.knowledge.mission.stopAll.useMutation({
    onSuccess: async ({ stopped }) => { toast.success(stopped ? `${stopped} mission${stopped === 1 ? "" : "s"} stopped.` : "No active missions to stop."); await utils.knowledge.snapshot.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const clearMissionQueue = trpc.knowledge.mission.clearQueue.useMutation({
    onSuccess: async ({ stopped }) => { toast.success(stopped ? `${stopped} queued mission${stopped === 1 ? "" : "s"} cleared.` : "The mission queue is already clear."); await utils.knowledge.snapshot.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const createMission = trpc.knowledge.mission.create.useMutation({
    onSuccess: async (mission) => {
      toast.success("Knowledge worker dispatched.");
      setMissionDialogOpen(false);
      await utils.knowledge.snapshot.invalidate();
      runMission.mutate({ missionId: mission.id });
    },
    onError: (error) => toast.error(error.message),
  });
  const updateAutonomy = trpc.knowledge.autonomy.update.useMutation({
    onSuccess: async (workspace) => {
      toast.success(workspace.autonomyPaused ? "Knowledge worker queue paused." : "Knowledge worker queue resumed.");
      await utils.knowledge.snapshot.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const objects = snapshot.data?.objects ?? [];
  const placements = snapshot.data?.placements ?? [];
  const selected = objects.find((object) => object.id === selectedId) ?? null;
  const folders = useMemo(() => objects.filter((object) => object.objectType === "FOLDER" && object.status !== "TRASHED"), [objects]);
  const objectById = useMemo(() => new Map(objects.map((object) => [object.id, object])), [objects]);
  const itemsByFolder = useMemo(() => {
    const result = new Map<string, KnowledgeObject[]>();
    placements.forEach((placement) => {
      if (!placement.parentObjectId) return;
      const object = objectById.get(placement.objectId);
      if (!object || object.status === "TRASHED") return;
      const current = result.get(placement.parentObjectId) ?? [];
      if (!current.some((item) => item.id === object.id)) current.push(object);
      result.set(placement.parentObjectId, current);
    });
    return result;
  }, [objectById, placements]);
  const unfiled = useMemo(() => objects.filter((object) => object.objectType !== "FOLDER" && object.status !== "TRASHED" && !placements.some((placement) => placement.objectId === object.id && placement.placementKind === "PRIMARY")), [objects, placements]);
  const searchResults = query.trim().length >= 2 ? (search.data ?? []) : [];

  useEffect(() => {
    if (!selectedId && objects.length) {
      const primary = objects.find((object) => object.objectType === "SCIENTIFIC_STRUCTURE") ?? objects.find((object) => object.objectType !== "FOLDER");
      setSelectedId(primary?.id ?? null);
    }
  }, [objects, selectedId]);

  if (ownerStatus.isLoading) return <KnowledgeLoading />;
  if (!ownerAuthenticated) return <KnowledgeOwnerUnlock configured={ownerStatus.data?.configured ?? false} error={ownerStatus.error?.message} pending={ownerUnlock.isPending} onUnlock={(password) => ownerUnlock.mutate({ password })} />;
  if (snapshot.isLoading || status.isLoading) return <KnowledgeLoading />;
  if (snapshot.error || status.error || !snapshot.data || !status.data?.cloudReady) {
    return <KnowledgeUnavailable error={snapshot.error?.message ?? status.error?.message} />;
  }

  const { workspace, health, relationships, missions, activity, approvals } = snapshot.data;
  const childrenOf = (folderId: string) => (itemsByFolder.get(folderId) ?? []).filter((item) => item.id !== folderId).slice(0, 80);

  return (
    <div className="senota-page space-y-4 pb-4">
      <section className="relative overflow-hidden rounded-[1.7rem] border border-cyan-300/15 bg-card/80 px-5 py-5 shadow-2xl shadow-cyan-950/10 sm:px-7">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(103,232,249,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,.08)_1px,transparent_1px)] [background-size:30px_30px]" />
        <div className="relative flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300"><Network className="size-3.5" /> Luna / Knowledge Space</div>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">A durable map of what Luna knows.</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Objects, scientific context, questions, reports, and working relationships live in a server-backed workspace. Evidence status remains visible rather than implied.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">Server-backed Supabase</Badge>
            <Badge variant="outline" className="border-violet-400/25 bg-violet-400/10 text-violet-100">{workspace.autonomyLevel.replace(/_/g, " ")}</Badge>
            <Button size="sm" onClick={() => setMissionDialogOpen(true)} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Bot className="mr-2 size-4" />New research mission</Button>
          </div>
        </div>
      </section>

      <section className="grid gap-2 rounded-2xl border border-white/10 bg-card/60 p-2 sm:flex sm:items-center">
        {([
          ["workspace", FolderOpen, "Workspace"],
          ["graph", GitFork, "Knowledge graph"],
          ["activity", Activity, "Activity"],
        ] as const).map(([panel, Icon, label]) => <Button key={panel} variant="ghost" size="sm" onClick={() => setActivePanel(panel)} className={`justify-start rounded-xl ${activePanel === panel ? "bg-cyan-300/10 text-cyan-100" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"}`}><Icon className="mr-2 size-4" />{label}</Button>)}
        <div className="hidden flex-1 sm:block" />
        <div className="relative min-w-0 sm:w-72"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search objects and notes" className="border-white/10 bg-slate-950/40 pl-9 text-slate-100 placeholder:text-slate-600" /></div>
        <Button size="sm" variant="outline" onClick={() => setNewDialogOpen(true)} className="border-white/10 bg-white/5 text-slate-100 hover:bg-cyan-300/10 hover:text-cyan-100"><Plus className="mr-2 size-4" />New object</Button>
      </section>

      {query.trim().length >= 2 ? <SearchResults results={searchResults} onSelect={(id) => { setSelectedId(id); setQuery(""); setActivePanel("workspace"); }} /> : null}

      {activePanel === "workspace" ? (
        <div className="grid min-h-[640px] gap-3 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
          <aside className="rounded-2xl border border-white/10 bg-card/70 p-3">
            <div className="mb-3 flex items-center justify-between px-1"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Hierarchy</p><p className="mt-1 text-xs text-slate-400">Folders hold references, not duplicates.</p></div><Folder className="size-4 text-cyan-300" /></div>
            <div className="space-y-1">
              {folders.map((folder) => <FolderBranch key={folder.id} folder={folder} children={childrenOf(folder.id)} selectedId={selectedId} onSelect={setSelectedId} />)}
              {unfiled.length ? <div className="mt-3 border-t border-white/10 pt-3"><p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Unfiled</p>{unfiled.map((object) => <TreeItem key={object.id} object={object} selectedId={selectedId} onSelect={setSelectedId} />)}</div> : null}
            </div>
            <div className="mt-5 rounded-xl border border-violet-400/15 bg-violet-400/5 p-3"><div className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-violet-300" /><p className="text-xs leading-5 text-slate-400">Provider snapshots are immutable. Create notes, links, questions, and proposals around them without overwriting their source evidence.</p></div></div>
          </aside>

          <main className="min-w-0 rounded-2xl border border-white/10 bg-card/70">
            {selected ? <ObjectDetail object={selected} folders={folders} placements={placements} objects={objects} relationships={relationships} editing={editing} onEditing={setEditing} onSave={(input) => updateObject.mutate({ objectId: selected.id, reason: "Edited in Knowledge Space", ...input })} onTrash={() => trashObject.mutate({ objectId: selected.id })} onOpenBrain={() => setLocation("/luna/brain")} onLink={() => setRelationshipDialogOpen(true)} onReference={() => setReferenceDialogOpen(true)} isSaving={updateObject.isPending} /> : <EmptyDetail onCreate={() => setNewDialogOpen(true)} />}
          </main>

          <aside className="space-y-3">
            <HealthCard health={health} />
            <SafetyCard onOpenBrain={() => setLocation("/luna/brain")} />
            <AutonomyPanel level={workspace.autonomyLevel} paused={workspace.autonomyPaused} pending={updateAutonomy.isPending} onSetLevel={(autonomyLevel) => updateAutonomy.mutate({ autonomyLevel, autonomyPaused: autonomyLevel === "MANUAL" })} onDisable={() => updateAutonomy.mutate({ autonomyLevel: "MANUAL", autonomyPaused: true })} />
            <MissionPanel missions={missions} activity={activity} paused={workspace.autonomyPaused} onNewMission={() => setMissionDialogOpen(true)} onTogglePause={() => updateAutonomy.mutate({ autonomyPaused: !workspace.autonomyPaused })} onRun={(missionId) => runMission.mutate({ missionId })} onStop={(missionId) => stopMission.mutate({ missionId })} onStopAll={() => stopAllMissions.mutate()} onClearQueue={() => clearMissionQueue.mutate()} pending={updateAutonomy.isPending || runMission.isPending || stopMission.isPending || stopAllMissions.isPending || clearMissionQueue.isPending} />
            <ReviewPanel approvals={approvals.length} attention={health.requiresAttention} />
          </aside>
        </div>
      ) : null}

      {activePanel === "graph" ? <GraphPanel graph={graph.data} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); setActivePanel("workspace"); }} /> : null}
      {activePanel === "activity" ? <ActivityPanel missions={missions} activity={activity} audit={audit.data ?? []} auditHint="Every persisted create, edit, soft-delete, restore, relationship, autonomy change, and mission transition creates a server-side audit event." /> : null}

      <NewObjectDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} folders={folders} isCreating={createObject.isPending} onCreate={(input) => createObject.mutate(input)} />
      <RelationshipDialog open={relationshipDialogOpen} onOpenChange={setRelationshipDialogOpen} source={selected} options={objects} isCreating={createRelationship.isPending} onCreate={(input) => createRelationship.mutate(input)} />
      <ReferenceDialog open={referenceDialogOpen} onOpenChange={setReferenceDialogOpen} object={selected} folders={folders} isCreating={createReference.isPending} onCreate={(input) => createReference.mutate(input)} />
      <MissionDialog open={missionDialogOpen} onOpenChange={setMissionDialogOpen} selected={selected} isCreating={createMission.isPending} onCreate={(input) => createMission.mutate(input)} />
    </div>
  );
}

function FolderBranch({ folder, children, selectedId, onSelect }: { folder: KnowledgeObject; children: KnowledgeObject[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(true);
  return <div className="rounded-xl">
    <button onClick={() => setOpen((value) => !value)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition ${selectedId === folder.id ? "bg-cyan-300/10 text-cyan-100" : "text-slate-300 hover:bg-white/5"}`}><ChevronRight className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} /><FolderOpen className="size-3.5 text-amber-300" /><span className="min-w-0 flex-1 truncate">{folder.title}</span><span className="text-[10px] text-slate-600">{children.length}</span></button>
    {open ? <div className="ml-4 border-l border-white/10 py-1">{children.map((object) => <TreeItem key={object.id} object={object} selectedId={selectedId} onSelect={onSelect} />)}{!children.length ? <p className="px-3 py-1.5 text-[11px] text-slate-600">No references yet</p> : null}</div> : null}
  </div>;
}

function TreeItem({ object, selectedId, onSelect }: { object: KnowledgeObject; selectedId: string | null; onSelect: (id: string) => void }) {
  return <button onClick={() => onSelect(object.id)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${selectedId === object.id ? "bg-cyan-300/10 text-cyan-100" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"}`}><ObjectIcon type={object.objectType} className="size-3.5 shrink-0 text-slate-500" /><span className="min-w-0 flex-1 truncate">{object.title}</span>{object.truthState === "NOT_ESTABLISHED" ? <TriangleAlert className="size-3 text-rose-300" /> : null}</button>;
}

function ObjectDetail({ object, folders, placements, objects, relationships, editing, onEditing, onSave, onTrash, onOpenBrain, onLink, onReference, isSaving }: { object: KnowledgeObject; folders: KnowledgeObject[]; placements: { objectId: string; parentObjectId: string | null; placementKind: string }[]; objects: KnowledgeObject[]; relationships: { id: string; sourceObjectId: string; targetObjectId: string; relationshipType: string; truthState: KnowledgeTruthState }[]; editing: boolean; onEditing: (value: boolean) => void; onSave: (input: { title?: string; description?: string; content?: string; tags?: string[] }) => void; onTrash: () => void; onOpenBrain: () => void; onLink: () => void; onReference: () => void; isSaving: boolean }) {
  const [draft, setDraft] = useState({ title: object.title, description: object.description, content: object.content, tags: object.tags.join(", ") });
  useEffect(() => { setDraft({ title: object.title, description: object.description, content: object.content, tags: object.tags.join(", ") }); }, [object.id, object.title, object.description, object.content, object.tags]);
  const objectById = new Map(objects.map((item) => [item.id, item]));
  const filedIn = placements.filter((placement) => placement.objectId === object.id).map((placement) => folders.find((folder) => folder.id === placement.parentObjectId)).filter(Boolean) as KnowledgeObject[];
  const linked = relationships.filter((relationship) => relationship.sourceObjectId === object.id || relationship.targetObjectId === object.id).map((relationship) => ({ relationship, other: objectById.get(relationship.sourceObjectId === object.id ? relationship.targetObjectId : relationship.sourceObjectId) })).filter((entry): entry is { relationship: typeof relationships[number]; other: KnowledgeObject } => Boolean(entry.other));
  const editable = !object.immutableProviderSnapshot;
  return <div className="flex min-h-[640px] flex-col">
    <div className="border-b border-white/10 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><div className="grid size-9 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200"><ObjectIcon type={object.objectType} /></div><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{formatKnowledgeObjectType(object.objectType)}</span><TruthBadge state={object.truthState} /></div>{editing ? <Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className="mt-4 max-w-xl border-white/15 bg-slate-950/50 text-xl font-semibold text-white" /> : <h2 className="mt-4 max-w-3xl font-display text-2xl font-semibold tracking-[-0.035em] text-white sm:text-3xl">{object.title}</h2>}<p className="mt-2 text-xs text-slate-500">Version {object.currentVersion} · Updated {formatDate(object.updatedAt)}</p></div><div className="flex items-center gap-2">{editable ? <Button size="sm" variant="outline" onClick={() => onEditing(!editing)} className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">{editing ? "Cancel" : "Edit"}</Button> : <Badge variant="outline" className="border-cyan-300/20 bg-cyan-300/5 text-cyan-100"><ShieldCheck className="mr-1.5 size-3" />Immutable source snapshot</Badge>}</div></div>
      <div className="mt-5 flex flex-wrap gap-2">{filedIn.map((folder) => <Badge key={folder.id} variant="outline" className="border-white/10 text-slate-400"><Folder className="mr-1.5 size-3" />{folder.title}</Badge>)}{object.tags.map((tag) => <Badge key={tag} variant="outline" className="border-white/10 text-slate-400"><Tag className="mr-1.5 size-3" />{tag}</Badge>)}</div>
    </div>
    <div className="flex-1 space-y-6 p-5 sm:p-6">
      <section><div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"><Info className="size-3.5" />Description</div>{editing ? <Textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className="min-h-20 border-white/10 bg-slate-950/40 text-slate-200" /> : <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{object.description || "No description yet."}</p>}</section>
      <section><div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"><FileText className="size-3.5" />Working content</div>{editing ? <Textarea value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} className="min-h-56 border-white/10 bg-slate-950/40 font-mono text-xs leading-6 text-slate-200" /> : <p className="whitespace-pre-wrap rounded-xl border border-white/5 bg-slate-950/25 p-4 text-sm leading-6 text-slate-300">{object.content || "No working content yet."}</p>}</section>
      {editing ? <section><Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Tags</Label><Input value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="research, hippocampus, evidence" className="mt-2 border-white/10 bg-slate-950/40 text-slate-200" /><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => onEditing(false)} className="border-white/10">Cancel</Button><Button disabled={isSaving || !draft.title.trim()} onClick={() => onSave({ title: draft.title.trim(), description: draft.description, content: draft.content, tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 24) })} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}Save version</Button></div></section> : null}
      <section className="grid gap-3 md:grid-cols-2"><div className="rounded-xl border border-white/10 bg-slate-950/25 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Provenance</p><p className="mt-2 text-xs leading-5 text-slate-400">{object.provenance.provider || object.sourceType.replace(/_/g, " ")}</p>{object.provenance.sourceUrl ? <a href={object.provenance.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200">Open cited source <ArrowUpRight className="size-3" /></a> : null}</div><div className="rounded-xl border border-white/10 bg-slate-950/25 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Scientific context</p><p className="mt-2 text-xs leading-5 text-slate-400">{object.scientificMetadata.referenceSpace || object.scientificMetadata.dataset || "No spatial or dataset context recorded."}</p>{object.objectType === "SCIENTIFIC_STRUCTURE" ? <Button variant="link" onClick={onOpenBrain} className="mt-1 h-auto px-0 text-xs text-cyan-300">Open Luna Brain context <ChevronRight className="ml-1 size-3" /></Button> : null}</div></section>
      <section><div className="mb-3 flex items-center justify-between gap-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Relationships</p><div className="flex items-center gap-2"><Button size="sm" variant="ghost" onClick={onReference} className="h-7 px-2 text-[10px] text-slate-400 hover:bg-white/5 hover:text-cyan-100"><Folder className="mr-1 size-3" />Reference folder</Button><Button size="sm" variant="ghost" onClick={onLink} className="h-7 px-2 text-[10px] text-cyan-300 hover:bg-cyan-300/10 hover:text-cyan-100"><Link2 className="mr-1 size-3" />Create link</Button><span className="text-xs text-slate-600">{linked.length} connected</span></div></div>{linked.length ? <div className="grid gap-2 md:grid-cols-2">{linked.map(({ relationship, other }) => <div key={relationship.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/25 p-3"><Link2 className="size-3.5 text-cyan-300" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-200">{other.title}</p><p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">{relationship.relationshipType.replace(/_/g, " ")}</p></div><TruthBadge state={relationship.truthState} /></div>)}</div> : <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-slate-600">No relationships have been created around this object yet.</p>}</section>
    </div>
    {editable ? <div className="flex justify-end border-t border-white/10 p-4"><Button variant="ghost" size="sm" onClick={onTrash} className="text-slate-500 hover:bg-rose-400/10 hover:text-rose-300"><Trash2 className="mr-2 size-3.5" />Move to trash</Button></div> : null}
  </div>;
}

function HealthCard({ health }: { health: { totalObjects: number; folders: number; scientificRecords: number; openQuestions: number; unresolvedRelationships: number; pendingApprovals: number; activeMissions: number; failedMissions: number; evidenceGaps: number; requiresAttention: number } }) {
  const rows = [["Objects", health.totalObjects, Database], ["Scientific records", health.scientificRecords, Brain], ["Open questions", health.openQuestions, CircleDot], ["Evidence gaps", health.evidenceGaps, TriangleAlert]] as const;
  return <section className="rounded-2xl border border-white/10 bg-card/70 p-4"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Knowledge health</p><p className="mt-1 text-sm font-medium text-slate-100">Coverage and review signals</p></div><HeartPulse className="size-4 text-cyan-300" /></div><div className="mt-4 grid grid-cols-2 gap-2">{rows.map(([label, value, Icon]) => <div key={label} className="rounded-xl bg-slate-950/35 p-2.5"><Icon className="size-3.5 text-slate-500" /><p className="mt-2 text-lg font-semibold text-white">{value}</p><p className="text-[10px] text-slate-500">{label}</p></div>)}</div></section>;
}

function SafetyCard({ onOpenBrain }: { onOpenBrain: () => void }) {
  return <section className="rounded-2xl border border-rose-400/15 bg-rose-400/5 p-4"><div className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-rose-200" /><div><p className="text-xs font-semibold text-rose-100">Scientific boundary remains active</p><p className="mt-1 text-xs leading-5 text-slate-400">The HRA visual GLB is not a Luna-native MNI coordinate source. P33 remains <strong className="font-semibold text-rose-200">NOT ESTABLISHED</strong>; Julich structure mapping remains separate and 0/0/0/102.</p><Button variant="link" onClick={onOpenBrain} className="mt-1 h-auto px-0 text-xs text-cyan-300">Review Brain safeguards <ChevronRight className="ml-1 size-3" /></Button></div></div></section>;
}

function AutonomyPanel({ level, paused, pending, onSetLevel, onDisable }: { level: KnowledgeAutonomyLevel; paused: boolean; pending: boolean; onSetLevel: (level: KnowledgeAutonomyLevel) => void; onDisable: () => void }) {
  const levels: Array<{ value: KnowledgeAutonomyLevel; label: string; detail: string }> = [
    { value: "MANUAL", label: "Manual", detail: "No worker starts." },
    { value: "SUGGEST", label: "Suggest", detail: "Queue suggestions only." },
    { value: "ON_DEMAND", label: "On demand", detail: "Run a bounded worker immediately when you dispatch it." },
    { value: "MAINTAIN_NON_DESTRUCTIVE", label: "Maintain", detail: "Reserved for future non-destructive maintenance; no provider scraping is scheduled." },
  ];
  return <section className="rounded-2xl border border-violet-400/15 bg-violet-400/5 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">Autonomy settings</p><p className="mt-1 text-xs text-slate-400">Workers never promote scientific or spatial authority.</p></div><Sparkles className="size-4 text-violet-300" /></div><div className="mt-3 space-y-1">{levels.map((item) => <button key={item.value} disabled={pending} onClick={() => onSetLevel(item.value)} className={`w-full rounded-lg p-2 text-left transition ${level === item.value ? "bg-violet-300/15 text-violet-100" : "text-slate-500 hover:bg-white/5 hover:text-slate-300"}`}><span className="flex items-center justify-between gap-2 text-[11px] font-semibold"><span>{item.label}</span>{level === item.value ? <CheckCircle2 className="size-3.5 text-violet-200" /> : null}</span><span className="mt-0.5 block text-[10px] leading-4 opacity-80">{item.detail}</span></button>)}</div><Button size="sm" variant="ghost" disabled={pending || (level === "MANUAL" && paused)} onClick={onDisable} className="mt-2 h-8 w-full text-[10px] text-slate-400 hover:bg-rose-300/10 hover:text-rose-200">Disable autonomy</Button></section>;
}

function MissionPanel({ missions, activity, paused, onNewMission, onTogglePause, onRun, onStop, onStopAll, onClearQueue, pending }: { missions: { id: string; objective: string; state: string; workerRole: string; createdAt: string }[]; activity: { id: string; message: string; eventType: string; createdAt: string }[]; paused: boolean; onNewMission: () => void; onTogglePause: () => void; onRun: (missionId: string) => void; onStop: (missionId: string) => void; onStopAll: () => void; onClearQueue: () => void; pending: boolean }) {
  const recent = activity.slice(0, 3);
  return <section className="rounded-2xl border border-white/10 bg-card/70 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Knowledge workers</p><p className="mt-1 text-sm font-medium text-slate-100">{paused ? "Paused by user" : "On-demand ready"}</p></div><Bot className="size-4 text-violet-300" /></div><div className="mt-3 space-y-2">{missions.slice(0, 3).map((mission) => <div key={mission.id} className="rounded-lg bg-slate-950/30 p-2.5"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-violet-300">{mission.workerRole.replace(/_/g, " ")}</span><span className="text-[10px] text-slate-500">{mission.state.replace(/_/g, " ")}</span></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">{mission.objective}</p>{mission.state === "QUEUED" ? <Button size="sm" variant="ghost" disabled={pending || paused} onClick={() => onRun(mission.id)} className="mt-1 h-7 px-1.5 text-[10px] text-cyan-300 hover:bg-cyan-300/10 hover:text-cyan-100"><Play className="mr-1 size-3" />Run now</Button> : ["COMPLETED", "FAILED", "CANCELLED", "MISSION_LIMIT_REACHED"].includes(mission.state) ? null : <Button size="sm" variant="ghost" disabled={pending} onClick={() => onStop(mission.id)} className="mt-1 h-7 px-1.5 text-[10px] text-rose-300 hover:bg-rose-300/10 hover:text-rose-100"><XCircle className="mr-1 size-3" />Stop</Button>}</div>)}{!missions.length ? <p className="rounded-lg border border-dashed border-white/10 p-3 text-xs leading-5 text-slate-600">Start an on-demand mission to research, validate, organize, or link Knowledge Space records.</p> : null}</div><div className="mt-3 grid grid-cols-2 gap-2"><Button size="sm" disabled={paused} onClick={onNewMission} className="bg-violet-300 text-slate-950 hover:bg-violet-200"><Play className="mr-1.5 size-3.5" />Dispatch</Button><Button size="sm" variant="outline" disabled={pending} onClick={onTogglePause} className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"><PauseCircle className="mr-1.5 size-3.5" />{paused ? "Resume" : "Pause all"}</Button></div><div className="mt-2 grid grid-cols-2 gap-2"><Button size="sm" variant="ghost" disabled={pending} onClick={onStopAll} className="h-8 text-[10px] text-slate-400 hover:bg-rose-300/10 hover:text-rose-200">Stop mission(s)</Button><Button size="sm" variant="ghost" disabled={pending} onClick={onClearQueue} className="h-8 text-[10px] text-slate-400 hover:bg-white/10 hover:text-slate-100">Clear queue</Button></div>{recent.length ? <div className="mt-4 border-t border-white/10 pt-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Recent activity</p>{recent.map((entry) => <p key={entry.id} className="mt-2 text-[11px] leading-4 text-slate-500">{entry.message}</p>)}</div> : null}</section>;
}

function ReviewPanel({ approvals, attention }: { approvals: number; attention: number }) {
  return <section className="rounded-2xl border border-white/10 bg-card/70 p-4"><div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-300" /><p className="text-xs font-medium text-slate-100">Review queue</p></div><p className="mt-2 text-xs leading-5 text-slate-500">{approvals} explicit approval records and {attention} evidence/attention signals are retained separately from user notes and proposed work.</p></section>;
}

function GraphPanel({ graph, selectedId, onSelect }: { graph: { nodes: KnowledgeObject[]; edges: { id: string; sourceObjectId: string; targetObjectId: string; relationshipType: string; truthState: KnowledgeTruthState }[] } | undefined; selectedId: string | null; onSelect: (id: string) => void }) {
  if (!selectedId) return <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-slate-500">Select a Knowledge Space object to view its focused graph.</div>;
  if (!graph) return <div className="grid min-h-[440px] place-items-center rounded-2xl border border-white/10 bg-card/70"><Loader2 className="size-6 animate-spin text-cyan-300" /></div>;
  return <section className="rounded-2xl border border-white/10 bg-card/70 p-5 sm:p-7"><div className="flex items-center gap-3"><Network className="size-5 text-cyan-300" /><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Focused graph</p><h2 className="text-lg font-semibold text-white">One-hop evidence neighborhood</h2></div></div><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">The graph deliberately loads only the selected object and direct relationships. This keeps navigation responsive as the workspace grows.</p><div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{graph.nodes.map((node) => <button key={node.id} onClick={() => onSelect(node.id)} className={`rounded-2xl border p-4 text-left transition ${node.id === selectedId ? "border-cyan-300/35 bg-cyan-300/10" : "border-white/10 bg-slate-950/25 hover:border-white/20 hover:bg-white/5"}`}><div className="flex items-start justify-between gap-3"><ObjectIcon type={node.objectType} className="size-4 text-cyan-300" /><TruthBadge state={node.truthState} /></div><p className="mt-4 text-sm font-medium text-slate-100">{node.title}</p><p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">{formatKnowledgeObjectType(node.objectType)}</p></button>)}</div><div className="mt-6 border-t border-white/10 pt-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Links</p><div className="mt-3 space-y-2">{graph.edges.map((edge) => <div key={edge.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-950/25 p-3 text-xs"><Link2 className="size-3.5 text-cyan-300" /><span className="text-slate-300">{graph.nodes.find((node) => node.id === edge.sourceObjectId)?.title ?? "Object"}</span><span className="text-slate-600">{edge.relationshipType.replace(/_/g, " ")}</span><span className="text-slate-300">{graph.nodes.find((node) => node.id === edge.targetObjectId)?.title ?? "Object"}</span><TruthBadge state={edge.truthState} /></div>)}{!graph.edges.length ? <p className="text-xs text-slate-600">No direct relationships are recorded for this object.</p> : null}</div></div></section>;
}

function ActivityPanel({ missions, activity, audit, auditHint }: { missions: { id: string; state: string; workerRole: string; objective: string; createdAt: string }[]; activity: { id: string; eventType: string; message: string; createdAt: string }[]; audit: { id: string; action: string; subjectType: string; createdAt: string; detail: Record<string, unknown> }[]; auditHint: string }) { return <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]"><section className="rounded-2xl border border-white/10 bg-card/70 p-5 sm:p-6"><div className="flex items-center gap-3"><Activity className="size-5 text-cyan-300" /><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Mission activity</p><h2 className="text-lg font-semibold text-white">Worker status and reports</h2></div></div><div className="mt-5 space-y-2">{[...activity].map((entry) => <article key={entry.id} className="rounded-xl border border-white/10 bg-slate-950/25 p-4"><div className="flex items-center justify-between gap-3"><Badge variant="outline" className="border-violet-400/20 text-violet-200">{entry.eventType.replace(/_/g, " ")}</Badge><time className="text-[10px] text-slate-600">{formatDate(entry.createdAt)}</time></div><p className="mt-3 text-sm text-slate-300">{entry.message}</p></article>)}{!activity.length ? <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-600">No worker activity has been recorded. Dispatch an on-demand mission to begin an auditable work trace.</p> : null}</div></section><aside className="space-y-3"><section className="rounded-2xl border border-white/10 bg-card/70 p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Queue</p><div className="mt-3 space-y-2">{missions.map((mission) => <div key={mission.id} className="rounded-xl bg-slate-950/35 p-3"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold tracking-[0.12em] text-violet-300">{mission.workerRole.replace(/_/g, " ")}</span><span className="text-[10px] text-slate-500">{mission.state.replace(/_/g, " ")}</span></div><p className="mt-2 text-xs leading-5 text-slate-300">{mission.objective}</p></div>)}{!missions.length ? <p className="text-xs text-slate-600">The queue is clear.</p> : null}</div></section><section className="rounded-2xl border border-white/10 bg-card/70 p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Immutable audit history</p><div className="mt-3 space-y-2">{audit.slice(0, 8).map((event) => <div key={event.id} className="rounded-lg bg-slate-950/35 p-2.5"><p className="text-[10px] font-semibold tracking-[0.08em] text-cyan-200">{event.action.replace(/_/g, " ")}</p><p className="mt-1 text-[10px] text-slate-500">{event.subjectType} · {formatDate(event.createdAt)}</p></div>)}{!audit.length ? <p className="text-xs text-slate-600">Loading or no audit events yet.</p> : null}</div><div className="mt-4 rounded-xl border border-cyan-300/10 bg-cyan-300/5 p-3"><p className="text-xs leading-5 text-slate-400">{auditHint}</p></div></section></aside></div>; }

function SearchResults({ results, onSelect }: { results: KnowledgeObject[]; onSelect: (id: string) => void }) {
  return <section className="rounded-2xl border border-cyan-300/15 bg-card/90 p-3"><p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Search results</p><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{results.map((object) => <button key={object.id} onClick={() => onSelect(object.id)} className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/5"><ObjectIcon type={object.objectType} className="size-4 shrink-0 text-cyan-300" /><div className="min-w-0 flex-1"><p className="truncate text-sm text-slate-200">{object.title}</p><p className="truncate text-[10px] text-slate-500">{object.description || formatKnowledgeObjectType(object.objectType)}</p></div><TruthBadge state={object.truthState} /></button>)}{!results.length ? <p className="px-2 py-3 text-sm text-slate-600">No matching knowledge objects found.</p> : null}</div></section>;
}

function NewObjectDialog({ open, onOpenChange, folders, isCreating, onCreate }: { open: boolean; onOpenChange: (value: boolean) => void; folders: KnowledgeObject[]; isCreating: boolean; onCreate: (input: { objectType: KnowledgeObjectType; title: string; description: string; content: string; parentObjectId: string | null; sourceType: "USER_NOTE"; truthState: "USER_APPROVED" }) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<KnowledgeObjectType>("NOTE");
  const [folderId, setFolderId] = useState<string>("");
  const submit = () => { if (!title.trim()) return; onCreate({ objectType: type, title: title.trim(), description: description.trim(), content: content.trim(), parentObjectId: folderId || null, sourceType: "USER_NOTE", truthState: "USER_APPROVED" }); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-slate-950 text-slate-100 sm:max-w-xl"><DialogHeader><DialogTitle>Create Knowledge Object</DialogTitle><DialogDescription className="text-slate-400">New user-authored objects are preserved as user-approved working knowledge. They do not modify provider evidence or scientific registration state.</DialogDescription></DialogHeader><div className="grid gap-4 py-3"><div className="grid gap-2"><Label>Object type</Label><select value={type} onChange={(event) => setType(event.target.value as KnowledgeObjectType)} className="h-10 rounded-md border border-white/10 bg-slate-900 px-3 text-sm text-slate-100">{creationTypes.map((value) => <option key={value} value={value}>{formatKnowledgeObjectType(value)}</option>)}</select></div><div className="grid gap-2"><Label>Title</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A concise knowledge title" className="border-white/10 bg-slate-900" /></div><div className="grid gap-2"><Label>Description</Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What this object is and why it matters" className="border-white/10 bg-slate-900" /></div><div className="grid gap-2"><Label>Working content</Label><Textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Notes, question framing, cited excerpts, or planned next steps" className="min-h-32 border-white/10 bg-slate-900" /></div><div className="grid gap-2"><Label>Primary folder</Label><select value={folderId} onChange={(event) => setFolderId(event.target.value)} className="h-10 rounded-md border border-white/10 bg-slate-900 px-3 text-sm text-slate-100"><option value="">Unfiled</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.title}</option>)}</select></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10">Cancel</Button><Button disabled={isCreating || !title.trim()} onClick={submit} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{isCreating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FilePlus2 className="mr-2 size-4" />}Create object</Button></DialogFooter></DialogContent></Dialog>;
}

function MissionDialog({ open, onOpenChange, selected, isCreating, onCreate }: { open: boolean; onOpenChange: (value: boolean) => void; selected: KnowledgeObject | null; isCreating: boolean; onCreate: (input: { targetObjectId: string | null; workerRole: KnowledgeWorkerRole; objective: string; autonomyLevel: "ON_DEMAND"; maxSteps: number; maxRetries: number; maxDurationSeconds: number; maxSpawnedWorkers: number }) => void }) {
  const [objective, setObjective] = useState("");
  const [role, setRole] = useState<KnowledgeWorkerRole>("RESEARCHER");
  const submit = () => { if (!objective.trim()) return; onCreate({ targetObjectId: selected?.id ?? null, workerRole: role, objective: objective.trim(), autonomyLevel: "ON_DEMAND", maxSteps: 12, maxRetries: 2, maxDurationSeconds: 120, maxSpawnedWorkers: 1 }); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="border-white/10 bg-slate-950 text-slate-100 sm:max-w-lg"><DialogHeader><DialogTitle>Dispatch an on-demand knowledge worker</DialogTitle><DialogDescription className="text-slate-400">Missions are bounded to 12 steps, two retries, one worker, and two minutes. Output remains proposed/user knowledge; it cannot establish medical, biological, spatial, provider, or authoritative scientific state.</DialogDescription></DialogHeader><div className="grid gap-4 py-3"><div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400">Target: <span className="font-medium text-slate-200">{selected?.title ?? "Workspace-level mission"}</span></div><div className="grid gap-2"><Label>Worker role</Label><select value={role} onChange={(event) => setRole(event.target.value as KnowledgeWorkerRole)} className="h-10 rounded-md border border-white/10 bg-slate-900 px-3 text-sm text-slate-100">{workerRoles.map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}</select></div><div className="grid gap-2"><Label>Objective</Label><Textarea value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="For example: organize the existing hippocampus records and identify evidence gaps." className="min-h-28 border-white/10 bg-slate-900" /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10">Cancel</Button><Button disabled={isCreating || !objective.trim()} onClick={submit} className="bg-violet-300 text-slate-950 hover:bg-violet-200">{isCreating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Bot className="mr-2 size-4" />}Queue mission</Button></DialogFooter></DialogContent></Dialog>;
}

function KnowledgeLoading() { return <div className="grid min-h-[60vh] place-items-center rounded-3xl border border-white/10 bg-card/70"><div className="flex items-center gap-3 text-sm text-slate-400"><Loader2 className="size-5 animate-spin text-cyan-300" />Opening Knowledge Space…</div></div>; }

function KnowledgeOwnerUnlock({ configured, error, pending, onUnlock }: { configured: boolean; error?: string; pending: boolean; onUnlock: (password: string) => void }) { const [password, setPassword] = useState(""); return <div className="mx-auto max-w-3xl rounded-3xl border border-amber-400/20 bg-card/80 p-7 sm:p-10"><div className="flex gap-4"><ShieldCheck className="size-7 shrink-0 text-cyan-300" /><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Single-owner workspace</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-white">Unlock private Knowledge Space.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">Use the existing NPC-management administrator password. It is verified only by the server and creates a separate, time-limited Knowledge Space owner session. No general user account or browser-local workspace is created.</p>{!configured ? <p className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/5 p-3 text-xs leading-5 text-amber-200">The server-side administrator password is not configured for this deployment.</p> : null}{error ? <p className="mt-4 rounded-xl border border-white/10 bg-slate-950/35 p-3 font-mono text-xs leading-5 text-slate-500">{error}</p> : null}<form onSubmit={(event) => { event.preventDefault(); if (password) onUnlock(password); }} className="mt-6 max-w-sm"><Label htmlFor="knowledge-owner-password" className="text-xs text-slate-300">Administrator password</Label><Input id="knowledge-owner-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={!configured || pending} className="mt-2 border-white/10 bg-slate-950/40 text-slate-100" /><Button type="submit" disabled={!configured || pending || !password} className="mt-3 bg-cyan-300 text-slate-950 hover:bg-cyan-200">{pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShieldCheck className="mr-2 size-4" />}Unlock Knowledge Space</Button></form><div className="mt-6 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="size-4 text-cyan-300" />P33 registration safeguards and Macro-only nanobot boundaries remain unchanged.</div></div></div></div>; }

function KnowledgeUnavailable({ error }: { error?: string }) { return <div className="mx-auto max-w-3xl rounded-3xl border border-amber-400/20 bg-card/80 p-7 sm:p-10"><div className="flex gap-4"><TriangleAlert className="size-7 shrink-0 text-amber-300" /><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">Server persistence required</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-white">Knowledge Space cannot use a local fallback.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">The verified owner session is active, but the server-side Supabase persistence service is unavailable. No workspace data is written to browser storage.</p>{error ? <p className="mt-4 rounded-xl border border-white/10 bg-slate-950/35 p-3 font-mono text-xs leading-5 text-slate-500">{error}</p> : null}</div></div></div>; }

function EmptyDetail({ onCreate }: { onCreate: () => void }) { return <div className="grid min-h-[640px] place-items-center p-8 text-center"><div className="max-w-sm"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-300"><BookOpen className="size-5" /></div><h2 className="mt-4 text-xl font-semibold text-white">Select a knowledge object</h2><p className="mt-2 text-sm leading-6 text-slate-500">Browse a folder, open an evidence record, or create the first user-owned note in this workspace.</p><Button onClick={onCreate} className="mt-5 bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Plus className="mr-2 size-4" />Create object</Button></div></div>; }

function RelationshipDialog({ open, onOpenChange, source, options, isCreating, onCreate }: { open: boolean; onOpenChange: (value: boolean) => void; source: KnowledgeObject | null; options: KnowledgeObject[]; isCreating: boolean; onCreate: (input: { sourceObjectId: string; targetObjectId: string; relationshipType: "RELATED_TO" | "SUPPORTS" | "CONTRADICTS" | "REFERENCES" | "REQUIRES_REVIEW" | "UNMAPPED_TO"; sourceType: "USER_NOTE"; truthState: "PROPOSED" }) => void }) {
  const [targetId, setTargetId] = useState("");
  const [relationshipType, setRelationshipType] = useState<"RELATED_TO" | "SUPPORTS" | "CONTRADICTS" | "REFERENCES" | "REQUIRES_REVIEW" | "UNMAPPED_TO">("RELATED_TO");
  const targets = options.filter((object) => object.id !== source?.id && object.status !== "TRASHED");
  useEffect(() => { if (!targets.some((object) => object.id === targetId)) setTargetId(targets[0]?.id ?? ""); }, [open, source?.id, targets, targetId]);
  const submit = () => { if (!source || !targetId) return; onCreate({ sourceObjectId: source.id, targetObjectId: targetId, relationshipType, sourceType: "USER_NOTE", truthState: "PROPOSED" }); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="border-white/10 bg-slate-950 text-slate-100 sm:max-w-lg"><DialogHeader><DialogTitle>Create Knowledge Relationship</DialogTitle><DialogDescription className="text-slate-400">This creates a proposed working link. It does not verify scientific identity, provider mapping, spatial registration, or a biological target.</DialogDescription></DialogHeader><div className="grid gap-4 py-3"><div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400">From: <span className="font-medium text-slate-200">{source?.title ?? "No object selected"}</span></div><div className="grid gap-2"><Label>Relationship</Label><select value={relationshipType} onChange={(event) => setRelationshipType(event.target.value as typeof relationshipType)} className="h-10 rounded-md border border-white/10 bg-slate-900 px-3 text-sm text-slate-100">{["RELATED_TO", "SUPPORTS", "CONTRADICTS", "REFERENCES", "REQUIRES_REVIEW", "UNMAPPED_TO"].map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}</select></div><div className="grid gap-2"><Label>To</Label><select value={targetId} onChange={(event) => setTargetId(event.target.value)} className="h-10 rounded-md border border-white/10 bg-slate-900 px-3 text-sm text-slate-100">{targets.map((object) => <option key={object.id} value={object.id}>{object.title}</option>)}</select></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10">Cancel</Button><Button disabled={isCreating || !source || !targetId} onClick={submit} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{isCreating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Link2 className="mr-2 size-4" />}Create proposed link</Button></DialogFooter></DialogContent></Dialog>;
}

function ReferenceDialog({ open, onOpenChange, object, folders, isCreating, onCreate }: { open: boolean; onOpenChange: (value: boolean) => void; object: KnowledgeObject | null; folders: KnowledgeObject[]; isCreating: boolean; onCreate: (input: { objectId: string; parentObjectId: string }) => void }) {
  const [folderId, setFolderId] = useState("");
  useEffect(() => { if (!folders.some((folder) => folder.id === folderId)) setFolderId(folders[0]?.id ?? ""); }, [open, folders, folderId]);
  const submit = () => { if (!object || !folderId) return; onCreate({ objectId: object.id, parentObjectId: folderId }); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="border-white/10 bg-slate-950 text-slate-100 sm:max-w-lg"><DialogHeader><DialogTitle>Add Folder Reference</DialogTitle><DialogDescription className="text-slate-400">References let one Knowledge Space object appear in more than one folder without copying its content, provenance, version history, or evidence state.</DialogDescription></DialogHeader><div className="grid gap-4 py-3"><div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-400">Object: <span className="font-medium text-slate-200">{object?.title ?? "No object selected"}</span></div><div className="grid gap-2"><Label>Additional folder</Label><select value={folderId} onChange={(event) => setFolderId(event.target.value)} className="h-10 rounded-md border border-white/10 bg-slate-900 px-3 text-sm text-slate-100">{folders.filter((folder) => folder.id !== object?.id).map((folder) => <option key={folder.id} value={folder.id}>{folder.title}</option>)}</select></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10">Cancel</Button><Button disabled={isCreating || !object || !folderId} onClick={submit} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{isCreating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Folder className="mr-2 size-4" />}Add reference</Button></DialogFooter></DialogContent></Dialog>;
}
