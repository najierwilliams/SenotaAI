# SenotaAI

**SenotaAI** is a dark, autonomous software-agent dashboard. Users describe a desired outcome in natural language; the agent plans work, operates through governed GitHub and Vercel tools, streams its execution trace, retains useful project context, and records every decision.

The application is intentionally designed as a **bounded autonomous system**. It can inspect repositories, create an isolated work branch, write code, open pull requests, and request preview deployments. File deletion, production deployment, credential-sensitive work, unknown connector actions, and other non-reversible actions always require an explicit approval.

## System design

| Component | Responsibility |
|---|---|
| **React dashboard** | Natural-language task intake, live execution feed, task history, memory, approvals, schedules, and settings. |
| **Agent control loop** | Plans, calls the selected Ollama-compatible model, executes one tool action at a time, observes results, retries bounded failures, and persists the trace. |
| **GitHub adapter** | Reads repository trees and files; creates task branches; writes or deletes files; and opens pull requests through the GitHub API. |
| **Vercel adapter** | Reads deployment state and triggers preview or production deployment requests through the Vercel API. |
| **Persistent store** | Retains tasks, step traces, approvals, memory, schedules, settings, and notification delivery records. |
| **Heartbeat scheduler** | Triggers user-managed six-field UTC cron schedules through an authenticated callback after the site is published. |

## Autonomy boundary

SenotaAI has two execution modes. **Confirm first** is the default and pauses for approval before any write, pull request, or preview deployment. **Auto-run** allows the agent to make reversible branch-scoped changes automatically, but it still pauses before destructive actions and production-impacting deployment work.

| Action | Confirm first | Auto-run |
|---|---:|---:|
| Read repository files and deployment state | Runs | Runs |
| Create a task branch | Approval required | Runs |
| Write a file on the task branch | Approval required | Runs |
| Open pull request / preview deployment | Approval required | Runs |
| Delete a file | Approval required | Approval required |
| Redeploy production | Approval required | Approval required |

## Required server-side configuration

The browser never receives these values. Configure them as protected server environment variables.

| Variable | Purpose |
|---|---|
| `OLLAMA_BASE_URL` | HTTPS base URL of an Ollama-compatible on-demand model endpoint. The adapter calls `${OLLAMA_BASE_URL}/api/chat`. |
| `OLLAMA_API_KEY` | Optional bearer token required by the model endpoint. |
| `OLLAMA_DEFAULT_MODEL` | Optional default model name, such as `qwen3-coder` or `llama3`. |
| `GITHUB_TOKEN` | GitHub fine-grained access token with read/write Contents and Pull requests permission for `najierwilliams/SenotaAI`. |
| `VERCEL_TOKEN` | Vercel personal access token with access to the selected Vercel project. |
| `VERCEL_TEAM_ID` | Optional Vercel team ID when the project belongs to a team rather than the personal account. |

The dashboard stores only non-sensitive preferences, such as the repository name, model label, retry budget, and Vercel project ID. It exposes connection **readiness** but never token values.

## Local development

Install dependencies with `pnpm install`, then start the application with `pnpm dev`. The project uses React, Tailwind, Express, tRPC, Drizzle, and MySQL/TiDB. Run `pnpm check` for TypeScript validation and `pnpm test` for the Vitest suite.

## Source-control workflow

The application workspace is maintained at `/home/ubuntu/senota-ai` and its intended source repository is [`najierwilliams/SenotaAI`](https://github.com/najierwilliams/SenotaAI). The synchronization workflow is deliberately simple: validate the local project with `pnpm check` and `pnpm test`, create a managed project checkpoint, copy the validated source into a clean checkout of the private repository while preserving that checkout’s `.git` directory, then commit and push to `main`.

Do not commit `.env` files, local logs, `node_modules`, or token values. The database migration files under `drizzle/`, the project documentation under `docs/`, and `todo.md` are source-controlled because they document schema history, engineering decisions, and the active delivery backlog.

## Scheduling

Recurring tasks use six-field UTC cron syntax: `seconds minutes hours day-of-month month day-of-week`. The application must first be published so the scheduler can invoke the production callback at `/api/scheduled/agent-run`. The callback locates scheduled tasks only from the scheduler-issued identity, not from attacker-controlled request data.

## Important limits

SenotaAI does not claim unrestricted or unbounded autonomy. Each task has a bounded tool-turn budget and retry budget, and long inference calls remain subject to hosting time limits. An on-demand high-performance endpoint is appropriate for powerful coding tasks without keeping a personal computer online; scheduled tasks invoke that endpoint only when they run.
