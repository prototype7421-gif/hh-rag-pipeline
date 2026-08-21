(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push(["chunks/[root-of-the-server]__0l3a52w._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/src/db/index.ts [app-edge-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "db",
    ()=>db
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$neondatabase$2f$serverless$2f$index$2e$mjs__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@neondatabase/serverless/index.mjs [app-edge-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$neon$2d$http$2f$driver$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/neon-http/driver.js [app-edge-route] (ecmascript)");
;
;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
}
// Next.js serverless routes work best with Neon's HTTP driver.
// Because it connects statelessly over HTTP, we no longer need 
// the globalThis singleton pattern or pg Pool!
const sql = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$neondatabase$2f$serverless$2f$index$2e$mjs__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["neon"])(databaseUrl);
const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$neon$2d$http$2f$driver$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["drizzle"])(sql);
}),
"[project]/src/db/schema.ts [app-edge-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "chunks",
    ()=>chunks,
    "documents",
    ()=>documents
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/table.js [app-edge-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-edge-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/text.js [app-edge-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-edge-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/indexes.js [app-edge-route] (ecmascript)");
;
const documents = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("documents", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["uuid"])("id").defaultRandom().primaryKey(),
    title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["text"])("title").notNull(),
    transcript: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["text"])("transcript").notNull(),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow().notNull()
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["index"])("documents_created_at_idx").on(table.createdAt)
    ]);
const chunks = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("chunks", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["uuid"])("id").defaultRandom().primaryKey(),
    documentId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["uuid"])("document_id").notNull().references(()=>documents.id, {
        onDelete: "cascade"
    }),
    content: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["text"])("content").notNull(),
    chunkIndex: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["text"])("chunk_index").notNull(),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow().notNull()
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["index"])("chunks_document_id_idx").on(table.documentId)
    ]);
}),
"[project]/src/lib/groq.ts [app-edge-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "groqChatCompletion",
    ()=>groqChatCompletion,
    "groqChatStream",
    ()=>groqChatStream
]);
/**
 * Groq API client for ultra-fast LLM inference.
 * Docs: https://console.groq.com/docs/api-reference
 * Endpoint: POST https://api.groq.com/openai/v1/chat/completions
 * Auth: Bearer token
 */ const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
async function groqChatCompletion(messages, options = {}) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not configured");
    // CHANGED: Replaced invalid model with the fastest available Groq model
    const model = options.model || "openai/gpt-oss-20b";
    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: options.temperature ?? 0.2,
            max_completion_tokens: options.max_tokens ?? 300,
            stream: false
        })
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error (${response.status}): ${errorText}`);
    }
    const data = await response.json();
    return data;
}
function groqChatStream(messages, options = {}) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not configured");
    // CHANGED: Replaced invalid model
    const model = options.model || "openai/gpt-oss-20b";
    const controller = new AbortController();
    const streamPromise = fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: options.temperature ?? 0.2,
            max_completion_tokens: options.max_tokens ?? 300,
            stream: true
        }),
        signal: controller.signal
    }).then(async (response)=>{
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Groq API error (${response.status}): ${errorText}`);
        }
        if (!response.body) throw new Error("No response body for streaming");
        return response.body;
    });
    const readableStream = new ReadableStream({
        start (ctrl) {
            streamPromise.then((bodyStream)=>{
                const reader = bodyStream.getReader();
                function pump() {
                    return reader.read().then(({ done, value })=>{
                        if (done) {
                            ctrl.close();
                            return;
                        }
                        ctrl.enqueue(value);
                        return pump();
                    });
                }
                return pump();
            }).catch((err)=>ctrl.error(err));
        }
    });
    return {
        stream: readableStream,
        abort: ()=>controller.abort()
    };
}
}),
"[project]/src/lib/rag.ts [app-edge-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "chunkText",
    ()=>chunkText,
    "deleteDocument",
    ()=>deleteDocument,
    "listDocuments",
    ()=>listDocuments,
    "ragQuery",
    ()=>ragQuery,
    "ragQueryStream",
    ()=>ragQueryStream,
    "retrieveChunks",
    ()=>retrieveChunks,
    "storeDocument",
    ()=>storeDocument
]);
/**
 * RAG Pipeline: Chunking + Retrieval + Generation
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/index.ts [app-edge-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-edge-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-edge-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/select.js [app-edge-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/sql.js [app-edge-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$groq$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/groq.ts [app-edge-route] (ecmascript)");
;
;
;
;
function chunkText(text, chunkSize = 250, overlap = 50) {
    if (text.length <= chunkSize) return [
        text
    ];
    const result = [];
    let start = 0;
    while(start < text.length){
        const end = Math.min(start + chunkSize, text.length);
        result.push(text.slice(start, end).trim());
        start += chunkSize - overlap;
        if (start >= text.length) break;
    }
    return result.filter((c)=>c.length > 0);
}
async function storeDocument(title, transcript) {
    const [doc] = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["db"].insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["documents"]).values({
        title,
        transcript
    }).returning();
    const textChunks = chunkText(transcript);
    if (textChunks.length > 0) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["db"].insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["chunks"]).values(textChunks.map((content, idx)=>({
                documentId: doc.id,
                content,
                chunkIndex: String(idx)
            })));
    }
    return doc;
}
async function listDocuments() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["db"].select({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["documents"].id,
        title: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["documents"].title,
        transcript: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["documents"].transcript,
        createdAt: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["documents"].createdAt
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["documents"]).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["documents"].createdAt));
}
async function deleteDocument(id) {
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["db"].delete(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["chunks"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["chunks"].documentId, id));
    await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["db"].delete(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["documents"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["documents"].id, id));
}
async function retrieveChunks(query, topK = 3) {
    const terms = query.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w)=>w.length >= 2 && ![
            "the",
            "and",
            "for",
            "are",
            "but",
            "not",
            "you",
            "all",
            "can",
            "had",
            "her",
            "was",
            "one",
            "our",
            "out",
            "what",
            "when",
            "where",
            "who",
            "will",
            "with",
            "this",
            "that",
            "from",
            "have",
            "been",
            "each",
            "which",
            "their",
            "there",
            "these",
            "those",
            "how",
            "does",
            "why",
            "did"
        ].includes(w));
    if (terms.length === 0) {
        const result = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["db"].select({
            content: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["chunks"].content,
            documentId: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["chunks"].documentId
        }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["chunks"]).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["chunks"].createdAt)).limit(topK);
        return result;
    }
    const tsQuery = terms.slice(0, 5).map((t)=>t.replace(/[^a-zA-Z0-9]/g, "")).filter((t)=>t.length > 0).join(" OR ");
    if (!tsQuery) {
        const result = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["db"].select({
            content: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["chunks"].content,
            documentId: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["chunks"].documentId
        }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["chunks"]).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["chunks"].createdAt)).limit(topK);
        return result;
    }
    const result = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["db"].execute(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["sql"]`
    SELECT content, document_id as "documentId"
    FROM ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["chunks"]}
    WHERE to_tsvector('english', content) @@ websearch_to_tsquery('english', ${tsQuery})
    ORDER BY ts_rank(to_tsvector('english', content), websearch_to_tsquery('english', ${tsQuery})) DESC
    LIMIT ${topK}
  `);
    if (result.rows.length === 0) {
        const likeConditions = terms.slice(0, 5).map((term)=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["sql"]`${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["chunks"].content} ILIKE ${"%" + term + "%"}`).reduce((acc, cond)=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["sql"]`${acc} OR ${cond}`);
        const fallback = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["db"].select({
            content: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["chunks"].content,
            documentId: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["chunks"].documentId
        }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["chunks"]).where(likeConditions).limit(topK);
        if (fallback.length === 0) {
            const recent = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["db"].select({
                content: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["chunks"].content,
                documentId: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["chunks"].documentId
            }).from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["chunks"]).orderBy((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$select$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["desc"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["chunks"].createdAt)).limit(topK);
            return recent;
        }
        return fallback;
    }
    return result.rows;
}
// ─── Generation ──────────────────────────────────────────────
// CHANGED: The AI is now strictly forced to start responses with a comma!
const RAG_SYSTEM_PROMPT = `You are a lightning-fast AI voice assistant.
STRICT RULES:
1. YOU MUST ALWAYS PROVIDE A TEXT RESPONSE.
2. CRITICAL: You MUST start every single response with a short acknowledgment followed by a comma (e.g., "Yes, ", "Okay, ", "हाँ, ", or "ठीक है, "). 
3. After the comma, use the Context to answer the Question directly in under 20 words.
4. If Context contains personal statements like "My name is X", treat that as the user's information.`;
async function ragQuery(question, topK = 3) {
    const totalStart = performance.now();
    const retrievalStart = performance.now();
    const relevantChunks = await retrieveChunks(question, topK);
    const retrievalMs = Math.round(performance.now() - retrievalStart);
    const context = relevantChunks.map((c, i)=>`[${i + 1}] ${c.content}`).join(" | ");
    const generationStart = performance.now();
    const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$groq$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["groqChatCompletion"])([
        {
            role: "system",
            content: RAG_SYSTEM_PROMPT
        },
        {
            role: "user",
            content: context ? `Context: ${context}\n\nQuestion: ${question}` : `Question: ${question}`
        }
    ], {
        max_tokens: 300,
        temperature: 0.5
    });
    const generationMs = Math.round(performance.now() - generationStart);
    const answer = response.choices[0]?.message?.content || "हाँ, मुझे समझ नहीं आया।";
    const latencyMs = Math.round(performance.now() - totalStart);
    return {
        answer,
        latencyMs,
        retrievalMs,
        generationMs,
        chunksUsed: relevantChunks.length
    };
}
async function ragQueryStream(question, topK = 3) {
    const totalStart = performance.now();
    const retrievalStart = performance.now();
    const relevantChunks = await retrieveChunks(question, topK);
    const retrievalMs = Math.round(performance.now() - retrievalStart);
    const context = relevantChunks.map((c, i)=>`[${i + 1}] ${c.content}`).join(" | ");
    const { stream } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$groq$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["groqChatStream"])([
        {
            role: "system",
            content: RAG_SYSTEM_PROMPT
        },
        {
            role: "user",
            content: context ? `Context: ${context}\n\nQuestion: ${question}` : `Question: ${question}`
        }
    ], {
        max_tokens: 300,
        temperature: 0.5
    });
    const latencyMs = Math.round(performance.now() - totalStart);
    return {
        stream,
        latencyMs,
        retrievalMs,
        chunksUsed: relevantChunks.length
    };
}
}),
"[project]/src/app/api/rag/query/route.ts [app-edge-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "dynamic",
    ()=>dynamic,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [app-edge-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/spec-extension/response.js [app-edge-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$rag$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/rag.ts [app-edge-route] (ecmascript)");
;
;
const runtime = "edge";
const dynamic = "force-dynamic";
async function POST(request) {
    try {
        const body = await request.json();
        const { question, stream } = body;
        if (!question || question.trim().length === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Question is required"
            }, {
                status: 400
            });
        }
        if (stream) {
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$rag$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["ragQueryStream"])(question);
            const encoder = new TextEncoder();
            const metaEvent = encoder.encode(`data: ${JSON.stringify({
                type: "meta",
                retrievalMs: result.retrievalMs,
                latencyMs: result.latencyMs,
                chunksUsed: result.chunksUsed
            })}\n\n`);
            let sentDone = false;
            let buffer = "";
            const readable = new ReadableStream({
                start (controller) {
                    controller.enqueue(metaEvent);
                    const reader = result.stream.getReader();
                    const decoder = new TextDecoder();
                    function pump() {
                        return reader.read().then(({ done, value })=>{
                            if (done) {
                                if (buffer.trim()) {
                                    processLine(buffer, controller, encoder);
                                }
                                if (!sentDone) {
                                    sentDone = true;
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                        type: "done"
                                    })}\n\n`));
                                }
                                controller.close();
                                return;
                            }
                            buffer += decoder.decode(value, {
                                stream: true
                            });
                            const lines = buffer.split("\n");
                            buffer = lines.pop() ?? "";
                            for (const line of lines){
                                processLine(line, controller, encoder);
                            }
                            return pump();
                        });
                    }
                    function processLine(line, streamController, textEncoder) {
                        const trimmed = line.trim();
                        if (!trimmed.startsWith("data: ")) return;
                        const data = trimmed.slice(6);
                        if (data === "[DONE]") {
                            if (!sentDone) {
                                sentDone = true;
                                streamController.enqueue(textEncoder.encode(`data: ${JSON.stringify({
                                    type: "done"
                                })}\n\n`));
                            }
                            return;
                        }
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content;
                            if (content) {
                                streamController.enqueue(textEncoder.encode(`data: ${JSON.stringify({
                                    type: "token",
                                    content
                                })}\n\n`));
                            }
                        } catch  {
                        // Ignore incomplete frame fragments
                        }
                    }
                    pump().catch((err)=>{
                        console.error("Stream error:", err);
                        if (!sentDone) {
                            sentDone = true;
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                type: "done"
                            })}\n\n`));
                        }
                        controller.close();
                    });
                }
            });
            return new Response(readable, {
                headers: {
                    "Content-Type": "text/event-stream; charset=utf-8",
                    "Cache-Control": "no-cache, no-transform",
                    Connection: "keep-alive",
                    "X-Accel-Buffering": "no"
                }
            });
        }
        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$rag$2e$ts__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["ragQuery"])(question);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            answer: result.answer,
            latency: {
                totalMs: result.latencyMs,
                retrievalMs: result.retrievalMs,
                generationMs: result.generationMs
            },
            chunksUsed: result.chunksUsed
        });
    } catch (error) {
        console.error("RAG query error:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: error instanceof Error ? error.message : "RAG query failed"
        }, {
            status: 500
        });
    }
}
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__0l3a52w._.js.map