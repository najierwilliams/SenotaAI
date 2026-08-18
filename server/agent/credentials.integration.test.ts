import { describe, expect, it } from "vitest";

async function authenticatedStatus(url: string, token: string, additionalHeaders: Record<string, string> = {}) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, ...additionalHeaders },
    signal: AbortSignal.timeout(20_000),
  });
  return response.status;
}

describe("configured connector credentials", () => {
  it("authenticates the configured GitHub token without exposing its value", async () => {
    const token = process.env.GITHUB_TOKEN;
    expect(token).toBeTruthy();
    const status = await authenticatedStatus("https://api.github.com/user", token!, {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    });
    expect(status).toBe(200);
  }, 25_000);

  it("authenticates the configured Vercel token against an accessible project-list endpoint without exposing its value", async () => {
    const token = process.env.VERCEL_TOKEN;
    expect(token).toBeTruthy();
    const status = await authenticatedStatus("https://api.vercel.com/v9/projects?limit=1", token!);
    expect(status).toBe(200);
  }, 25_000);
});
