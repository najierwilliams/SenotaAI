import { workerContract, type LunaToolCall, type LunaWorkerRole } from "@shared/lunaCognitive";
import { BRAIN_COORDINATE_TRANSFORMS, BRAIN_DATASETS, BRAIN_REFERENCE_SPACES } from "../scientificData/registry";
import { searchKnowledge } from "../knowledgeSpace/supabase";

export const LUNA_CONTROLLED_TOOLS = {
  retrieve_knowledge_space: {
    toolClass: "KNOWLEDGE",
    description: "Searches the owner-scoped Knowledge Space using bounded text retrieval only.",
  },
  read_scientific_registry: {
    toolClass: "PROVIDER",
    description: "Reads the application’s reviewed, in-process scientific registry without calling an external provider.",
  },
} as const satisfies Record<string, { toolClass: LunaToolCall["toolClass"]; description: string }>;

export type LunaControlledToolName = keyof typeof LUNA_CONTROLLED_TOOLS;

export type LunaControlledToolResult = {
  toolName: LunaControlledToolName;
  toolClass: LunaToolCall["toolClass"];
  resultSummary: string;
  promptContext: string;
};

function boundedQuery(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) throw new Error("Controlled Knowledge Space retrieval requires a non-empty query.");
  return normalized.slice(0, 300);
}

export function assertLunaControlledToolPermission(role: LunaWorkerRole, toolName: string): asserts toolName is LunaControlledToolName {
  if (!(toolName in LUNA_CONTROLLED_TOOLS)) {
    throw new Error(`Luna tool '${toolName}' is not registered. Arbitrary tool or shell execution is unavailable.`);
  }
  const definition = LUNA_CONTROLLED_TOOLS[toolName as LunaControlledToolName];
  if (!workerContract(role).allowedToolClasses.includes(definition.toolClass)) {
    throw new Error(`${role} is not permitted to use the ${definition.toolClass} tool '${toolName}'.`);
  }
}

function scientificRegistryContext(): LunaControlledToolResult {
  const referenceSpaces = BRAIN_REFERENCE_SPACES.slice(0, 12).map((space) => ({
    id: space.id,
    label: space.label,
    provider: space.provider,
    kind: space.kind,
    version: space.version,
    note: space.description,
  }));
  const transforms = BRAIN_COORDINATE_TRANSFORMS.map((transform) => ({
    id: transform.id,
    sourceReferenceSpaceId: transform.sourceReferenceSpaceId,
    targetReferenceSpaceId: transform.targetReferenceSpaceId,
    status: transform.status,
    note: transform.note,
  }));
  const datasets = BRAIN_DATASETS.slice(0, 12).map((dataset) => ({
    id: dataset.id,
    name: dataset.name,
    provider: dataset.provider,
    version: dataset.version,
    referenceSpaceIds: dataset.referenceSpaceIds,
  }));
  const payload = {
    source: "SenotaAI reviewed in-process scientific registry",
    constraints: [
      "The HRA Brain-Female v1.1 visual GLB to MNI ICBM 152 2009c relationship is NOT_ESTABLISHED.",
      "HRA to Julich correspondence is not established; the released Julich mapping is 0 authoritative / 0 probabilistic / 0 requires-domain-review / 102 unmapped.",
      "This tool does not call providers, produce coordinates, transform spaces, mutate scientific records, or establish biological targets.",
    ],
    referenceSpaces,
    transforms,
    datasets,
  };
  return {
    toolName: "read_scientific_registry",
    toolClass: "PROVIDER",
    resultSummary: `Read ${referenceSpaces.length} reviewed reference-space records, ${transforms.length} transform records, and ${datasets.length} dataset records from the in-process registry; no external provider request was made.`,
    promptContext: JSON.stringify(payload).slice(0, 12_000),
  };
}

async function knowledgeSpaceContext(userId: number, query: string): Promise<LunaControlledToolResult> {
  const objects = (await searchKnowledge(userId, boundedQuery(query))).slice(0, 8).map((object) => ({
    id: object.id,
    type: object.objectType,
    title: object.title,
    description: object.description.slice(0, 700),
    content: object.content.slice(0, 1_200),
    sourceType: object.sourceType,
    truthState: object.truthState,
    immutableProviderSnapshot: object.immutableProviderSnapshot,
  }));
  return {
    toolName: "retrieve_knowledge_space",
    toolClass: "KNOWLEDGE",
    resultSummary: `Retrieved ${objects.length} bounded owner-scoped Knowledge Space object(s).`,
    promptContext: JSON.stringify({ source: "Owner-scoped Knowledge Space", query: boundedQuery(query), objects }).slice(0, 12_000),
  };
}

/**
 * Performs only named, bounded, read-only operations. It never performs shell commands,
 * web access, provider mutations, coordinate transformations, or external side effects.
 * Callers must persist their tool-call trace before invoking this adapter.
 */
export async function invokeLunaControlledTool(input: {
  userId: number;
  role: LunaWorkerRole;
  toolName: LunaControlledToolName;
  query?: string;
}): Promise<LunaControlledToolResult> {
  assertLunaControlledToolPermission(input.role, input.toolName);
  if (input.toolName === "retrieve_knowledge_space") {
    return knowledgeSpaceContext(input.userId, input.query ?? "");
  }
  return scientificRegistryContext();
}
