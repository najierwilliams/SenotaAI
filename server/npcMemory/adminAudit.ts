import { desc } from "drizzle-orm";
import { npcAdminAudits } from "../../drizzle/schema";
import { getDb } from "../db";

export async function recordNpcAdminAudit(action: string, recordType: "canon" | "memory" | "relationship", recordId: string, fields: string[]) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(npcAdminAudits).values({ action, recordType, recordId, fields, createdAt: Date.now() });
  return true;
}

export async function listNpcAdminAudits(limit = 100) {
  const db = await getDb();
  if (!db) return null;
  return db.select().from(npcAdminAudits).orderBy(desc(npcAdminAudits.createdAt)).limit(Math.min(Math.max(limit, 1), 200));
}
