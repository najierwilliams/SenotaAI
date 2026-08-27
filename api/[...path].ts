import type { Request, Response } from "express";
import expressApp from "../server/vercel-entry";

/**
 * Vercel resolves files under /api before it reaches the captured root server.
 * Keep normal application API requests on the existing Express router, but let
 * the exact private Queue consumer route take precedence over this catch-all.
 *
 * The original pathname is restored defensively because Vercel's catch-all
 * function route may expose it as a route-relative path. Express must always
 * receive the released `/api/...` URL to preserve tRPC and owner-session APIs.
 */
function restoreExpressApiPath(request: Request): void {
  const originalUrl = request.originalUrl || request.url || "/";
  const queryIndex = originalUrl.indexOf("?");
  const path = queryIndex === -1 ? originalUrl : originalUrl.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : originalUrl.slice(queryIndex);

  if (path === "/api" || path.startsWith("/api/")) {
    return;
  }

  const routeValue = request.query?.path;
  const routePath = Array.isArray(routeValue) ? routeValue.join("/") : routeValue;
  const normalizedPath = typeof routePath === "string"
    ? routePath.replace(/^\/+/, "").replace(/\\/g, "/")
    : "";

  if (!normalizedPath || normalizedPath === "." || normalizedPath.split("/").some((segment) => segment === "..")) {
    request.url = `/api${query}`;
    return;
  }

  request.url = `/api/${normalizedPath}${query}`;
}

export default function expressApiRelay(request: Request, response: Response) {
  restoreExpressApiPath(request);
  return expressApp(request, response);
}

export { restoreExpressApiPath };
