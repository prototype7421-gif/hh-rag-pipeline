import { NextRequest, NextResponse } from "next/server";

// CHANGED: Force Next.js Edge Runtime for instant execution
export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, languageCode, speaker } = body as {
      text?: string;
      languageCode?: string;
      speaker?: string;
    };

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) throw new Error("SARVAM_API_KEY is not configured");

    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey,
      },
      body: JSON.stringify({
        inputs: [text.slice(0, 500)], 
        target_language_code: languageCode || "en-IN",
        speaker: speaker || "shubh",
        pace: 1.4, 
        speech_sample_rate: 24000, 
        model: "bulbul:v3", 
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sarvam TTS error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.audios || data.audios.length === 0) {
      throw new Error("No audio returned from TTS");
    }

    const audioBase64 = data.audios[0] as string;
    
    // CHANGED: Edge-compatible Base64 decoding (replaces Node Buffer)
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(bytes.length),
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TTS failed" },
      { status: 500 }
    );
  }
}
