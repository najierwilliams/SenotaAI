import { scrypt as scryptCallback, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { parse } from "cookie";
import type { User } from "../drizzle/schema";
import { getPasswordOwner, getOwnerAccess, setupPasswordOwner } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";

const scrypt = promisify(scryptCallback);
export const OWNER_SESSION_COOKIE = "senota_owner_session";
const OWNER_SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

type OwnerSessionPayload = { userId: number; sessionVersion: number };

function secretKey() {
  if (!ENV.cookieSecret) throw new Error("Server session secret is not configured.");
  return new TextEncoder().encode(ENV.cookieSecret);
}

export function passwordValidationMessage(password: string) {
  if (password.length < 12) return "Use at least 12 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use a mix of letters and numbers.";
  return null;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, encodedSalt, encodedHash] = passwordHash.split("$");
  if (algorithm !== "scrypt" || !encodedSalt || !encodedHash) return false;
  const salt = Buffer.from(encodedSalt, "base64url");
  const expected = Buffer.from(encodedHash, "base64url");
  const actual = await scrypt(password, salt, expected.length) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function createOwnerSessionToken(payload: OwnerSessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

async function readOwnerSessionToken(token: string) {
  const verified = await jwtVerify(token, secretKey());
  const userId = Number(verified.payload.userId);
  const sessionVersion = Number(verified.payload.sessionVersion);
  if (!Number.isInteger(userId) || !Number.isInteger(sessionVersion)) return null;
  return { userId, sessionVersion } satisfies OwnerSessionPayload;
}

export async function getOwnerSessionUser(req: Request): Promise<User | null> {
  const token = parse(req.headers.cookie ?? "")[OWNER_SESSION_COOKIE];
  if (!token) return null;
  try {
    const session = await readOwnerSessionToken(token);
    if (!session) return null;
    const access = await getOwnerAccess();
    if (!access || access.userId !== session.userId || access.sessionVersion !== session.sessionVersion) return null;
    return await getPasswordOwner();
  } catch {
    return null;
  }
}

export async function establishOwnerPassword(password: string) {
  const message = passwordValidationMessage(password);
  if (message) throw new Error(message);
  return setupPasswordOwner(await hashPassword(password));
}

export async function authenticateOwnerPassword(password: string) {
  const access = await getOwnerAccess();
  if (!access || !(await verifyPassword(password, access.passwordHash))) return null;
  return getPasswordOwner();
}

export async function setOwnerSession(req: Request, res: Response, user: User) {
  const access = await getOwnerAccess();
  if (!access || access.userId !== user.id) throw new Error("Owner access is not configured.");
  const token = await createOwnerSessionToken({ userId: user.id, sessionVersion: access.sessionVersion });
  res.cookie(OWNER_SESSION_COOKIE, token, {
    ...getSessionCookieOptions(req),
    sameSite: "lax",
    maxAge: OWNER_SESSION_LIFETIME_MS,
  });
}

export function clearOwnerSession(req: Request, res: Response) {
  res.clearCookie(OWNER_SESSION_COOKIE, {
    ...getSessionCookieOptions(req),
    sameSite: "lax",
    maxAge: -1,
  });
}
