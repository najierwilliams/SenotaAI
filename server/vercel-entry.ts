import express from "express";
import path from "path";
import { createApp } from "./app";

// The Vercel build emits this module to the recognized root `server.js` entry.
// It imports no development-only Vite code and keeps Express detection explicit.
void express;
const app = createApp();
const publicDirectory = path.resolve(process.cwd(), "public");
const applicationShellCacheControl = "no-store, max-age=0, must-revalidate";
const hashedAssetCacheControl = "public, max-age=31556952, immutable";

// The generated Vite assets are included in the function package on Vercel.
// Register this after the API routes so `/api/*` always reaches the router.
app.use(express.static(publicDirectory, {
  setHeaders(res, filePath) {
    res.setHeader(
      "Cache-Control",
      path.basename(filePath) === "index.html" ? applicationShellCacheControl : hashedAssetCacheControl,
    );
  },
}));
app.use("*", (_req, res) => {
  res.setHeader("Cache-Control", applicationShellCacheControl);
  res.sendFile(path.resolve(publicDirectory, "index.html"));
});

export default app;
