import { createApp } from "../dist/index.js";

// Vercel maps /api/* to this JavaScript catch-all. Using the production bundle
// avoids Vercel's separate TypeScript function compiler while retaining the
// Express app and all of its tRPC, SSE, schedule, and storage routes.
export default createApp();
