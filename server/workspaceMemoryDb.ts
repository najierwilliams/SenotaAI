import { and, desc, eq } from "drizzle-orm";
import { type WorkspaceMemoryRecord, workspaceMemories } from "../drizzle/schema";
import { getDb } from "./db";

export const WORKSPACE_PROJECT_KEY = "senota-ai";

export type CloudMemoryInput = {
  workspaceId: string;
  clientMemoryId: string;
  category: string;
  content: string;
  importance: number;
  source?: string;
};

async function optionalDb() {
  return getDb();
}

export async function listWorkspaceMemories(workspaceId: string): Promise<WorkspaceMemoryRecord[] | null> {
  const db = await optionalDb();
  if (!db) return null;
  return db.select()
    .from(workspaceMemories)
    .where(and(
      eq(workspaceMemories.workspaceId, workspaceId),
      eq(workspaceMemories.projectKey, WORKSPACE_PROJECT_KEY),
      eq(workspaceMemories.isActive, true),
    ))
    .orderBy(desc(workspaceMemories.importance), desc(workspaceMemories.updatedAt))
    .limit(60);
}

export async function syncWorkspaceMemory(input: CloudMemoryInput): Promise<WorkspaceMemoryRecord | null> {
  const db = await optionalDb();
  if (!db) return null;
  const existing = await db.select()
    .from(workspaceMemories)
    .where(and(
      eq(workspaceMemories.workspaceId, input.workspaceId),
      eq(workspaceMemories.clientMemoryId, input.clientMemoryId),
    ))
    .limit(1);
  const now = Date.now();

  if (existing[0]) {
    await db.update(workspaceMemories).set({
      category: input.category,
      content: input.content,
      importance: input.importance,
      source: input.source ?? "device-sync",
      isActive: true,
      updatedAt: now,
    }).where(eq(workspaceMemories.id, existing[0].id));
    const updated = await db.select().from(workspaceMemories).where(eq(workspaceMemories.id, existing[0].id)).limit(1);
    return updated[0] ?? null;
  }

  const inserted = await db.insert(workspaceMemories).values({
    ...input,
    projectKey: WORKSPACE_PROJECT_KEY,
    source: input.source ?? "device-sync",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }).$returningId();
  const created = await db.select().from(workspaceMemories).where(eq(workspaceMemories.id, Number(inserted[0]?.id))).limit(1);
  return created[0] ?? null;
}

export async function deactivateWorkspaceMemory(workspaceId: string, clientMemoryId: string): Promise<boolean | null> {
  const db = await optionalDb();
  if (!db) return null;
  const existing = await db.select()
    .from(workspaceMemories)
    .where(and(
      eq(workspaceMemories.workspaceId, workspaceId),
      eq(workspaceMemories.clientMemoryId, clientMemoryId),
      eq(workspaceMemories.projectKey, WORKSPACE_PROJECT_KEY),
    ))
    .limit(1);
  if (!existing[0]) return false;
  await db.update(workspaceMemories).set({ isActive: false, updatedAt: Date.now() }).where(eq(workspaceMemories.id, existing[0].id));
  return true;
}
