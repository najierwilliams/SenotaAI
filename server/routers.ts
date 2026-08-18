import { COOKIE_NAME } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { agentRouter } from "./routers/agent";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  agent: agentRouter,
});

export type AppRouter = typeof appRouter;
