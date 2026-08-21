import { NextRequest, NextResponse } from "next/server";
import { ragQuery, ragQueryStream } from "@/lib/rag";

// CHANGED: Force Next.js Edge Runtime for zero cold boots and instant streaming
export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, stream } = body as { question?: string; stream?: boolean };

    if (!question || question.trim().length === 0) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    if (stream) {
      const result = await ragQueryStream(question);
      const encoder = new TextEncoder();

      const metaEvent = encoder.encode(
        `data: ${JSON.stringify({
          type: "meta",
          retrievalMs: result.retrievalMs,
          latencyMs: result.latencyMs,
          chunksUsed: result.chunksUsed,
        })}\n\n`
      );

      let sentDone = false;
      let buffer = "";

      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(metaEvent);

          const reader = result.stream.getReader();
          const decoder = new TextDecoder();

          function pump(): Promise<void> {
            return reader.read().then(({ done, value }) => {
              if (done) {
                if (buffer.trim()) {
                  processLine(buffer, controller, encoder);
                }
                if (!sentDone) {
                  sentDone = true;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
                  );
                }
                controller.close();
                return;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const line of lines) {
                processLine(line, controller, encoder);
              }

              return pump();
            });
          }

          function processLine(
            line: string,
            streamController: ReadableStreamDefaultController,
            textEncoder: TextEncoder
          ) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) return;

            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              if (!sentDone) {
                sentDone = true;
                streamController.enqueue(
                  textEncoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
                );
              }
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                streamController.enqueue(
                  textEncoder.encode(
                    `data: ${JSON.stringify({ type: "token", content })}\n\n`
                  )
                );
              }
            } catch {
              // Ignore incomplete frame fragments
            }
          }

          pump().catch((err) => {
            console.error("Stream error:", err);
            if (!sentDone) {
              sentDone = true;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
              );
            }
            controller.close();
          });
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const result = await ragQuery(question);

    return NextResponse.json({
      answer: result.answer,
      latency: {
        totalMs: result.latencyMs,
        retrievalMs: result.retrievalMs,
        generationMs: result.generationMs,
      },
      chunksUsed: result.chunksUsed,
    });
  } catch (error) {
    console.error("RAG query error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "RAG query failed" },
      { status: 500 }
    );
  }
}