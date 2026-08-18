import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, ownerAccess, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

const PASSWORD_OWNER_OPEN_ID = "senota-password-owner";
const OWNER_INSTANCE_KEY = "primary";

export async function getOwnerAccess() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(ownerAccess).where(eq(ownerAccess.instanceKey, OWNER_INSTANCE_KEY)).limit(1);
  return result[0];
}

export async function getPasswordOwner() {
  const access = await getOwnerAccess();
  if (!access) return null;
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, access.userId)).limit(1);
  return result[0] ?? null;
}

export async function setupPasswordOwner(passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  if (await getOwnerAccess()) throw new Error("An owner password has already been created.");

  const now = Date.now();
  await db.insert(users).values({
    openId: PASSWORD_OWNER_OPEN_ID,
    name: "Senota owner",
    email: "owner@senota.local",
    loginMethod: "password",
    role: "admin",
    lastSignedIn: new Date(),
  }).onDuplicateKeyUpdate({ set: { name: "Senota owner", loginMethod: "password", role: "admin", lastSignedIn: new Date() } });

  const owner = await getUserByOpenId(PASSWORD_OWNER_OPEN_ID);
  if (!owner) throw new Error("Unable to create the Senota owner account.");
  await db.insert(ownerAccess).values({
    instanceKey: OWNER_INSTANCE_KEY,
    userId: owner.id,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  });
  return owner;
}

// TODO: add feature queries here as your schema grows.
