import { describe, expect, it } from "vitest";

const token = process.env.NPC_CANON_WRITE_TOKEN;
const repository = "najierwilliams/SenotaAI-NPC-Canon";

describe.runIf(Boolean(token))("NPC canon write credential", () => {
  it("can read the dedicated private canon vault", async () => {
    const response = await fetch(`https://api.github.com/repos/${repository}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    expect(response.status).toBe(200);
    const payload = await response.json() as { full_name?: string; private?: boolean };
    expect(payload).toMatchObject({ full_name: repository, private: true });
  });
});
