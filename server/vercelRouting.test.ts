import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel deployment routing", () => {
  it("keeps ordinary /api routes on the released Express router when an exact private Queue function exists", async () => {
    const config = JSON.parse(
      await readFile(resolve(process.cwd(), "vercel.json"), "utf8"),
    ) as {
      framework?: string;
      outputDirectory?: string;
      functions?: Record<string, unknown>;
      rewrites?: Array<{ source?: string; destination?: string }>;
      headers?: Array<{ source?: string; headers?: Array<{ key?: string; value?: string }> }>;
    };
    const relay = await readFile(
      resolve(process.cwd(), "api", "[...path].ts"),
      "utf8",
    );

    expect(config.framework).toBe("express");
    expect(config.outputDirectory).toBeUndefined();
    expect(config.functions).toEqual({
      "server.js": {
        includeFiles: "public/**",
      },
      "api/luna/queue-consumer.ts": {
        experimentalTriggers: [
          { type: "queue/v2beta", topic: "luna_worker_v1" },
        ],
      },
    });
    expect(config.rewrites).toEqual([
      {
        source: "/:path((?!api(?:/|$)|assets(?:/|$)).*)",
        destination: "/index.html",
      },
    ]);
    expect(config.headers).toEqual([
      {
        source: "/index.html",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" }],
      },
      {
        source: "/:path((?!api(?:/|$)|assets(?:/|$)).*)",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" }],
      },
      {
        source: "/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31556952, immutable" }],
      },
    ]);

    expect(relay).toContain('import expressApp from "../server/vercel-entry"');
    expect(relay).toContain("function restoreExpressApiPath");
    expect(relay).toContain('path === "/api" || path.startsWith("/api/")');
    expect(relay).toContain("request.url = `/api/${normalizedPath}${query}`");
    expect(relay).toContain("return expressApp(request, response)");
  });

  it("uses the built Express application from a recognized root entry", async () => {
    const functionEntry = await readFile(
      resolve(process.cwd(), "server", "vercel-entry.ts"),
      "utf8",
    );

    expect(functionEntry).toContain('import express from "express"');
    expect(functionEntry).toContain('import { createApp } from "./app"');
    expect(functionEntry).toContain("const applicationShellCacheControl = \"no-store, max-age=0, must-revalidate\"");
    expect(functionEntry).toContain("const hashedAssetCacheControl = \"public, max-age=31556952, immutable\"");
    expect(functionEntry).toContain("app.use(express.static(publicDirectory, {");
    expect(functionEntry).toContain('path.basename(filePath) === "index.html" ? applicationShellCacheControl : hashedAssetCacheControl');
    expect(functionEntry).toContain('res.setHeader("Cache-Control", applicationShellCacheControl)');
  });
});
