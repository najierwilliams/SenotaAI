import { createApp } from "./server/_core/index";

// Vercel detects this root Express entry and invokes it as the application
// function. Static browser assets are emitted to public/ during the Vercel build.
export default createApp();
