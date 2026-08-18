# Ollama Cloud Endpoint Selection

For SenotaAI’s current server adapter, use Ollama Cloud directly as an Ollama-compatible remote host.

| Setting | Value |
|---|---|
| `OLLAMA_BASE_URL` | `https://ollama.com` |
| Request route used by SenotaAI | `https://ollama.com/api/chat` |
| `OLLAMA_API_KEY` | Create at `https://ollama.com/settings/keys` |
| Recommended starting plan | Ollama Pro, subject to current pricing and usage needs |

Ollama Cloud accepts direct API requests at `https://ollama.com/api` with a bearer API key and retains the familiar `/api/chat` API contract used by SenotaAI. Cloud models are remotely hosted and do not need a capable local GPU. The official pricing page positions the Pro plan for larger models, coding automation, and deep research; it currently lists three concurrent cloud models and substantially more usage than the Free tier.

For a first SenotaAI model, use the live `GET https://ollama.com/api/tags` response after key configuration to choose a currently available code-oriented cloud model. Avoid hard-coding a model retired from the current catalog.

## Free starting configuration

The recommended no-cost starting path is **Ollama Cloud Free** with the same endpoint and key flow above. It is the most direct fit because SenotaAI already sends native Ollama `/api/chat` requests; no OpenAI-compatibility adapter or laptop-hosted service is required.

The free plan is designed for light cloud usage and permits one concurrent cloud model. Start with a smaller currently listed cloud model that exposes tool support, such as `gemma4` or `gpt-oss` at an available smaller size, and use SenotaAI’s default **Confirm first** mode. Large or long-horizon coding models such as `glm-5.1`, `minimax-m2.7`, and `kimi-k2.7-code` may consume free usage more quickly; discover the exact currently available tags after key setup rather than hard-coding one.

Free usage is appropriate for validating a small number of supervised code tasks. It is not suitable for unattended schedules, lengthy multi-turn repository projects, or parallel agents because those use patterns can exhaust the light usage allowance or the single concurrency slot.

Sources: https://docs.ollama.com/api/authentication, https://docs.ollama.com/cloud, https://ollama.com/pricing
