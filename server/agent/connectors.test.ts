import { afterEach, describe, expect, it, vi } from "vitest";
import { executeConnectorTool, validateRepositoryPath } from "./connectors";

const context = { taskId: 1, userId: 1, repository: "najierwilliams/SenotaAI", workBranch: "senota/task-1", vercelProject: "prj_senota" };

describe("repository connector path guard", () => {
  it("accepts a repository-relative source path", () => {
    expect(() => validateRepositoryPath("client/src/App.tsx")).not.toThrow();
  });

  it("rejects absolute and traversal paths", () => {
    expect(() => validateRepositoryPath("/etc/passwd")).toThrow();
    expect(() => validateRepositoryPath("../../.env")).toThrow();
    expect(() => validateRepositoryPath("src\\..\\secret")).toThrow();
  });

  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("uses GitHub repository and tree endpoints when inspecting a codebase", async () => {
    vi.stubEnv("GITHUB_TOKEN", "test-github-token");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ default_branch: "main" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ tree: [{ path: "client/src/App.tsx", type: "blob", size: 42 }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await executeConnectorTool("list_repository_files", {}, context) as Array<{ path: string }>;

    expect(result).toEqual([{ path: "client/src/App.tsx", size: 42 }]);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/repos/najierwilliams/SenotaAI");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/git/trees/main?recursive=1");
  });

  it("uses Vercel deployment status endpoint for the configured project", async () => {
    vi.stubEnv("VERCEL_TOKEN", "test-vercel-token");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ deployments: [{ uid: "dpl_1", url: "senota.vercel.app", readyState: "READY", target: "preview" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(executeConnectorTool("get_deployment_status", {}, context)).resolves.toMatchObject({ id: "dpl_1", url: "https://senota.vercel.app", status: "READY" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/v6/deployments?projectId=prj_senota&limit=1");
  });
});
