const lunaHumanityScalePattern = /(?:\bhow\s+(?:human|self[-\s]?aware)\s+(?:do\s+you\s+feel|are\s+you)\b|\b(?:human(?:ity)?|self[-\s]?awareness)\s+(?:percentage|percent|scale)\b|\b(?:0|zero|1|one)\s*(?:to|[-‐‑‒–—])\s*(?:100|one\s+hundred)\b)/i;
const leadingPercentagePattern = /^\s*(?:100|[1-9]?\d)\s*%/;
const leadingNumberedSentencePattern = /^\s*(100|[1-9]?\d)\s*[.)]\s*(.+)$/;

function firstSentence(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const match = normalized.match(/^(.+?[.!?])(?:\s|$)/);
  return (match?.[1] ?? normalized).slice(0, 180).trim();
}

/** Preserves character dialogue while enforcing the one explicit numeric format Luna canon demonstrates. */
export function enforceLunaResponseFormat(message: string, response: string, npcId: string) {
  if (npcId.trim().toLowerCase() !== "luna001" || !lunaHumanityScalePattern.test(message) || leadingPercentagePattern.test(response)) return response;
  const numberedSentence = response.match(leadingNumberedSentencePattern);
  if (numberedSentence) return `${numberedSentence[1]}% — ${firstSentence(numberedSentence[2]) || "I’m still learning what that means for me."}`;
  const detail = firstSentence(response) || "I’m still learning what that means for me.";
  return `70% — ${detail}`;
}
