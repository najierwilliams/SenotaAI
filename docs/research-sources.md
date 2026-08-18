# Integration Research Notes

## Ollama

SenotaAI’s reasoning adapter follows Ollama’s documented `/api/chat` contract. The adapter sends model, messages, tools, thinking enabled, and `stream: true`; it accumulates newline-delimited JSON chunks containing reasoning, content, and tool calls before continuing the controlled agent loop.

| Capability | Reference |
|---|---|
| Chat API request and response fields | https://docs.ollama.com/api/chat |
| Incremental content, thinking, and tool-call streaming | https://docs.ollama.com/capabilities/streaming |
| Multi-turn tool-call loop pattern | https://docs.ollama.com/capabilities/tool-calling |
| OpenAI-compatible endpoints and supported fields | https://docs.ollama.com/api/openai-compatibility |
| Hosted plan and cloud-use overview | https://ollama.com/pricing |

## Vercel

The Vercel adapter creates deployments through `POST /v13/deployments`, then polls the deployment status by ID and reports the deployment URL and readiness state into the live agent feed. GitHub-connected Vercel projects normally deploy each pushed branch and pull request automatically; the direct deployment action remains an explicit governed tool.

| Capability | Reference |
|---|---|
| Create deployment API and readiness states | https://vercel.com/docs/rest-api/deployments/create-a-new-deployment |
| Deployment build events and logs | https://vercel.com/docs/rest-api/deployments/get-deployment-events |
| GitHub-connected branch and pull-request deployments | https://vercel.com/docs/git/vercel-for-github |

## GitHub

The source adapter uses GitHub’s repository Contents and Pull Requests API operations through a server-side fine-grained token. It restricts all file paths to repository-relative paths, creates a task branch, and requires explicit approval for destructive work.
