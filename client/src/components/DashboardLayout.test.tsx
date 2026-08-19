import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const noop = vi.fn();
const storage = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  },
});

vi.mock("wouter", () => ({ useLocation: () => ["/", noop] }));
vi.mock("@/hooks/useMobile", () => ({ useIsMobile: () => false }));
vi.mock("@/contexts/ChatSessionsContext", () => ({
  useChatSessions: () => ({
    sessions: [
      { id: "planning", title: "Project planning", messages: [], createdAt: 1, updatedAt: 2 },
      { id: "debugging", title: "Debug notes", messages: [], createdAt: 1, updatedAt: 1 },
    ],
    activeSession: { id: "planning", title: "Project planning", messages: [], createdAt: 1, updatedAt: 2 },
    createSession: noop,
    selectSession: noop,
    renameSession: noop,
    deleteSession: noop,
    updateMessages: noop,
  }),
}));

import DashboardLayout from "./DashboardLayout";

describe("conversation sidebar controls", () => {
  it("renders accessible create, rename, and delete controls for displayed chats", () => {
    Object.assign(globalThis, { React });
    const html = renderToStaticMarkup(<DashboardLayout><div>Workspace</div></DashboardLayout>);

    expect(html).toContain('aria-label="New conversation"');
    expect(html).toContain('aria-label="Rename Project planning"');
    expect(html).toContain('aria-label="Delete Project planning"');
    expect(html).toContain('aria-label="Rename Debug notes"');
    expect(html).toContain('aria-label="Delete Debug notes"');
  });
});
