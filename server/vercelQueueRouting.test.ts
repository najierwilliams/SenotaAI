import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel Queue and Express function layout", () => {
  it("keeps source-discovered wrappers while including their bundled server artifacts", async () => {
    const config = JSON.parse(await readFile(resolve(process.cwd(), "vercel.json"), "utf8")) as { functions: Record<string, { includeFiles?: string; experimentalTriggers?: unknown }>; rewrites: Array<{ source: string; destination: string }> };
    const pkg = JSON.parse(await readFile(resolve(process.cwd(), "package.json"), "utf8")) as { scripts: { build: string } };
    expect(config.functions["api/index.ts"].includeFiles).toBe("server.js");
    expect(config.functions["api/luna/queue-consumer.ts"].includeFiles).toBeUndefined();
    expect(config.functions["api/luna/queue-consumer.ts"].experimentalTriggers).toEqual([{ type: "queue/v2beta", topic: "luna_worker_v1" }]);
    expect(config.rewrites).toContainEqual({ source: "/api/:path((?!luna/queue-consumer(?:/|$)).*)", destination: "/api" });
    expect(pkg.scripts.build).toContain("--outfile=server.js");
  });
});
