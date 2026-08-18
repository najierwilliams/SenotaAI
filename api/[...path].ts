import { createApp } from "../server/_core/index";

// Vercel maps /api/* to this catch-all function. The Express application keeps
// the existing tRPC, OAuth, streamed agent, schedule, and storage routes intact.
export default createApp();
