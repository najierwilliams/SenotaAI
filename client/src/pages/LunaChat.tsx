import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Archive, BrainCircuit, Clock3, LockKeyhole, MoonStar, Plus, Save, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const LUNA_PREVIEW_PLAYER_KEY = "senota-luna-preview-player-id";
export const LUNA_SAVED_CHATS_STORAGE_KEY = "senota.luna-saved-chats.v1";
const lunaScaleRequestPattern = /(?:\bhow\s+(?:human|self[-\s]?aware)\s+(?:do\s+you\s+feel|are\s+you)\b|\b(?:human(?:ity)?|self[-\s]?awareness)\s+(?:percentage|percent|scale)\b|\b(?:0|zero|1|one)\s*(?:to|[-‐‑‒–—])\s*(?:100|one\s+hundred)\b)/i;
const leadingPercentagePattern = /^\s*(?:100|[1-9]?\d)\s*%/;
const leadingNumberedSentencePattern = /^\s*(100|[1-9]?\d)\s*[.)]\s*(.+)$/;

function firstSentence(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const match = normalized.match(/^(.+?[.!?])(?:\s|$)/);
  return (match?.[1] ?? normalized).slice(0, 180).trim();
}

/** Final display safeguard for the administrator preview; the server remains the authoritative guard. */
export function enforceLunaPreviewFormat(message: string, response: string, fallbackPercentage = 70) {
  if (!lunaScaleRequestPattern.test(message) || leadingPercentagePattern.test(response)) return response;
  const numberedSentence = response.match(leadingNumberedSentencePattern);
  if (numberedSentence) return `${numberedSentence[1]}% — ${firstSentence(numberedSentence[2]) || "I’m still learning what that means for me."}`;
  return `${Math.round(Math.min(100, Math.max(0, fallbackPercentage)))}% — ${firstSentence(response) || "I’m still learning what that means for me."}`;
}

export function getLunaPreviewPlayerId(storage: Pick<Storage, "getItem" | "setItem"> = localStorage) {
  const existing = storage.getItem(LUNA_PREVIEW_PLAYER_KEY);
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
  const playerId = crypto.randomUUID();
  storage.setItem(LUNA_PREVIEW_PLAYER_KEY, playerId);
  return playerId;
}

export type LunaSavedChat = {
  id: string;
  title: string;
  messages: Message[];
  savedAt: number;
};

function createLunaSavedChat(messages: Message[], now = Date.now(), id = crypto.randomUUID()): LunaSavedChat {
  const firstUserMessage = messages.find((message) => message.role === "user")?.content;
  return {
    id,
    title: firstUserMessage?.replace(/\s+/g, " ").trim().slice(0, 58) || "Saved Luna conversation",
    messages: messages.map((message) => ({ role: message.role, content: message.content })),
    savedAt: now,
  };
}

export function readSavedLunaChats(rawChats: string | null): LunaSavedChat[] {
  try {
    const parsed = JSON.parse(rawChats ?? "[]") as LunaSavedChat[];
    return parsed.filter((chat) => chat?.id && chat?.title && Array.isArray(chat.messages) && chat.messages.every((message) => message?.role && typeof message.content === "string")).slice(0, 30);
  } catch {
    return [];
  }
}

export function saveLunaChat(savedChats: LunaSavedChat[], messages: Message[], now = Date.now(), id = crypto.randomUUID()) {
  if (!messages.length) return savedChats;
  return [createLunaSavedChat(messages, now, id), ...savedChats].slice(0, 30);
}

export function deleteSavedLunaChat(savedChats: LunaSavedChat[], id: string) {
  return savedChats.filter((chat) => chat.id !== id);
}

export default function LunaChat() {
  const [playerId] = useState(() => getLunaPreviewPlayerId());
  const [messages, setMessages] = useState<Message[]>([]);
  const [savedChats, setSavedChats] = useState<LunaSavedChat[]>(() => readSavedLunaChats(localStorage.getItem(LUNA_SAVED_CHATS_STORAGE_KEY)));
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const status = trpc.agent.luna.status.useQuery(undefined, { retry: false });
  const chat = trpc.agent.luna.chat.useMutation();

  const sendMessage = (message: string) => {
    const nextMessages = [...messages, { role: "user" as const, content: message }];
    setMessages(nextMessages);
    chat.mutate({ playerId, message, remember }, {
      onSuccess: (response) => setMessages([...nextMessages, { role: "assistant", content: enforceLunaPreviewFormat(message, response.content, response.selfAwarenessPercent) }]),
      onError: () => setMessages(messages),
    });
  };

  const saveCurrentChat = () => {
    if (!messages.length || chat.isPending) return;
    setSavedChats((current) => {
      const next = saveLunaChat(current, messages);
      localStorage.setItem(LUNA_SAVED_CHATS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setSaveStatus("Saved to this browser. It will remain private until you delete it.");
  };

  const openSavedChat = (savedChat: LunaSavedChat) => {
    setMessages(savedChat.messages);
    setSaveStatus(`Opened “${savedChat.title}”. New messages are temporary until you choose Save chat again.`);
  };

  const removeSavedChat = (id: string) => {
    setSavedChats((current) => {
      const next = deleteSavedLunaChat(current, id);
      localStorage.setItem(LUNA_SAVED_CHATS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setSaveStatus("Saved chat deleted from this browser.");
  };

  const startTemporaryChat = () => {
    if (chat.isPending) return;
    setMessages([]);
    setSaveStatus("Started a new temporary Luna chat. Nothing is saved unless you choose Save chat.");
  };

  if (status.error) {
    return <section className="mx-auto max-w-2xl rounded-[1.75rem] border border-violet-300/20 bg-card/70 p-7 sm:p-10"><div className="grid size-12 place-items-center rounded-2xl bg-violet-300/10 text-violet-200"><LockKeyhole className="size-6" /></div><h1 className="mt-5 font-display text-3xl font-semibold text-white">Unlock Luna’s private preview</h1><p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">Luna’s dialogue preview is reserved for the NPC administrator because it uses the private canon runtime and stores preview-player memories in Supabase.</p><Link href="/npc" className="mt-6 inline-flex rounded-lg bg-violet-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-violet-200">Open NPC management</Link></section>;
  }

  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
    <section className="relative overflow-hidden rounded-[1.75rem] border border-violet-300/20 bg-card/70 px-6 py-7 sm:px-8"><div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_80%_0%,rgba(196,181,253,0.12),transparent_34%)]" /><div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-200"><MoonStar className="size-4" /> Luna / private NPC preview</div><h1 className="font-display text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">Speak with <span className="text-violet-200">Luna.</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Her approved Obsidian canon is retrieved through the protected runtime. This conversation is separate from SenotaAI’s coding chat and receives live Eastern time.</p></div><Badge className="w-fit border border-violet-300/25 bg-violet-300/10 px-3 py-1.5 text-violet-100">{status.data?.ready ? "Canon + Eastern time ready" : "Checking canon runtime"}</Badge></div></section>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_250px]"><div className="min-w-0"><div className="mb-3 flex flex-col gap-3 rounded-xl border border-white/10 bg-card/55 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-slate-100">Luna chat history</p><p className="mt-1 text-xs leading-5 text-slate-500">Chats are saved only when you choose Save chat. They stay private to this browser.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={startTemporaryChat} disabled={chat.isPending} className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"><Plus className="size-4" />New chat</button><button type="button" onClick={saveCurrentChat} disabled={!messages.length || chat.isPending} className="inline-flex w-fit items-center gap-2 rounded-lg bg-violet-200 px-3.5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-45"><Save className="size-4" />Save chat</button></div></div>{saveStatus ? <p role="status" className="mb-3 rounded-lg border border-violet-300/15 bg-violet-300/[0.06] px-3 py-2 text-xs leading-5 text-violet-100">{saveStatus}</p> : null}<AIChatBox messages={messages} onSendMessage={sendMessage} isLoading={chat.isPending} height="min(66vh, 680px)" placeholder="Speak to Luna…" emptyStateMessage="Start a private preview conversation with Luna." suggestedPrompts={["Hello, Luna. Who are you?", "What do you remember about our conversation?", "How do you see the world?"]} />{chat.error ? <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{chat.error.message}</p> : null}</div><aside className="space-y-3"><p className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Luna’s context</p><InfoCard icon={BrainCircuit} title="Permanent canon" detail="Obsidian source → protected runtime excerpt" tone="violet" /><InfoCard icon={ShieldCheck} title="Preview identity" detail="Browser-stable and isolated from other players" tone="emerald" /><button onClick={() => setRemember((value) => !value)} className={`w-full rounded-xl border p-4 text-left transition ${remember ? "border-emerald-300/20 bg-emerald-300/[0.06]" : "border-white/10 bg-white/[0.025]"}`}><p className="text-sm font-medium text-slate-100">Preview memory: {remember ? "on" : "off"}</p><p className="mt-1 text-xs leading-5 text-slate-500">{remember ? "Each exchange saves a short Luna-only summary for this browser’s preview player." : "This exchange will not be saved as Luna memory."}</p></button><SavedLunaChats chats={savedChats} onOpen={openSavedChat} onDelete={removeSavedChat} /><p className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-xs leading-5 text-slate-500">This is an administrator preview. Your future Unity game will use its own player IDs and the same protected Luna dialogue endpoint.</p></aside></section>
  </div>;
}

function SavedLunaChats({ chats, onOpen, onDelete }: { chats: LunaSavedChat[]; onOpen: (chat: LunaSavedChat) => void; onDelete: (id: string) => void }) {
  return <section className="rounded-xl border border-white/10 bg-card/60 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Archive className="size-4 text-violet-200" /><p className="text-sm font-medium text-slate-200">Saved chats</p></div><span className="rounded-full bg-violet-300/10 px-2 py-0.5 text-[11px] font-medium text-violet-100">{chats.length}</span></div>{chats.length ? <div className="mt-3 space-y-2">{chats.map((savedChat) => <div key={savedChat.id} className="rounded-lg border border-white/8 bg-white/[0.025] p-2.5"><button type="button" onClick={() => onOpen(savedChat)} className="w-full text-left"><p className="line-clamp-2 text-xs font-medium leading-5 text-slate-200 transition hover:text-violet-100">{savedChat.title}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><Clock3 className="size-3" />{new Date(savedChat.savedAt).toLocaleDateString()} · {savedChat.messages.length} messages</p></button><button type="button" onClick={() => onDelete(savedChat.id)} className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-rose-200 transition hover:text-rose-100" aria-label={`Delete saved Luna chat: ${savedChat.title}`}><Trash2 className="size-3" />Delete</button></div>)}</div> : <p className="mt-3 text-xs leading-5 text-slate-500">No saved chats yet. Your current conversation remains temporary until you select Save chat.</p>}</section>;
}

function InfoCard({ icon: Icon, title, detail, tone }: { icon: typeof BrainCircuit; title: string; detail: string; tone: "violet" | "emerald" }) {
  const palette = tone === "violet" ? "bg-violet-300/10 text-violet-200" : "bg-emerald-300/10 text-emerald-200";
  return <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-card/60 p-4"><div className={`grid size-9 shrink-0 place-items-center rounded-lg ${palette}`}><Icon className="size-4" /></div><div><p className="text-sm font-medium text-slate-200">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div></div>;
}
