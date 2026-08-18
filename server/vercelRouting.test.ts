import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel deployment routing", () => {
  it("leaves /api paths available to the catch-all serverless function", async () => {
    const config = JSON.parse(
      await readFile(resolve(process.cwd(), "vercel.json"), "utf8"),
    ) as { rewrites?: Array<{ source?: string; destination?: string }> };

    expect(config.framework).toBe("express");
    expect(config.outputDirectory).toBeUndefined();
    expect(config.functions).toEqual({
      "server.js": {
        includeFiles: "dist/**",
      },
    });
    expect(config.rewrites).toEqual([
      {
        source: "/:path((?!api(?:/|$)).*)",
        destination: "/index.html",
      },
    ]);
  });

  it("uses the built Express application from a recognized root entry", async () => {
    const functionEntry = await readFile(
      resolve(process.cwd(), "server.js"),
      "utf8",
    );

    expect(functionEntry).toContain('import express from "express"');
    expect(functionEntry).toContain('import { createApp } from "./dist/index.js"');
    expect(functionEntry).toContain("export default createApp()");
  });
});
