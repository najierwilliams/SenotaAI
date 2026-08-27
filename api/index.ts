import type { Request, Response } from "express";
import expressApp from "../server/vercel-entry";

/**
 * The Queue consumer is an exact, private Vercel function. Ordinary API routes
 * are rewritten to this stable /api entrypoint before they reach the released
 * Express router. The original route is carried in the `path` query parameter.
 */
function restoreExpressApiPath(request: Request): void {
  const originalUrl = request.originalUrl || request.url || "/";
  const queryIndex = originalUrl.indexOf("?");
  const path = queryIndex === -1 ? originalUrl : originalUrl.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : originalUrl.slice(queryIndex);

  if (path.startsWith("/api/")) {
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
