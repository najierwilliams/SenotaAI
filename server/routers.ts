import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { agentRouter } from "./routers/agent";
import { z } from "zod";
import { authenticateOwnerPassword, clearOwnerSession, establishOwnerPassword, getOwnerSessionUser, setOwnerSession } from "./ownerAuth";
import { getOwnerAccess } from "./db";

const passwordInput = z.object({ password: z.string().min(1), confirmPassword: z.string().optional() });

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    status: publicProcedure.query(async () => ({ configured: Boolean(await getOwnerAccess()) })),
    setup: publicProcedure.input(passwordInput).mutation(async ({ ctx, input }) => {
      if (input.password !== input.confirmPassword) throw new Error("Passwords do not match.");
      await establishOwnerPassword(input.password);
      return { configured: true } as const;
    }),
    login: publicProcedure.input(z.object({ password: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const user = await authenticateOwnerPassword(input.password);
      if (!user) throw new Error("Incorrect password.");
      await setOwnerSession(ctx.req, ctx.res, user);
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      clearOwnerSession(ctx.req, ctx.res);
      return {
        success: true,
      } as const;
    }),
  }),
  agent: agentRouter,
});

export type AppRouter = typeof appRouter;
