import { createApp } from "./dist/index.js";

// Vercel recognizes this root Express entry and routes non-static requests to
// the bundled application. Public Vite assets continue to be served by Vercel's CDN.
export default createApp();
