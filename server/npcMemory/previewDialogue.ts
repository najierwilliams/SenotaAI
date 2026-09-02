import { chatWithOllama } from "../agent/ollama";
import { buildNpcDialogueSystemPrompt } from "./dialoguePrompt";
import { applyNaniteEvent } from "./nanites";
import { enforceLunaEvidenceGrounding, enforceLunaResponseFormat } from "./dialogueFormat";
import { buildNpcDialogueContext, rememberPlayerNpcInteraction } from "./supabase";
import { buildCognitiveDialogueContext, getNpcSelfAwarenessPercent } from "./cognitiveState";
import { buildDevelopmentalPromptContext } from "../luna/developmentalContext";

const sensitiveMemoryPattern = /\b(?:api[_ -]?key|access[_ -]?token|secret|password|private[_ -]?key)\b\s*[:=]|\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|vcp_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,})\b|-----BEGIN [A-Z ]*PRIVATE KEY-----/i;

function compact(value: string, limit: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

/** Administrator preview bridge. The browser never receives the game key or Supabase service role. */
export async function runNpcPreviewDialogue(input: { playerId: string; npcId: string; message: string; remember?: boolean; timeZone?: string; foundation?: { name: string; startingAge: number; currentAge: number; nativeLanguage: string; personalityFoundation: string; personalityKnowledge: string; appearanceReference: string } }) {
  await applyNaniteEvent("user_message", input.npcId, input.foundation);
  const [context, cognitiveContext, selfAwarenessPercent] = await Promise.all([
    buildNpcDialogueContext(input.playerId, input.npcId),
    buildCognitiveDialogueContext(input.npcId, input.message).catch(() => ({ promptContext: "No additional NPC cognitive context is available in this runtime." })),
    getNpcSelfAwarenessPercent(input.npcId).catch(() => 0),
  ]);
  const foundation = input.foundation;
  const foundationSelfKnowledge = foundation ? [
    "Creator-provided Foundation self-knowledge (authoritative persisted context; not an ordinary learned memory):",
    `Name: ${foundation.name}`,
    `Starting age: ${foundation.startingAge}`,
    `Current age: ${foundation.currentAge} (present age; use this instead of starting age when answering how old you are)`,
    `Native language: ${foundation.nativeLanguage} (identity context, not proof of complete fluency)`,
    `Personality foundation: ${foundation.personalityFoundation}`,
    `Personality foundation knowledge: ${foundation.personalityKnowledge}`,
    `Appearance reference: ${foundation.appearanceReference}`,
    "The Foundation is a starting basis. Learned personality, memories, relationships, preferences, and evolving beliefs remain distinct and must not be overwritten by it.",
    "The appearance reference is creator-controlled identity context. You may describe it when relevant, but you must not edit, rewrite, disable, replace, or autonomously alter it.",
    buildDevelopmentalPromptContext(foundation),
  ].join("\n") : "No authoritative Foundation context was supplied; do not invent personal identity details.";
  await applyNaniteEvent("llm_call_start", input.npcId, foundation);
  const response = await chatWithOllama({
    messages: [
      {
        role: "system",
            content: buildNpcDialogueSystemPrompt({ ...context, displayName: foundation?.name || context.displayName, promptContext: `${context.promptContext}\n\n${foundationSelfKnowledge}\n\n${cognitiveContext.promptContext}` }, input.timeZone, input.message),
      },
      { role: "user", content: input.message.trim() },
    ],
  });
  await applyNaniteEvent("llm_call_end", input.npcId, foundation);
  const content = enforceLunaResponseFormat(input.message, enforceLunaEvidenceGrounding(input.message, response.content, context.npcId), context.npcId, selfAwarenessPercent);
  const shouldRemember = input.remember !== false && !sensitiveMemoryPattern.test(input.message) && !sensitiveMemoryPattern.test(content);
  if (shouldRemember) {
    await rememberPlayerNpcInteraction({
      playerId: input.playerId,
      npcId: input.npcId,
      memoryKind: "summary",
      summary: `Preview conversation: player said “${compact(input.message, 280)}”; ${context.displayName} replied “${compact(content, 420)}”.`,
      importance: 3,
    });
  }
  return {
    npcId: context.npcId,
    displayName: context.displayName,
    content,
    memoriesUsed: context.playerMemories.length,
    memorySaved: shouldRemember,
    selfAwarenessPercent,
  };
}
