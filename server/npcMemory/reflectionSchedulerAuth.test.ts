import { generateKeyPairSync, sign } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyGitHubActionsReflectionToken } from "./reflectionSchedulerAuth";

function encode(value: unknown) { return Buffer.from(JSON.stringify(value)).toString("base64url"); }

function signedToken(overrides: Record<string, unknown> = {}) {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const header = encode({ alg: "RS256", kid: "test-key" });
  const payload = encode({ iss: "https://token.actions.githubusercontent.com", aud: "senota-reflection", repository: "najierwilliams/SenotaAI", ref: "refs/heads/main", exp: Math.floor(Date.now() / 1000) + 600, ...overrides });
  const signature = sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), privateKey).toString("base64url");
  return { token: `${header}.${payload}.${signature}`, jwk: publicKey.export({ format: "jwk" }) as import("crypto").JsonWebKey };
}

describe("GitHub Actions reflection scheduler identity", () => {
  it("accepts a current signed identity from the expected repository and branch", async () => {
    const { token, jwk } = signedToken();
    await expect(verifyGitHubActionsReflectionToken(`Bearer ${token}`, async () => new Response(JSON.stringify({ keys: [{ ...jwk, kid: "test-key" }] })))).resolves.toBe(true);
  });

  it("rejects an otherwise valid token from another repository", async () => {
    const { token, jwk } = signedToken({ repository: "other/repository" });
    await expect(verifyGitHubActionsReflectionToken(`Bearer ${token}`, async () => new Response(JSON.stringify({ keys: [{ ...jwk, kid: "test-key" }] })))).resolves.toBe(false);
  });
});
