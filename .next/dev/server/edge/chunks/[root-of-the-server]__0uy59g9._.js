(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push(["chunks/[root-of-the-server]__0uy59g9._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/src/app/api/tts/route.ts [app-edge-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [app-edge-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/spec-extension/response.js [app-edge-route] (ecmascript)");
;
const runtime = "edge";
async function POST(request) {
    try {
        const body = await request.json();
        const { text, languageCode, speaker } = body;
        if (!text || text.trim().length === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Text is required"
            }, {
                status: 400
            });
        }
        const apiKey = process.env.SARVAM_API_KEY;
        if (!apiKey) throw new Error("SARVAM_API_KEY is not configured");
        const response = await fetch("https://api.sarvam.ai/text-to-speech", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-subscription-key": apiKey
            },
            body: JSON.stringify({
                inputs: [
                    text.slice(0, 500)
                ],
                target_language_code: languageCode || "en-IN",
                speaker: speaker || "shubh",
                pace: 1.4,
                speech_sample_rate: 24000,
                model: "bulbul:v3"
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Sarvam TTS error (${response.status}): ${errorText}`);
        }
        const data = await response.json();
        if (!data.audios || data.audios.length === 0) {
            throw new Error("No audio returned from TTS");
        }
        const audioBase64 = data.audios[0];
        // CHANGED: Edge-compatible Base64 decoding (replaces Node Buffer)
        const binaryString = atob(audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for(let i = 0; i < binaryString.length; i++){
            bytes[i] = binaryString.charCodeAt(i);
        }
        return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["NextResponse"](bytes, {
            headers: {
                "Content-Type": "audio/wav",
                "Content-Length": String(bytes.length)
            }
        });
    } catch (error) {
        console.error("TTS error:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: error instanceof Error ? error.message : "TTS failed"
        }, {
            status: 500
        });
    }
}
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__0uy59g9._.js.map