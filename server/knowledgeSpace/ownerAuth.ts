import { timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

export const KNOWLEDGE_OWNER_COOKIE = "senota_knowledge_owner";
export const KNOWLEDGE_OWNER_ID = 1;
const encoder = new TextEncoder();

function administratorPassword() {
  return process.env.NPC_ADMIN_PASSWORD?.trim() ?? "";
}

function sessionKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required for Knowledge Space owner sessions.");
  return encoder.encode(secret);
}

/** The existing NPC administrator credential is the single owner unlock. */
export function isKnowledgeOwnerConfigured() {
  return administratorPassword().length >= 16;
}

export function isValidKnowledgeOwnerPassword(candidate: string) {
  const expected = administratorPassword();
  if (!expected || !candidate) return false;
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
}

export async function createKnowledgeOwnerSession() {
  return new SignJWT({ scope: "knowledge-owner", owner: "single-administrator" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(sessionKey());
}

export async function isValidKnowledgeOwnerSession(token: string | undefined) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, sessionKey());
    return payload.scope === "knowledge-owner" && payload.owner === "single-administrator";
  } catch {
    return false;
  }
}

export function readKnowledgeCookie(header: string | undefined, name = KNOWLEDGE_OWNER_COOKIE) {
  return header?.split(";").map(item => item.trim()).find(item => item.startsWith(`${name}=`))?.slice(name.length + 1);
}
