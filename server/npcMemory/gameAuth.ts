import { timingSafeEqual } from "node:crypto";

export function isAuthorizedNpcGameRequest(providedKey: string | undefined) {
  const expectedKey = process.env.NPC_GAME_API_KEY;
  if (!expectedKey || !providedKey) return false;
  const expected = Buffer.from(expectedKey);
  const provided = Buffer.from(providedKey);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
