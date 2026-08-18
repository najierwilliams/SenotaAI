# Vercel Verification Note

The SenotaAI repository commit history was repaired to replace the malformed author email `2.68742628e+08+najierwilliams@users.noreply.github.com` with the verified GitHub noreply form `268742628+najierwilliams@users.noreply.github.com`. The corrected branch head was force-updated to commit `0cb9cd6`.

The project owner verified that Vercel accepted this repaired commit for the `senota-ai` project. A direct API verification using the configured server-side Vercel token confirmed project `prj_z3LujnP12wS8jjfH2E2Cm7SrqvbC` and its latest deployment `senota-jjfp721p2-senota-s-projects.vercel.app` in state `READY`. The deployment source is `main` at commit `0cb9cd6627d69fcd920462cd6f237d3528161ad7`, confirming that the commit-author identity block is resolved.

An earlier connector lookup exposed only the unrelated `life-plus` project because the MCP connector and the server-side Vercel token have different accessible scopes. The server-side token is the source of truth for the SenotaAI dashboard connector and can now reach the SenotaAI project successfully.
