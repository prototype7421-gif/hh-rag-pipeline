import { groqChatCompletion, GroqMessage } from "./groq";

interface HarnessOptions {
  maxRetries?: number;
  initialDelayMs?: number;
}

/**
 * Executes an operation with exponential backoff retries.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: HarnessOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 2;
  let delay = options.initialDelayMs ?? 100;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise((res) => setTimeout(res, delay));
      delay *= 2; // Exponential backoff
    }
  }

  throw new Error("Harness retry limit reached.");
}

/**
 * Orchestrated LLM execution with fallback recovery.
 */
export async function executeModelHarness(
  messages: GroqMessage[]
): Promise<{ text: string; success: boolean }> {
  try {
    const response = await withRetry(async () => {
      return await groqChatCompletion(messages, {
        temperature: 0.2,
        max_tokens: 150,
      });
    });

    const text = response.choices[0]?.message?.content?.trim() || "";
    return { text, success: true };
  } catch (error) {
    console.error("Harness error recovery triggered:", error);
    // Fallback message when external LLM is unreachable
    return {
      text: "The model service is temporarily unreachable. Please try again.",
      success: false,
    };
  }
}