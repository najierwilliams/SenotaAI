import { createPublicKey, verify } from "crypto";

const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_OIDC_JWKS = `${GITHUB_OIDC_ISSUER}/.well-known/jwks`;
const EXPECTED_REPOSITORY = "najierwilliams/SenotaAI";
const EXPECTED_REF = "refs/heads/main";
const EXPECTED_AUDIENCE = "senota-reflection";

type JwtHeader = { alg?: string; kid?: string };
type JwtPayload = { iss?: string; aud?: string | string[]; repository?: string; ref?: string; exp?: number; nbf?: number };
type JsonWebKeySet = { keys?: import("crypto").JsonWebKey[] };

function parsePart<T>(value: string): T | null {
  try { return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T; } catch { return null; }
}

export async function verifyGitHubActionsReflectionToken(authorization: string | undefined, fetcher: typeof fetch = fetch, now = Date.now()) {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return false;
  const [encodedHeader, encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature || extra) return false;
  const header = parsePart<JwtHeader>(encodedHeader);
  const payload = parsePart<JwtPayload>(encodedPayload);
  const audiences = Array.isArray(payload?.aud) ? payload.aud : [payload?.aud];
  if (!header?.kid || header.alg !== "RS256" || payload?.iss !== GITHUB_OIDC_ISSUER || !audiences.includes(EXPECTED_AUDIENCE) || payload.repository !== EXPECTED_REPOSITORY || payload.ref !== EXPECTED_REF || !payload.exp || payload.exp * 1000 <= now || (payload.nbf && payload.nbf * 1000 > now)) return false;
  try {
    const response = await fetcher(GITHUB_OIDC_JWKS);
    if (!response.ok) return false;
    const jwks = await response.json() as JsonWebKeySet;
    const key = jwks.keys?.find((candidate) => candidate.kid === header.kid && candidate.kty === "RSA");
    if (!key) return false;
    return verify("RSA-SHA256", Buffer.from(`${encodedHeader}.${encodedPayload}`), createPublicKey({ key, format: "jwk" }), Buffer.from(encodedSignature, "base64url"));
  } catch {
    return false;
  }
}
