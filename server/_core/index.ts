import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { sdk } from "./sdk";
import { runAutonomousTask } from "../agent/engine";
import { createAgentTask, getAgentScheduleByCronTaskUid, getOrCreateAgentSettings, updateAgentSchedule } from "../agent/db";
import { buildScheduledTaskInput } from "../agent/schedule";
import { executeScheduledRun } from "../agent/scheduledExecution";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post("/api/agent/tasks/:taskId/run", async (req, res) => {
    let streamClosed = false;
    try {
      const user = await sdk.authenticateRequest(req);
      if (user.isCron) return res.status(403).json({ error: "interactive-user-only" });
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
        userId: user.id,
        emit: (payload) => {
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
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
