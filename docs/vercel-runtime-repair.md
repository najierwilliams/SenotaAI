# Vercel Runtime Repair Notes

The SenotaAI production deployment returned the bundled server output as page content because Vercel detected the project as a static build without an explicit Express entry point and static public output configuration. Local production output contains two distinct artifacts: `dist/index.js` for the Node/Express server and `dist/public/index.html` plus client assets for the Vite dashboard.

Vercel’s Express guidance requires an application file at a supported root location that imports Express and default-exports the app. Vercel serves public static assets through its CDN and does not use `express.static()` for those assets. The corrective design therefore makes the React build target `public/`, exposes the Express API from a root server entry, and adds a single-page-app fallback rewrite while retaining API routes.

Sources: https://vercel.com/docs/frameworks/backend/express and https://vercel.com/docs/routing/rewrites
