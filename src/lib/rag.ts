/**
 * RAG Pipeline: Chunking + Retrieval + Generation
 */

import { db } from "@/db";
import { documents, chunks } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { groqChatCompletion, groqChatStream } from "./groq";

// ─── Chunking ────────────────────────────────────────────────

export function chunkText(
  text: string,
  chunkSize: number = 250,
  overlap: number = 50
): string[] {
  if (text.length <= chunkSize) return [text];

  const result: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    result.push(text.slice(start, end).trim());
    start += chunkSize - overlap;
    if (start >= text.length) break;
  }

  return result.filter((c) => c.length > 0);
}

// ─── Document Management ─────────────────────────────────────

export async function storeDocument(title: string, transcript: string) {
  const [doc] = await db
    .insert(documents)
    .values({ title, transcript })
    .returning();

  const textChunks = chunkText(transcript);
  if (textChunks.length > 0) {
    await db.insert(chunks).values(
      textChunks.map((content, idx) => ({
        documentId: doc.id,
        content,
        chunkIndex: String(idx),
      }))
    );
  }

  return doc;
}

export async function listDocuments() {
  return db
    .select({
      id: documents.id,
      title: documents.title,
      transcript: documents.transcript,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .orderBy(desc(documents.createdAt));
}

export async function deleteDocument(id: string) {
  await db.delete(chunks).where(eq(chunks.documentId, id));
  await db.delete(documents).where(eq(documents.id, id));
}

// ─── Retrieval ───────────────────────────────────────────────

export async function retrieveChunks(
  query: string,
  topK: number = 3
): Promise<{ content: string; documentId: string }[]> {
  const terms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(
      (w) =>
        w.length >= 2 &&
        !["the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her", "was", "one", "our", "out", "what", "when", "where", "who", "will", "with", "this", "that", "from", "have", "been", "each", "which", "their", "there", "these", "those", "how", "does", "why", "did"].includes(w)
    );

  if (terms.length === 0) {
    const result = await db
      .select({
        content: chunks.content,
        documentId: chunks.documentId,
      })
      .from(chunks)
      .orderBy(desc(chunks.createdAt))
      .limit(topK);
    return result;
  }

  const tsQuery = terms
    .slice(0, 5)
    .map((t) => t.replace(/[^a-zA-Z0-9]/g, ""))
    .filter((t) => t.length > 0)
    .join(" OR "); 

  if (!tsQuery) {
    const result = await db
      .select({
        content: chunks.content,
        documentId: chunks.documentId,
      })
      .from(chunks)
      .orderBy(desc(chunks.createdAt))
      .limit(topK);
    return result;
  }

  const result = await db.execute(sql`
    SELECT content, document_id as "documentId"
    FROM ${chunks}
    WHERE to_tsvector('english', content) @@ websearch_to_tsquery('english', ${tsQuery})
    ORDER BY ts_rank(to_tsvector('english', content), websearch_to_tsquery('english', ${tsQuery})) DESC
    LIMIT ${topK}
  `);

  if (result.rows.length === 0) {
    const likeConditions = terms
      .slice(0, 5)
      .map((term) => sql`${chunks.content} ILIKE ${"%" + term + "%"}`)
      .reduce((acc, cond) => sql`${acc} OR ${cond}`);

    const fallback = await db
      .select({
        content: chunks.content,
        documentId: chunks.documentId,
      })
      .from(chunks)
      .where(likeConditions)
      .limit(topK);

    if (fallback.length === 0) {
      const recent = await db
        .select({
          content: chunks.content,
          documentId: chunks.documentId,
        })
        .from(chunks)
        .orderBy(desc(chunks.createdAt))
        .limit(topK);
      return recent;
    }
    return fallback;
  }

  return result.rows as { content: string; documentId: string }[];
}

// ─── Generation ──────────────────────────────────────────────

// CHANGED: The AI is now strictly forced to start responses with a comma!
const RAG_SYSTEM_PROMPT = `You are a lightning-fast AI voice assistant.
STRICT RULES:
1. YOU MUST ALWAYS PROVIDE A TEXT RESPONSE.
2. CRITICAL: You MUST start every single response with a short acknowledgment followed by a comma (e.g., "Yes, ", "Okay, ", "हाँ, ", or "ठीक है, "). 
3. After the comma, use the Context to answer the Question directly in under 20 words.
4. If Context contains personal statements like "My name is X", treat that as the user's information.`;

export async function ragQuery(
  question: string,
  topK: number = 3
): Promise<{
  answer: string;
  latencyMs: number;
  retrievalMs: number;
  generationMs: number;
  chunksUsed: number;
}> {
  const totalStart = performance.now();

  const retrievalStart = performance.now();
  const relevantChunks = await retrieveChunks(question, topK);
  const retrievalMs = Math.round(performance.now() - retrievalStart);

  const context = relevantChunks
    .map((c, i) => `[${i + 1}] ${c.content}`)
    .join(" | ");

  const generationStart = performance.now();
  const response = await groqChatCompletion([
    { role: "system", content: RAG_SYSTEM_PROMPT },
    {
      role: "user",
      content: context
        ? `Context: ${context}\n\nQuestion: ${question}`
        : `Question: ${question}`,
    },
  ], {
    max_tokens: 300, 
    temperature: 0.5, 
  });
  const generationMs = Math.round(performance.now() - generationStart);

  const answer = response.choices[0]?.message?.content || "हाँ, मुझे समझ नहीं आया।";
  const latencyMs = Math.round(performance.now() - totalStart);

  return {
    answer,
    latencyMs,
    retrievalMs,
    generationMs,
    chunksUsed: relevantChunks.length,
  };
}

export async function ragQueryStream(
  question: string,
  topK: number = 3
): Promise<{
  stream: ReadableStream<Uint8Array>;
  latencyMs: number;
  retrievalMs: number;
  chunksUsed: number;
}> {
  const totalStart = performance.now();

  const retrievalStart = performance.now();
  const relevantChunks = await retrieveChunks(question, topK);
  const retrievalMs = Math.round(performance.now() - retrievalStart);

  const context = relevantChunks
    .map((c, i) => `[${i + 1}] ${c.content}`)
    .join(" | ");

  const { stream } = groqChatStream(
    [
      { role: "system", content: RAG_SYSTEM_PROMPT },
      {
        role: "user",
        content: context
          ? `Context: ${context}\n\nQuestion: ${question}`
          : `Question: ${question}`,
      },
    ],
    {
      max_tokens: 300,
      temperature: 0.5,
    }
  );

  const latencyMs = Math.round(performance.now() - totalStart);

  return {
    stream,
    latencyMs,
    retrievalMs,
    chunksUsed: relevantChunks.length,
  };
}