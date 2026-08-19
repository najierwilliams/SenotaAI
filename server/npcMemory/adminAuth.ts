import { timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

export const NPC_ADMIN_COOKIE = "senota_npc_admin";
const encoder = new TextEncoder();

function adminPassword() {
  return process.env.NPC_ADMIN_PASSWORD?.trim() ?? "";
}

function sessionKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required for NPC administration sessions.");
  return encoder.encode(secret);
}

export function isNpcAdminConfigured() {
  return adminPassword().length >= 16;
}

export function isValidNpcAdminPassword(candidate: string) {
  const expected = adminPassword();
  if (!expected || !candidate) return false;
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
}

export async function createNpcAdminSession() {
  return new SignJWT({ scope: "npc-admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(sessionKey());
}

export async function isValidNpcAdminSession(token: string | undefined) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, sessionKey());
    return payload.scope === "npc-admin";
  } catch {
    return false;
  }
}
