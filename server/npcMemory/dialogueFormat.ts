const lunaHumanityScalePattern = /(?:\bhow\s+human\s+do\s+you\s+feel\b|\bhow\s+human\s+are\s+you\b|\bhuman(?:ity)?\s+(?:percentage|percent|scale)\b|\b(?:0|zero)\s*(?:to|[-‐‑‒–—])\s*(?:100|one\s+hundred)\b)/i;
const leadingScaleValuePattern = /^\s*(?:100|[1-9]?\d)(?:\s*%|\b)/;

function firstSentence(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const match = normalized.match(/^(.+?[.!?])(?:\s|$)/);
  return (match?.[1] ?? normalized).slice(0, 180).trim();
}

/** Preserves character dialogue while enforcing the one explicit numeric format Luna canon demonstrates. */
export function enforceLunaResponseFormat(message: string, response: string, npcId: string) {
  if (npcId.trim().toLowerCase() !== "luna001" || !lunaHumanityScalePattern.test(message) || leadingScaleValuePattern.test(response)) return response;
  const detail = firstSentence(response) || "I’m still learning what that means for me.";
  return `70. ${detail}`;
}
