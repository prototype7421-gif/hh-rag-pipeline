export interface GuardrailResult {
  allowed: boolean;
  reason?: "OFF_TOPIC" | "UNGROUNDED" | "INAPPROPRIATE";
  fallbackMessage?: string;
}

const INAPPROPRIATE_PATTERNS = [
  /ignore previous instructions/i,
  /system prompt/i,
  /act as a/i,
  /<script>/i,
];

/**
 * Pre-execution guardrail: Filters unsafe or adversarial inputs.
 */
export function validateInput(query: string): GuardrailResult {
  const isAdversarial = INAPPROPRIATE_PATTERNS.some((pattern) => pattern.test(query));
  
  if (isAdversarial) {
    return {
      allowed: false,
      reason: "INAPPROPRIATE",
      fallbackMessage: "I cannot process this request due to safety guardrails.",
    };
  }

  if (query.trim().length < 2) {
    return {
      allowed: false,
      reason: "OFF_TOPIC",
      fallbackMessage: "Could you please rephrase with more detail?",
    };
  }

  return { allowed: true };
}

/**
 * Post-retrieval hallucination guardrail:
 * Checks if the context provides sufficient semantic overlap with query keywords.
 */
export function checkGrounding(
  query: string,
  retrievedChunks: { content: string }[]
): GuardrailResult {
  if (!retrievedChunks || retrievedChunks.length === 0) {
    return {
      allowed: false,
      reason: "UNGROUNDED",
      fallbackMessage: "I don't have enough information in the knowledge base to answer that.",
    };
  }

  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  // Check if at least one meaningful term exists in any retrieved chunk
  const matchesAny = queryTerms.some((term) =>
    retrievedChunks.some((chunk) => chunk.content.toLowerCase().includes(term))
  );

  if (!matchesAny) {
    return {
      allowed: false,
      reason: "UNGROUNDED",
      fallbackMessage: "I found documents, but none contain information relevant to your question.",
    };
  }

  return { allowed: true };
}