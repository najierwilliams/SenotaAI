import { describe, expect, it } from "vitest";

type VercelProject = { id: string; name: string };

describe("SenotaAI Vercel visibility", () => {
  it("can discover the SenotaAI Vercel project with the configured token", async () => {
    const token = process.env.VERCEL_TOKEN;
    expect(token).toBeTruthy();
    const response = await fetch("https://api.vercel.com/v9/projects?limit=100", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20_000),
    });
    expect(response.status).toBe(200);
    const payload = await response.json() as { projects?: VercelProject[] };
    const project = payload.projects?.find((item) => item.name.toLowerCase() === "senota-ai");
    expect(project).toBeTruthy();
    expect(project?.id).toMatch(/^prj_/);
  }, 25_000);
});
