import type { Message } from "@/components/AIChatBox";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

export const CHAT_SESSIONS_STORAGE_KEY = "senota.chat-sessions.v1";
export const CHAT_ACTIVE_SESSION_STORAGE_KEY = "senota.active-chat-session.v1";

type ChatSessionsValue = {
  sessions: ChatSession[];
  activeSession: ChatSession;
  createSession: () => void;
  selectSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  deleteSession: (id: string) => void;
  updateMessages: (id: string, messages: Message[]) => void;
};

const ChatSessionsContext = createContext<ChatSessionsValue | null>(null);

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createChatSession(now = Date.now(), id = makeId()): ChatSession {
  return { id, title: "New conversation", messages: [], createdAt: now, updatedAt: now };
}

export function readPersistedChatSessions(rawSessions: string | null): ChatSession[] {
  try {
    const parsed = JSON.parse(rawSessions ?? "[]") as ChatSession[];
    return parsed.filter(session => session?.id && Array.isArray(session.messages)).slice(0, 40);
  } catch {
    return [];
  }
}

export function prependChatSession(sessions: ChatSession[], session = createChatSession()) {
  return [session, ...sessions];
}

export function renameChatSession(sessions: ChatSession[], id: string, title: string, updatedAt = Date.now()) {
  const normalizedTitle = title.trim().slice(0, 80);
  return sessions.map(session => session.id === id
    ? { ...session, title: normalizedTitle || session.title, updatedAt }
    : session);
}

export function resolveActiveChatSession(sessions: ChatSession[], activeId: string) {
  return sessions.find(session => session.id === activeId) ?? sessions[0] ?? createChatSession();
}

export function deleteChatSession(sessions: ChatSession[], id: string, activeId: string) {
  const remaining = sessions.filter(session => session.id !== id);
  const nextSessions = remaining.length ? remaining : [createChatSession()];
  const nextActiveId = activeId === id ? nextSessions[0]?.id ?? "" : activeId;
  return { sessions: nextSessions, activeId: nextActiveId };
}

export function updateChatSessionMessages(sessions: ChatSession[], id: string, messages: Message[], updatedAt = Date.now()) {
  return sessions.map(session => {
    if (session.id !== id) return session;
    const firstUserMessage = messages.find(message => message.role === "user")?.content;
    return { ...session, messages, title: firstUserMessage ? firstUserMessage.slice(0, 54) : session.title, updatedAt };
  });
}

export function ChatSessionsProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = readPersistedChatSessions(localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY));
    return saved.length ? saved : [createChatSession()];
  });
  const [activeId, setActiveId] = useState(() => localStorage.getItem(CHAT_ACTIVE_SESSION_STORAGE_KEY) ?? "");

  useEffect(() => {
    localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    if (!sessions.some(session => session.id === activeId)) setActiveId(sessions[0]?.id ?? "");
  }, [sessions, activeId]);

  useEffect(() => {
    if (activeId) localStorage.setItem(CHAT_ACTIVE_SESSION_STORAGE_KEY, activeId);
  }, [activeId]);

  const activeSession = resolveActiveChatSession(sessions, activeId);
  const value = useMemo<ChatSessionsValue>(() => ({
    sessions: [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    activeSession,
    createSession: () => {
      const session = createChatSession();
      setSessions(current => prependChatSession(current, session));
      setActiveId(session.id);
    },
    selectSession: setActiveId,
    renameSession: (id, title) => setSessions(current => renameChatSession(current, id, title)),
    deleteSession: (id) => setSessions(current => {
      const next = deleteChatSession(current, id, activeId);
      if (next.activeId !== activeId) setActiveId(next.activeId);
      return next.sessions;
    }),
    updateMessages: (id, messages) => setSessions(current => updateChatSessionMessages(current, id, messages)),
  }), [sessions, activeId, activeSession]);

  return <ChatSessionsContext.Provider value={value}>{children}</ChatSessionsContext.Provider>;
}

export function useChatSessions() {
  const value = useContext(ChatSessionsContext);
  if (!value) throw new Error("useChatSessions must be used inside ChatSessionsProvider");
  return value;
}
