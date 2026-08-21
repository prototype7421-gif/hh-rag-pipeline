/**
 * Groq API client for ultra-fast LLM inference.
 * Docs: https://console.groq.com/docs/api-reference
 * Endpoint: POST https://api.groq.com/openai/v1/chat/completions
 * Auth: Bearer token
 */

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqChatResponse {
  id: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string | null;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Send a chat completion request to Groq for ultra-low-latency inference.
 */
export async function groqChatCompletion(
  messages: GroqMessage[],
  options: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
  } = {}
): Promise<GroqChatResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

  // CHANGED: Replaced invalid model with the fastest available Groq model
  const model = options.model || "openai/gpt-oss-20b";

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.2,
      max_completion_tokens: options.max_tokens ?? 300,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as GroqChatResponse;
  return data;
}

/**
 * Stream a chat completion from Groq. Returns a ReadableStream of SSE events.
 */
export function groqChatStream(
  messages: GroqMessage[],
  options: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
  } = {}
): { stream: ReadableStream<Uint8Array>; abort: () => void } {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

  // CHANGED: Replaced invalid model
const model = options.model || "openai/gpt-oss-20b";
  const controller = new AbortController();

  const streamPromise = fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.2,
      max_completion_tokens: options.max_tokens ?? 300,
      stream: true,
    }),
    signal: controller.signal,
  }).then(async (response) => {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errorText}`);
    }
    if (!response.body) throw new Error("No response body for streaming");
    return response.body;
  });

  const readableStream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      streamPromise
        .then((bodyStream) => {
          const reader = bodyStream.getReader();
          function pump(): Promise<void> {
            return reader.read().then(({ done, value }) => {
              if (done) {
                ctrl.close();
                return;
              }
              ctrl.enqueue(value);
              return pump();
            });
          }
          return pump();
        })
        .catch((err) => ctrl.error(err));
    },
  });

  return {
    stream: readableStream,
    abort: () => controller.abort(),
  };
}