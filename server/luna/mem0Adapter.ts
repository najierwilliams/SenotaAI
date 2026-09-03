import { Memory, type AddMemoryOptions, type Message, type SearchMemoryOptions } from "mem0ai/oss";

export type LunaMem0Candidate = {
  id: string;
  content: string;
  score: number | null;
  metadata: Record<string, unknown>;
};

export type LunaMem0Adapter = {
  enabled: boolean;
  addExperience(input: {
    workspaceId: string;
    messages: string | Message[];
    sourceType: string;
    sourceId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<LunaMem0Candidate[]>;
  searchRelevant(input: {
    workspaceId: string;
    query: string;
    limit?: number;
  }): Promise<LunaMem0Candidate[]>;
};

type Mem0Client = Pick<Memory, "add" | "search">;
type Mem0Factory = () => Mem0Client;

function configured() {
  return process.env.MEM0_ENABLED === "true" && Boolean(process.env.MEM0_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY);
}

function createDefaultClient(): Mem0Client {
  const apiKey = process.env.MEM0_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
  return new Memory({
    llm: {
      provider: "openai",
      config: {
        apiKey,
        model: process.env.MEM0_LLM_MODEL ?? "gpt-4o-mini",
        ...(process.env.MEM0_OPENAI_BASE_URL ? { baseURL: process.env.MEM0_OPENAI_BASE_URL } : {}),
      },
    },
    embedder: {
      provider: "openai",
      config: {
        apiKey,
        model: process.env.MEM0_EMBEDDING_MODEL ?? "text-embedding-3-small",
        ...(process.env.MEM0_OPENAI_BASE_URL ? { baseURL: process.env.MEM0_OPENAI_BASE_URL } : {}),
      },
    },
    vectorStore: {
      provider: "memory",
      config: {
        collectionName: "luna_mem0_intelligence",
        dimension: Number(process.env.MEM0_EMBEDDING_DIMENSION ?? 1536),
      },
    },
    disableHistory: true,
  });
}

function candidates(result: { results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, unknown> }> }) {
  return result.results.map(item => ({
    id: item.id,
    content: item.memory,
    score: typeof item.score === "number" ? item.score : null,
    metadata: item.metadata ?? {},
  }));
}

/**
 * Mem0 is deliberately subordinate: it may extract and rank candidates, but Luna services must
 * persist accepted memories through createLunaMemory/listLunaMemories in Supabase.
 */
export function createLunaMem0Adapter(factory: Mem0Factory = createDefaultClient): LunaMem0Adapter {
  const enabled = configured();
  let client: Mem0Client | null = null;
  const getClient = () => {
    if (!enabled) return null;
    return client ??= factory();
  };

  return {
    enabled,
    async addExperience(input) {
      const current = getClient();
      if (!current) return [];
      const options: AddMemoryOptions = {
        userId: input.workspaceId,
        infer: true,
        metadata: {
          sourceType: input.sourceType,
          sourceId: input.sourceId ?? null,
          ...(input.metadata ?? {}),
        },
      };
      try {
        return candidates(await current.add(input.messages, options));
      } catch {
        return [];
      }
    },
    async searchRelevant(input) {
      const current = getClient();
      if (!current) return [];
      const options: SearchMemoryOptions = {
        topK: Math.min(Math.max(input.limit ?? 8, 1), 20),
        filters: { user_id: input.workspaceId },
      };
      try {
        return candidates(await current.search(input.query, options));
      } catch {
        return [];
      }
    },
  };
}

export const lunaMem0Adapter = createLunaMem0Adapter();

export function mem0ConfigurationSummary() {
  return {
    enabled: configured(),
    provider: "mem0ai/oss",
    storage: "in-memory subordinate intelligence cache; Supabase remains authoritative",
    requires: ["MEM0_ENABLED=true", "MEM0_OPENAI_API_KEY (or OPENAI_API_KEY)"],
  } as const;
}
