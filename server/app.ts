import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import { runAutonomousTask } from "./agent/engine";
import {
  createAgentTask,
  getAgentScheduleByCronTaskUid,
  getOrCreateAgentSettings,
  updateAgentSchedule,
} from "./agent/db";
import { executeScheduledRun } from "./agent/scheduledExecution";
import { chatWithOllama } from "./agent/ollama";
import { buildNpcDialogueContext, isNpcMemoryCloudReady, listNpcCanonSourcesForAdmin, listPlayerNpcMemoriesForAdmin, listPlayerNpcRelationshipsForAdmin, rememberPlayerNpcInteraction, updateNpcCanonForAdmin, updatePlayerNpcMemoryForAdmin, updatePlayerNpcRelationshipForAdmin } from "./npcMemory/supabase";
import { listNpcAdminAudits, recordNpcAdminAudit } from "./npcMemory/adminAudit";
import { isAuthorizedNpcGameRequest } from "./npcMemory/gameAuth";
import { syncObsidianNpcCanon } from "./npcMemory/obsidianSync";
import { buildNpcDialogueSystemPrompt } from "./npcMemory/dialoguePrompt";
import { enforceLunaResponseFormat } from "./npcMemory/dialogueFormat";
import { isGitHubCanonWebhookConfigured, processGitHubCanonPush, verifyGitHubCanonSignature } from "./npcMemory/githubCanonSync";
import { NPC_ADMIN_COOKIE, createNpcAdminSession, isNpcAdminConfigured, isValidNpcAdminPassword, isValidNpcAdminSession } from "./npcMemory/adminAuth";
import { getSessionCookieOptions } from "./_core/cookies";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { registerOAuthRoutes } from "./_core/oauth";
import { sdk } from "./_core/sdk";
import { registerStorageProxy } from "./_core/storageProxy";
import { buildTemporalContext, resolveTimeZone } from "./temporalContext";

function readCookie(header: string | undefined, name: string) {
  return header?.split(";").map(item => item.trim()).find(item => item.startsWith(`${name}=`))?.slice(name.length + 1);
}

/**
 * Builds the production API application without importing local Vite helpers.
 * This module is shared by Vercel and the local development server.
 */
export function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb", verify: (req, _res, buffer) => { (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer); } }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.post("/api/npc/admin/session", async (req, res) => {
    if (!isNpcAdminConfigured()) return res.status(503).json({ error: "npc-admin-not-configured" });
    const password = req.body?.password;
    if (typeof password !== "string" || !isValidNpcAdminPassword(password)) return res.status(401).json({ error: "invalid-administrator-password" });
    res.cookie(NPC_ADMIN_COOKIE, await createNpcAdminSession(), { ...getSessionCookieOptions(req), maxAge: 8 * 60 * 60 * 1000 });
    return res.status(200).json({ ok: true });
  });

  const requireNpcAdmin = async (req: express.Request, res: express.Response) => {
    const token = readCookie(req.header("cookie"), NPC_ADMIN_COOKIE);
    if (await isValidNpcAdminSession(token)) return true;
    res.status(401).json({ error: "npc-administrator-session-required" });
    return false;
  };

  app.get("/api/npc/admin/status", async (req, res) => {
    const token = readCookie(req.header("cookie"), NPC_ADMIN_COOKIE);
    return res.status(await isValidNpcAdminSession(token) ? 200 : 401).json({ configured: isNpcAdminConfigured(), authenticated: await isValidNpcAdminSession(token) });
  });

  app.get("/api/npc/admin/canon", async (req, res) => {
    if (!await requireNpcAdmin(req, res)) return;
    try {
      return res.json({ canon: await listNpcCanonSourcesForAdmin() });
    } catch (error) {
      return res.status(503).json({ error: error instanceof Error ? error.message : "NPC canon is unavailable." });
    }
  });

  app.patch("/api/npc/admin/canon/:npcId", async (req, res) => {
    if (!await requireNpcAdmin(req, res)) return;
    try {
      const patch = req.body ?? {};
      await updateNpcCanonForAdmin(req.params.npcId, patch);
      await recordNpcAdminAudit("update", "canon", req.params.npcId, Object.keys(patch));
      return res.json({ ok: true });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Unable to update NPC canon." });
    }
  });

  app.get("/api/npc/admin/memories", async (req, res) => {
    if (!await requireNpcAdmin(req, res)) return;
    try {
      const npcId = typeof req.query.npcId === "string" ? req.query.npcId : undefined;
      const playerId = typeof req.query.playerId === "string" ? req.query.playerId : undefined;
      const includeInactive = req.query.includeInactive === "true";
      return res.json({ memories: await listPlayerNpcMemoriesForAdmin({ npcId, playerId, includeInactive }) });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "NPC memories are unavailable." });
    }
  });

  app.patch("/api/npc/admin/memories/:memoryId", async (req, res) => {
    if (!await requireNpcAdmin(req, res)) return;
    try {
      const patch = req.body ?? {};
      await updatePlayerNpcMemoryForAdmin(req.params.memoryId, patch);
      await recordNpcAdminAudit("update", "memory", req.params.memoryId, Object.keys(patch));
      return res.json({ ok: true });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Unable to update NPC memory." });
    }
  });

  app.get("/api/npc/admin/relationships", async (req, res) => {
    if (!await requireNpcAdmin(req, res)) return;
    try {
      const npcId = typeof req.query.npcId === "string" ? req.query.npcId : undefined;
      const playerId = typeof req.query.playerId === "string" ? req.query.playerId : undefined;
      return res.json({ relationships: await listPlayerNpcRelationshipsForAdmin({ npcId, playerId }) });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "NPC relationships are unavailable." });
    }
  });

  app.patch("/api/npc/admin/relationships/:playerId/:npcId", async (req, res) => {
    if (!await requireNpcAdmin(req, res)) return;
    try {
      const patch = req.body ?? {};
      await updatePlayerNpcRelationshipForAdmin(req.params.playerId, req.params.npcId, patch);
      await recordNpcAdminAudit("update", "relationship", `${req.params.playerId}:${req.params.npcId}`, Object.keys(patch));
      return res.json({ ok: true });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Unable to update NPC relationship." });
    }
  });

  app.get("/api/npc/admin/audit", async (req, res) => {
    if (!await requireNpcAdmin(req, res)) return;
    const audits = await listNpcAdminAudits();
    return res.json({ audits: audits ?? [], available: audits !== null });
  });

  app.post("/api/npc/canon/github-webhook", async (req, res) => {
    const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody;
    if (!isGitHubCanonWebhookConfigured() || !rawBody || !verifyGitHubCanonSignature(rawBody, req.header("x-hub-signature-256"))) return res.status(401).json({ error: "invalid-github-webhook-signature" });
    if (req.header("x-github-event") === "ping") return res.status(200).json({ ok: true, configured: true });
    if (req.header("x-github-event") !== "push") return res.status(202).json({ ok: true, skipped: "unsupported-event" });
    try {
      return res.status(202).json(await processGitHubCanonPush(req.body));
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "GitHub canon synchronization failed." });
    }
  });

  app.post("/api/npc/canon/sync", async (req, res) => {
    if (!isAuthorizedNpcGameRequest(req.header("x-senota-game-key"))) return res.status(401).json({ error: "unauthorized-game-backend" });
    try {
      const { noteContent, obsidianPath } = req.body ?? {};
      if (typeof noteContent !== "string" || typeof obsidianPath !== "string") return res.status(400).json({ error: "noteContent and obsidianPath are required" });
      return res.status(200).json(await syncObsidianNpcCanon(noteContent, obsidianPath));
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "Obsidian canon sync failed." });
    }
  });

  app.post("/api/npc/dialogue", async (req, res) => {
    if (!isAuthorizedNpcGameRequest(req.header("x-senota-game-key"))) return res.status(401).json({ error: "unauthorized-game-backend" });
    if (!isNpcMemoryCloudReady()) return res.status(503).json({ error: "npc-memory-not-configured" });
    try {
      const { playerId, npcId, message, memory, timeZone } = req.body ?? {};
      if (typeof playerId !== "string" || typeof npcId !== "string" || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ error: "playerId, npcId, and message are required" });
      }
      if (timeZone !== undefined && typeof timeZone !== "string") return res.status(400).json({ error: "timeZone must be a valid IANA time zone." });
      try { resolveTimeZone(timeZone); } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : "timeZone is invalid." }); }
      const context = await buildNpcDialogueContext(playerId, npcId);
      const response = await chatWithOllama({
        messages: [
          {
            role: "system",
            content: buildNpcDialogueSystemPrompt(context, timeZone, message),
          },
          { role: "user", content: message.trim() },
        ],
      });
      const content = enforceLunaResponseFormat(message, response.content, context.npcId);
      if (memory && typeof memory.summary === "string" && typeof memory.memoryKind === "string") {
        await rememberPlayerNpcInteraction({
          playerId,
          npcId,
          memoryKind: memory.memoryKind,
          summary: memory.summary,
          importance: typeof memory.importance === "number" ? memory.importance : undefined,
          expiresAt: typeof memory.expiresAt === "string" ? memory.expiresAt : null,
        });
      }
      return res.json({ npcId: context.npcId, displayName: context.displayName, content, memoriesUsed: context.playerMemories.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : "NPC dialogue failed.";
      return res.status(400).json({ error: message });
    }
  });

  app.post("/api/agent/tasks/:taskId/run", async (req, res) => {
    let streamClosed = false;
    try {
      const taskId = Number(req.params.taskId);
      if (!Number.isInteger(taskId) || taskId <= 0) return res.status(400).json({ error: "invalid-task-id" });

      res.status(200);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      res.write(`event: connected\ndata: ${JSON.stringify({ taskId, timestamp: Date.now() })}\n\n`);
      res.on("close", () => { streamClosed = true; });

      await runAutonomousTask({
        taskId,
        userId: Number(process.env.SENOTA_DIRECT_USER_ID || 0),
        emit: payload => {
          if (!streamClosed) res.write(`event: agent\ndata: ${JSON.stringify(payload)}\n\n`);
        },
      });
      if (!streamClosed) res.end();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (res.headersSent) {
        if (!streamClosed) res.write(`event: error\ndata: ${JSON.stringify({ message, timestamp: Date.now() })}\n\n`);
        if (!streamClosed) res.end();
      } else {
        res.status(500).json({ error: message });
      }
    }
  });

  app.post("/api/scheduled/agent-run", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const schedule = await getAgentScheduleByCronTaskUid(user.taskUid);
      if (!schedule || schedule.status !== "active") return res.json({ ok: true, skipped: "orphan-or-paused" });

      const settings = await getOrCreateAgentSettings(schedule.userId);
      const execution = await executeScheduledRun({
        schedule,
        repository: settings.githubRepository,
        createTask: createAgentTask,
        runTask: (taskId, userId) => runAutonomousTask({ taskId, userId }),
        updateSchedule: updateAgentSchedule,
      });
      res.json({ ok: true, ...execution });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message, timestamp: Date.now(), context: { url: req.originalUrl } });
    }
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  return app;
}
