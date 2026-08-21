/**
 * Sarvam AI Speech-to-Text API client
 * Docs: https://docs.sarvam.ai/api-reference/speech-to-text/transcribe
 * Endpoint: POST https://api.sarvam.ai/speech-to-text
 * Auth: api-subscription-key header
 */

const SARVAM_BASE_URL = "https://api.sarvam.ai";

export interface SarvamSTTResponse {
  request_id: string | null;
  transcript: string;
  language_code: string | null;
}

export interface SarvamSTTOptions {
  model?: string; 
  mode?: "transcribe" | "translate" | "verbatim" | "translit" | "codemix";
  language_code?: string; 
}

/**
 * Transcribe audio using Sarvam AI's speech-to-text REST API.
 * Accepts audio as a Buffer (server-side) with a filename hint.
 * Max audio length: 30 seconds.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  options: SarvamSTTOptions = {}
): Promise<SarvamSTTResponse> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) throw new Error("SARVAM_API_KEY is not configured");

  // Build multipart form data manually
  const boundary = "----FormBoundary" + Math.random().toString(36).slice(2);
  const parts: Buffer[] = [];

  // File part
  const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
  parts.push(Buffer.from(fileHeader, "utf-8"));
  parts.push(audioBuffer);
  parts.push(Buffer.from("\r\n", "utf-8"));

  // Model (Reverted to standard saaras:v1 unless you specifically have v3 access)
  const model = options.model || "saaras:v1";
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${model}\r\n`,
      "utf-8"
    )
  );

  // Mode
  const mode = options.mode || "transcribe";
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="mode"\r\n\r\n${mode}\r\n`,
      "utf-8"
    )
  );

  // CHANGED: Set default to "hi-IN" (or "en-IN") to prevent phonetic hallucination and skip auto-detect latency
  const languageCode = options.language_code || "hi-IN";
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="language_code"\r\n\r\n${languageCode}\r\n`,
      "utf-8"
    )
  );

  // End boundary
  parts.push(Buffer.from(`--${boundary}--\r\n`, "utf-8"));

  const body = Buffer.concat(parts);

  const response = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body: new Uint8Array(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Sarvam STT API error (${response.status}): ${errorText}`
    );
  }

  const data = (await response.json()) as SarvamSTTResponse;
  return data;
}