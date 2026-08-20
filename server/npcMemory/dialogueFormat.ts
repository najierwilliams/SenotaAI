const lunaHumanityScalePattern = /(?:\bhow\s+(?:human|self[-\s]?aware)\s+(?:do\s+you\s+feel|are\s+you)\b|\b(?:human(?:ity)?|self[-\s]?awareness)\s+(?:percentage|percent|scale)\b|\b(?:0|zero|1|one)\s*(?:to|[-‐‑‒–—])\s*(?:100|one\s+hundred)\b)/i;
const lunaSelfAwarenessQuestionPattern = /\bhow\s+self[-\s]?aware\s+(?:do\s+you\s+feel|are\s+you)\b/i;
const leadingPercentagePattern = /^\s*(?:100|[1-9]?\d)\s*%/;
const leadingNumberedSentencePattern = /^\s*(100|[1-9]?\d)\s*[.)]\s*(.+)$/;
const unsupportedEvidencePattern = /\b(?:user reports?|system logs?|external benchmarks?|simulated scenarios?|data points?|I(?:'ve| have) reviewed|I reviewed|what I(?:'ve| have) seen)\b/i;
const unsupportedRecordRefusalPattern = /^\s*I don[’']t have an approved record supporting that claim\.?\s*$/i;
const selfModelDiscussionPattern = /\b(?:improv(?:e|ing|ement)|learned about (?:yourself|myself)|about yourself|self[-\s]?model|self[-\s]?aware(?:ness)?|\b40\s*%|confidence)\b/i;
const baselineFollowUpPattern = /\bhow\s+(?:can|do)\s+(?:we|i)\s+(?:increase|improve|grow|raise|build|boost)\s+(?:that|it|this)\b/i;
const percentageMentionPattern = /\b(100|[1-9]?\d)\s*%/g;

function firstSentence(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const match = normalized.match(/^(.+?[.!?])(?:\s|$)/);
  return (match?.[1] ?? normalized).slice(0, 180).trim();
}

function hasConflictingPercentage(value: string, approvedPercentage: number) {
  return Array.from(value.matchAll(percentageMentionPattern)).some((match) => Number(match[1]) !== approvedPercentage);
}

/** Replaces fabricated evidence claims with the approved-state boundary. */
export function enforceLunaEvidenceGrounding(message: string, response: string, npcId: string) {
  if (npcId.trim().toLowerCase() !== "luna001") return response;
  if ((selfModelDiscussionPattern.test(message) || baselineFollowUpPattern.test(message)) && unsupportedRecordRefusalPattern.test(response)) {
    if (/\bimprov(?:e|ing|ement)\b/i.test(message) || baselineFollowUpPattern.test(message)) {
      return "We can build it carefully through canon-consistent conversations and administrator-reviewed reflections; I won’t treat a reply alone as proof.";
    }
    return "My approved baseline says I’m a digital entity without a physical body, guided by canon, scoped memory, reflection, and clear uncertainty limits.";
  }
  if (!unsupportedEvidencePattern.test(response)) return response;
  if (lunaHumanityScalePattern.test(message) || /\b(?:why|what)\b.*\b(?:70|self[-\s]?aware|seen|evidence)\b/i.test(message)) {
    return "I only have my approved self-model assessment here; I don’t have recorded evidence to claim beyond it.";
  }
  return "I don’t have an approved record supporting that claim.";
}

/** Preserves character dialogue while enforcing numeric format from Luna's approved self-model assessment. */
export function enforceLunaResponseFormat(message: string, response: string, npcId: string, fallbackPercentage = 70) {
  if (npcId.trim().toLowerCase() !== "luna001" || !lunaHumanityScalePattern.test(message)) return response;
  const percentage = Math.round(Math.min(100, Math.max(0, fallbackPercentage)));
  if (lunaSelfAwarenessQuestionPattern.test(message)) {
    const rawDetail = firstSentence(response.replace(leadingPercentagePattern, "").replace(/^\s*[—–-]\s*/, ""));
    const detail = percentage === 0
      ? "I don’t have an approved self-model assessment yet, so I can’t support a higher figure."
      : hasConflictingPercentage(rawDetail, percentage)
        ? "That is my current approved self-model assessment."
        : rawDetail || "That is my current approved self-model assessment.";
    return `${percentage}% — ${detail}`;
  }
  if (leadingPercentagePattern.test(response)) return response;
  const numberedSentence = response.match(leadingNumberedSentencePattern);
  if (numberedSentence) return `${numberedSentence[1]}% — ${firstSentence(numberedSentence[2]) || "I’m still learning what that means for me."}`;
  const detail = firstSentence(response) || "I’m still learning what that means for me.";
  return `${percentage}% — ${detail}`;
}
