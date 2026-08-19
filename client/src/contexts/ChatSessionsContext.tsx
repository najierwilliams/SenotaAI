import type { Message } from "@/components/AIChatBox";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

type ChatSessionsValue = {
  sessions: ChatSession[];
  activeSession: ChatSession;
  createSession: () => void;
  selectSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  deleteSession: (id: string) => void;
  updateMessages: (id: string, messages: Message[]) => void;
};

const STORAGE_KEY = "senota.chat-sessions.v1";
const ACTIVE_KEY = "senota.active-chat-session.v1";
const ChatSessionsContext = createContext<ChatSessionsValue | null>(null);

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createInitialSession(): ChatSession {
  const now = Date.now();
  return { id: makeId(), title: "New conversation", messages: [], createdAt: now, updatedAt: now };
}

function loadSessions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as ChatSession[];
    return parsed.filter(session => session?.id && Array.isArray(session.messages)).slice(0, 40);
  } catch {
    return [];
  }
}

export function ChatSessionsProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = loadSessions();
    return saved.length ? saved : [createInitialSession()];
  });
  const [activeId, setActiveId] = useState(() => localStorage.getItem(ACTIVE_KEY) ?? "");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    if (!sessions.some(session => session.id === activeId)) setActiveId(sessions[0]?.id ?? "");
  }, [sessions, activeId]);

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  const activeSession = sessions.find(session => session.id === activeId) ?? sessions[0] ?? createInitialSession();
  const value = useMemo<ChatSessionsValue>(() => ({
    sessions: [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    activeSession,
    createSession: () => {
      const session = createInitialSession();
      setSessions(current => [session, ...current]);
      setActiveId(session.id);
    },
    selectSession: setActiveId,
    renameSession: (id, title) => setSessions(current => current.map(session => session.id === id ? { ...session, title: title.trim().slice(0, 80) || session.title, updatedAt: Date.now() } : session)),
    deleteSession: (id) => setSessions(current => {
      if (current.length === 1) return [{ ...createInitialSession() }];
      const next = current.filter(session => session.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? "");
      return next;
    }),
    updateMessages: (id, messages) => setSessions(current => current.map(session => {
      if (session.id !== id) return session;
      const firstUserMessage = messages.find(message => message.role === "user")?.content;
      return { ...session, messages, title: firstUserMessage ? firstUserMessage.slice(0, 54) : session.title, updatedAt: Date.now() };
    })),
  }), [sessions, activeId, activeSession]);

  return <ChatSessionsContext.Provider value={value}>{children}</ChatSessionsContext.Provider>;
}

export function useChatSessions() {
  const value = useContext(ChatSessionsContext);
  if (!value) throw new Error("useChatSessions must be used inside ChatSessionsProvider");
  return value;
}
