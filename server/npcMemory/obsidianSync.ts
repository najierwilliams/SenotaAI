import { createHash } from "node:crypto";
import { upsertNpcCanonSource } from "./supabase";

type ObsidianFrontmatter = Record<string, string>;

export type ParsedObsidianNpcNote = {
  npcId: string;
  displayName: string;
  obsidianPath: string;
  canonHash: string;
  canonExcerpt: string;
};

function parseFrontmatter(noteContent: string): { fields: ObsidianFrontmatter; body: string } {
  const match = noteContent.replace(/^\uFEFF/, "").match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)([\s\S]*)$/);
  if (!match) throw new Error("Obsidian NPC note must begin with YAML frontmatter delimited by ---.");
  const fields: ObsidianFrontmatter = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && value) fields[key] = value;
  }
  return { fields, body: match[2].trim() };
}

function findSection(body: string, sectionName: string) {
  return body.match(new RegExp(`^##\\s+${sectionName}\\s*\\n([\\s\\S]*?)(?=^##\\s+|$)`, "im"))?.[1]?.trim() ?? "";
}

function boundedExcerpt(body: string) {
  const runtimeSection = findSection(body, "Runtime excerpt");
  const voiceTone = findSection(body, "Voice Tone");
  const conversationalStyle = findSection(body, "Conversational Style");
  const approvedUpdates = findSection(body, "SenotaAI approved updates");
  const source = [
    runtimeSection || body,
    voiceTone && `Voice tone directives:\n${voiceTone}`,
    conversationalStyle && `Conversational style directives:\n${conversationalStyle}`,
    approvedUpdates && `Approved canon additions:\n${approvedUpdates}`,
  ].filter(Boolean).join("\n\n");
  const normalized = source
    .replace(/^#{1,6}\s+.*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (normalized.length < 12) throw new Error("Obsidian NPC note needs a meaningful Runtime excerpt or canon body.");
  return normalized.slice(0, 12_000);
}

export function parseObsidianNpcNote(noteContent: string, obsidianPath: string): ParsedObsidianNpcNote {
  if (typeof noteContent !== "string" || noteContent.length > 100_000) throw new Error("Obsidian NPC note must be a string up to 100,000 characters.");
  if (!/^[A-Za-z0-9_./ -]{1,300}$/.test(obsidianPath) || obsidianPath.includes("..")) throw new Error("Obsidian path is invalid.");
  const { fields, body } = parseFrontmatter(noteContent);
  const npcId = fields.npc_id;
  const displayName = fields.display_name;
  if (!npcId || !displayName) throw new Error("Obsidian NPC note frontmatter requires npc_id and display_name.");
  return {
    npcId,
    displayName,
    obsidianPath,
    canonHash: createHash("sha256").update(noteContent).digest("hex"),
    canonExcerpt: boundedExcerpt(body),
  };
}

/** Imports a canon-only Obsidian note; player interactions are never accepted by this path. */
export async function syncObsidianNpcCanon(noteContent: string, obsidianPath: string) {
  const parsed = parseObsidianNpcNote(noteContent, obsidianPath);
  await upsertNpcCanonSource(parsed);
  return { npcId: parsed.npcId, displayName: parsed.displayName, canonHash: parsed.canonHash, excerptLength: parsed.canonExcerpt.length };
}
