import { describe, expect, it } from "vitest";
import {
  createChatSession,
  deleteChatSession,
  prependChatSession,
  readPersistedChatSessions,
  renameChatSession,
  resolveActiveChatSession,
  updateChatSessionMessages,
  type ChatSession,
} from "./ChatSessionsContext";

const alpha: ChatSession = { id: "alpha", title: "Alpha", messages: [], createdAt: 100, updatedAt: 100 };
const beta: ChatSession = { id: "beta", title: "Beta", messages: [], createdAt: 200, updatedAt: 200 };

describe("browser-private chat session lifecycle", () => {
  it("creates and prepends a new active-ready conversation", () => {
    const created = createChatSession(300, "gamma");
    expect(created).toMatchObject({ id: "gamma", title: "New conversation", messages: [], createdAt: 300, updatedAt: 300 });
    expect(prependChatSession([alpha, beta], created).map(session => session.id)).toEqual(["gamma", "alpha", "beta"]);
  });

  it("renames a selected session safely and resolves the requested active conversation", () => {
    const renamed = renameChatSession([alpha, beta], "beta", "  Production plan  ", 400);
    expect(resolveActiveChatSession(renamed, "beta")).toMatchObject({ id: "beta", title: "Production plan", updatedAt: 400 });
    expect(resolveActiveChatSession(renamed, "missing").id).toBe("alpha");
  });

  it("deletes conversations without leaving the sidebar without an active session", () => {
    const afterActiveDeletion = deleteChatSession([alpha, beta], "beta", "beta");
    expect(afterActiveDeletion.sessions.map(session => session.id)).toEqual(["alpha"]);
    expect(afterActiveDeletion.activeId).toBe("alpha");

    const afterOnlyDeletion = deleteChatSession([alpha], "alpha", "alpha");
    expect(afterOnlyDeletion.sessions).toHaveLength(1);
    expect(afterOnlyDeletion.sessions[0]?.title).toBe("New conversation");
    expect(afterOnlyDeletion.activeId).toBe(afterOnlyDeletion.sessions[0]?.id);
  });

  it("persists only valid stored sessions and updates the title from the first user message", () => {
    const persisted = readPersistedChatSessions(JSON.stringify([alpha, { id: "bad", messages: "not-an-array" }]));
    expect(persisted).toEqual([alpha]);
    expect(readPersistedChatSessions("not-json")).toEqual([]);

    const updated = updateChatSessionMessages([alpha], "alpha", [
      { id: "assistant", role: "assistant", content: "How can I help?" },
      { id: "user", role: "user", content: "Build a durable chat-session lifecycle test." },
    ], 500);
    expect(updated[0]).toMatchObject({ title: "Build a durable chat-session lifecycle test.", updatedAt: 500 });
    expect(updated[0]?.messages).toHaveLength(2);
  });
});
