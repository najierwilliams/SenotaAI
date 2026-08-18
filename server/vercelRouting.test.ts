import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel deployment routing", () => {
  it("leaves /api paths available to the catch-all serverless function", async () => {
    const config = JSON.parse(
      await readFile(resolve(process.cwd(), "vercel.json"), "utf8"),
    ) as { rewrites?: Array<{ source?: string; destination?: string }> };

    expect(config.rewrites).toEqual([
      {
        source: "/:path((?!api(?:/|$)).*)",
        destination: "/index.html",
      },
    ]);
  });
});
