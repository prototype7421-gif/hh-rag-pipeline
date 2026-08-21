import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is missing");

    const groqFormData = new FormData();
    groqFormData.append("file", file, "audio.webm");
    groqFormData.append("model", "whisper-large-v3-turbo"); 
    groqFormData.append("response_format", "json");
    
    // CHANGED: This prompt explicitly tricks Whisper into using Devanagari script for Hindi, and English for English.
    groqFormData.append("prompt", "Hello, how are you? नमस्ते, आप कैसे हैं? If Hindi is spoken, use Devanagari script."); 

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: groqFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq STT error: ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json({ transcript: data.text });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}