import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { Request, Response } from "express";
import { afterEach, describe, expect, it } from "vitest";
import expressApiRelay from "../api/[...path]";

const openServers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));
});

describe("Vercel catch-all API relay", () => {
  it("preserves the owner-status API response as JSON rather than the SPA shell", async () => {
    const server = createServer((request, response) => {
      Object.assign(request, { query: { path: ["knowledge", "owner", "status"] } });
      expressApiRelay(request as Request, response as Response);
    });
    openServers.push(server);

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/knowledge/owner/status`);

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toMatchObject({
      configured: expect.any(Boolean),
      authenticated: false,
    });
  });
});
