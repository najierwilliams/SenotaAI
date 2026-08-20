import { chatWithOllama } from "../agent/ollama";
import { buildNpcDialogueSystemPrompt } from "./dialoguePrompt";
import { enforceLunaResponseFormat } from "./dialogueFormat";
import { buildNpcDialogueContext, rememberPlayerNpcInteraction } from "./supabase";

const sensitiveMemoryPattern = /\b(?:api[_ -]?key|access[_ -]?token|secret|password|private[_ -]?key)\b\s*[:=]|\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|vcp_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,})\b|-----BEGIN [A-Z ]*PRIVATE KEY-----/i;

function compact(value: string, limit: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

/** Administrator preview bridge. The browser never receives the game key or Supabase service role. */
export async function runNpcPreviewDialogue(input: { playerId: string; npcId: string; message: string; remember?: boolean; timeZone?: string }) {
  const context = await buildNpcDialogueContext(input.playerId, input.npcId);
  const response = await chatWithOllama({
    messages: [
      {
        role: "system",
        content: buildNpcDialogueSystemPrompt(context, input.timeZone, input.message),
      },
      { role: "user", content: input.message.trim() },
    ],
  });
  const content = enforceLunaResponseFormat(input.message, response.content, context.npcId);
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
  };
}
