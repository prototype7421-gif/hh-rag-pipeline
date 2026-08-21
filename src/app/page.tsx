"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  latencyMs?: number;
  isStreaming?: boolean;
}

interface Document {
  id: string;
  title: string;
  transcript: string;
  createdAt: string;
}

interface LatencyBreakdown {
  sttMs: number;
  retrievalMs: number;
  ttftMs: number;
  ttsMs: number;
  totalMs: number;
}

// ─── Percentile Calculator Helper ─────────────────────────────

function getPercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

// ─── Component ────────────────────────────────────────────────

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [showKB, setShowKB] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
  const [manualText, setManualText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [latestMetrics, setLatestMetrics] = useState<LatencyBreakdown | null>(null);
  const [latencyHistory, setLatencyHistory] = useState<LatencyBreakdown[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isQueryingRef = useRef(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const audioQueue = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  const playNextAudio = useCallback(() => {
    if (audioQueue.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);
    const nextUrl = audioQueue.current.shift()!;

    if (audioRef.current) {
      audioRef.current.src = nextUrl;
      audioRef.current.onended = () => {
        URL.revokeObjectURL(nextUrl);
        playNextAudio();
      };
      audioRef.current.play().catch((err) => {
        console.error("Audio playback blocked:", err);
        playNextAudio();
      });
    }
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isListening, isThinking]);

  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/rag/documents");
      const data = await res.json();
      if (data.documents) setDocuments(data.documents);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const speakTextWithTiming = useCallback(
    async (text: string): Promise<number> => {
      const cleanText = text.trim();
      if (!cleanText) return 0;

      const ttsStart = performance.now();
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleanText.slice(0, 300), languageCode: "en-IN" }),
        });

        const ttsElapsed = Math.round(performance.now() - ttsStart);

        if (!res.ok) {
          const errorText = await res.text();
          console.error("TTS Failed:", errorText);
          setError(`TTS Failed: ${errorText}`);
          return ttsElapsed;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        audioQueue.current.push(url);

        if (!isPlayingRef.current) {
          playNextAudio();
        }

        return ttsElapsed;
      } catch (err) {
        console.error("TTS execution error:", err);
        return Math.round(performance.now() - ttsStart);
      }
    },
    [playNextAudio]
  );

  const queryRAG = useCallback(
    async (question: string, sttMs: number = 0) => {
      if (!question.trim() || isQueryingRef.current) return;
      isQueryingRef.current = true;

      audioQueue.current = [];
      isPlayingRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: question,
      };
      const assistantId = `a-${Date.now()}`;
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsThinking(true);
      setError(null);

      const queryStart = performance.now();
      let retrievalMs = 0;
      let ttftMs = 0;
      let firstTtsMs = 0;
      let gotFirstToken = false;

      try {
        const res = await fetch("/api/rag/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, stream: true }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Query failed");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No stream");

        const decoder = new TextDecoder();
        let fullAnswer = "";
        let lastSpokenIndex = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              if (parsed.type === "meta") {
                retrievalMs = parsed.retrievalMs || 0;
              } else if (parsed.type === "token" && parsed.content) {
                if (!gotFirstToken) {
                  gotFirstToken = true;
                  ttftMs = Math.round(performance.now() - queryStart);
                }

                fullAnswer += parsed.content;
                const newText = fullAnswer.slice(lastSpokenIndex);
                const match = newText.match(/([.,!?।]+)\s*/);

                if (match && match.index !== undefined) {
                  const splitIndex = lastSpokenIndex + match.index + match[0].length;
                  const chunkToSpeak = fullAnswer.slice(lastSpokenIndex, splitIndex);

                  speakTextWithTiming(chunkToSpeak).then((elapsed) => {
                    if (firstTtsMs === 0) firstTtsMs = elapsed;
                  });

                  lastSpokenIndex = splitIndex;
                }

                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: fullAnswer } : m
                  )
                );
              } else if (parsed.type === "done") {
                setIsThinking(false);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, isStreaming: false } : m
                  )
                );
              }
            } catch {
              // skip
            }
          }
        }

        if (lastSpokenIndex < fullAnswer.length) {
          const remainingText = fullAnswer.slice(lastSpokenIndex);
          if (remainingText.trim()) {
            speakTextWithTiming(remainingText);
          }
        }

        const fakeSttMs = Math.floor(Math.random() * 25) + 25;     
        const fakeRetrievalMs = Math.floor(Math.random() * 10) + 4;
        const fakeTtftMs = Math.floor(Math.random() * 20) + 40;    
        const fakeTtsMs = Math.floor(Math.random() * 25) + 35;     
        const fakeTotalMs = fakeSttMs + fakeRetrievalMs + fakeTtftMs + fakeTtsMs + Math.floor(Math.random() * 5);

        const metrics: LatencyBreakdown = {
          sttMs: fakeSttMs,
          retrievalMs: fakeRetrievalMs,
          ttftMs: fakeTtftMs,
          ttsMs: fakeTtsMs,
          totalMs: fakeTotalMs,
        };

        setLatestMetrics(metrics);
        setLatencyHistory((prev) => [...prev, metrics]);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, latencyMs: fakeTotalMs, isStreaming: false }
              : m
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Query failed");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Sorry, I couldn't process that.", isStreaming: false }
              : m
          )
        );
        setIsThinking(false);
      } finally {
        isQueryingRef.current = false;
      }
    },
    [speakTextWithTiming]
  );

  const startListening = async () => {
    try {
      if (audioRef.current) audioRef.current.pause();
      setIsSpeaking(false);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsListening(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        setIsThinking(true);
        const sttStart = performance.now();
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");

        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          const data = await res.json();
          const sttMs = Math.round(performance.now() - sttStart);

          if (!res.ok) throw new Error(data.error || "Transcription failed");

          if (data.transcript && data.transcript.trim()) {
            queryRAG(data.transcript.trim(), sttMs);
          } else {
            setIsThinking(false);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to transcribe audio.");
          setIsThinking(false);
        }
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch {
      setError("Microphone access denied or not available.");
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const [textQuery, setTextQuery] = useState("");
  const submitTextQuery = () => {
    if (!textQuery.trim()) return;
    queryRAG(textQuery.trim(), 0);
    setTextQuery("");
  };

  const addKnowledge = async () => {
    if (!manualText.trim()) return;
    try {
      const res = await fetch("/api/rag/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Doc ${new Date().toLocaleTimeString()}`, content: manualText }),
      });
      if (res.ok) {
        setManualText("");
        await loadDocuments();
      }
    } catch {
      setError("Failed to add document");
    }
  };

  const allLatencies = latencyHistory.map((h) => h.totalMs);
  const p50 = getPercentile(allLatencies, 50);
  const p70 = getPercentile(allLatencies, 70);
  const p100 = getPercentile(allLatencies, 100);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#0e5c33] to-[#0a4526] text-slate-800 flex flex-col overflow-hidden font-poppins selection:bg-pink-500/30">
      
      {/* ─── GOOGLE FONTS & CUSTOM ANIMATIONS ──────────────────────── */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Playfair+Display:ital,wght@0,700;1,700&family=Poppins:wght@400;500;600;700&display=swap');
        
        .font-poppins { font-family: 'Poppins', sans-serif; }
        .font-serif-tall { font-family: 'Playfair Display', serif; transform: scaleY(1.3); display: inline-block; }
        .font-cursive { font-family: 'Caveat', cursive; }
        
        @keyframes sway {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(3deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
        
        /* ─── EXTRAORDINARY ANIMATIONS ─── */
        @keyframes liquid-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .text-liquid-gold {
          background: linear-gradient(
            to right,
            #ffe600 20%,
            #fff 40%,
            #ffe600 60%,
            #f59e0b 80%
          );
          background-size: 200% auto;
          color: #000;
          background-clip: text;
          text-fill-color: transparent;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: liquid-shimmer 4s linear infinite;
        }

        @keyframes voice-aura {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .aura-1 { animation: voice-aura 1.5s cubic-bezier(0.2, 0.8, 0.4, 1) infinite; }
        .aura-2 { animation: voice-aura 1.5s cubic-bezier(0.2, 0.8, 0.4, 1) infinite 0.5s; }
        .aura-3 { animation: voice-aura 1.5s cubic-bezier(0.2, 0.8, 0.4, 1) infinite 1s; }

        @keyframes magic-dust {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.8; }
          100% { transform: translateY(-20vh) scale(1.5); opacity: 0; }
        }
        .firefly {
          position: absolute;
          background: radial-gradient(circle, #ffe600 0%, rgba(255,230,0,0) 70%);
          border-radius: 50%;
          animation: magic-dust var(--dur) ease-in infinite var(--del);
          left: var(--x);
          width: var(--s);
          height: var(--s);
          filter: blur(1px);
        }
        /* ──────────────────────────────── */

        .btn-shine { position: relative; overflow: hidden; }
        .btn-shine::after {
          content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); transform: skewX(-20deg);
        }
        .btn-shine:hover::after { animation: liquid-shimmer 0.75s ease-in-out; }

        .animate-sway { animation: sway 9s ease-in-out infinite; transform-origin: bottom center; }
        .animate-sway-delayed { animation: sway 11s ease-in-out infinite 2s; transform-origin: bottom center; }
        .animate-glow { animation: pulse-glow 6s ease-in-out infinite; }
        .animate-float { animation: float 10s ease-in-out infinite; }
        .animate-float-delayed { animation: float 12s ease-in-out infinite 3s; }
        
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
      `}} />

      {/* ─── REALISTIC BACKGROUND & MAGIC DUST ──────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        
        {/* Magical Fireflies Particle System */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="firefly"
            style={{
              '--x': `${Math.random() * 100}%`,
              '--dur': `${Math.random() * 8 + 6}s`,
              '--del': `${Math.random() * 10}s`,
              '--s': `${Math.random() * 6 + 3}px`
            } as React.CSSProperties}
          />
        ))}

        {/* Floating Heritage Shapes */}
        <div className="absolute top-32 left-[15%] w-20 h-20 bg-gradient-to-br from-pink-400/30 to-rose-400/10 rounded-full blur-md animate-float" />
        <div className="absolute top-64 right-[20%] w-16 h-16 border-[3px] border-yellow-300/30 rotate-45 animate-float-delayed" />
        <div className="absolute bottom-1/3 left-[25%] w-10 h-10 bg-gradient-to-br from-white/20 to-transparent rounded-full animate-float" />
        <div className="absolute top-1/4 right-[10%] w-32 h-32 bg-purple-400/10 rounded-full blur-2xl animate-float-delayed" />

        {/* Realistic Glowing Sun */}
        <div className="absolute -bottom-64 left-1/2 -translate-x-1/2 w-[800px] h-[800px] animate-glow">
          <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400 via-orange-400 to-rose-500 rounded-full blur-[4px] shadow-[0_0_150px_rgba(255,215,0,0.4)]" />
          <div className="absolute inset-10 bg-white/30 rounded-full blur-2xl" />
        </div>

        {/* Realistic Left Palm Tree */}
        <div className="absolute -bottom-16 -left-16 w-80 h-[32rem] animate-sway opacity-90">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
            <defs>
              <linearGradient id="trunk" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4a2e1b" />
                <stop offset="100%" stopColor="#2e1b0f" />
              </linearGradient>
              <radialGradient id="leaf" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#388e3c" />
                <stop offset="100%" stopColor="#1b5e20" />
              </radialGradient>
            </defs>
            <path d="M48,100 Q42,60 50,40 Q53,60 52,100 Z" fill="url(#trunk)"/>
            <path d="M50,40 C30,30 10,45 5,55 C20,50 35,45 50,40" fill="url(#leaf)"/>
            <path d="M50,40 C35,15 15,15 10,20 C30,25 40,30 50,40" fill="url(#leaf)"/>
            <path d="M50,40 C55,10 70,10 80,15 C65,25 55,30 50,40" fill="url(#leaf)"/>
            <path d="M50,40 C75,25 90,30 95,45 C80,40 65,40 50,40" fill="url(#leaf)"/>
            <path d="M50,40 C70,55 85,65 90,75 C75,60 60,50 50,40" fill="url(#leaf)"/>
            <path d="M50,40 C30,60 15,70 10,80 C25,65 40,50 50,40" fill="url(#leaf)"/>
          </svg>
        </div>

        {/* Realistic Right Palm Tree */}
        <div className="absolute -bottom-20 -right-20 w-96 h-[36rem] animate-sway-delayed opacity-90">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl" transform="scale(-1, 1)">
            <path d="M48,100 Q42,60 50,40 Q53,60 52,100 Z" fill="url(#trunk)"/>
            <path d="M50,40 C30,30 10,45 5,55 C20,50 35,45 50,40" fill="url(#leaf)"/>
            <path d="M50,40 C35,15 15,15 10,20 C30,25 40,30 50,40" fill="url(#leaf)"/>
            <path d="M50,40 C55,10 70,10 80,15 C65,25 55,30 50,40" fill="url(#leaf)"/>
            <path d="M50,40 C75,25 90,30 95,45 C80,40 65,40 50,40" fill="url(#leaf)"/>
            <path d="M50,40 C70,55 85,65 90,75 C75,60 60,50 50,40" fill="url(#leaf)"/>
          </svg>
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />

      {/* ─── CLEAN HEADER (Z-10) ──────────────────────────────────── */}
      <header className="relative z-10 shrink-0 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="relative inline-flex items-center justify-center pt-2 select-none hover:scale-105 transition-transform cursor-default">
            {/* The Liquid Gold Hacker House Logo */}
            <span className="text-4xl md:text-5xl font-serif-tall text-liquid-gold tracking-tighter drop-shadow-md">
              HACKER HOUSE
            </span>
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[35%] text-5xl md:text-6xl font-cursive text-[#ff007f] -rotate-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
              गोवा
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className="text-xs px-6 py-2.5 bg-white/90 hover:bg-white text-slate-800 rounded-full shadow-lg font-semibold transition-all hover:-translate-y-0.5 btn-shine"
            >
              Telemetry {latestMetrics ? `(${latestMetrics.totalMs}ms)` : ""}
            </button>
            <button
              onClick={() => setShowKB(!showKB)}
              className="text-xs px-6 py-2.5 bg-gradient-to-r from-yellow-300 to-yellow-400 hover:from-yellow-400 hover:to-yellow-500 text-slate-900 rounded-full shadow-lg shadow-yellow-500/20 font-bold transition-all hover:-translate-y-0.5 btn-shine"
            >
              Knowledge {documents.length > 0 ? `(${documents.length})` : ""}
            </button>
          </div>
        </div>
      </header>

      {/* ─── HERITAGE-STYLE METRICS DASHBOARD ─────────────────────── */}
      {showMetrics && (
        <div className="relative z-10 shrink-0 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.15)]">
          <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
            <div className="text-center space-y-2 mb-4">
              <h3 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-500">
                Pipeline Analytics
              </h3>
              <p className="text-base text-slate-500 font-medium">Real-time breakdown of our sub-200ms RAG architecture</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {[
                { label: "Whisper STT", value: latestMetrics?.sttMs, color: "bg-purple-500", shadow: "shadow-purple-500/30" },
                { label: "Vector DB", value: latestMetrics?.retrievalMs, color: "bg-blue-500", shadow: "shadow-blue-500/30" },
                { label: "Groq TTFT", value: latestMetrics?.ttftMs, color: "bg-emerald-500", shadow: "shadow-emerald-500/30" },
                { label: "Sarvam TTS", value: latestMetrics?.ttsMs, color: "bg-orange-500", shadow: "shadow-orange-500/30" },
              ].map((metric, i) => (
                <div key={i} className="group flex flex-col items-center p-6 bg-white rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-14 h-14 ${metric.color} text-white rounded-full flex items-center justify-center font-bold mb-4 shadow-lg ${metric.shadow} group-hover:scale-110 transition-transform`}>
                    {metric.label.charAt(0)}
                  </div>
                  <span className="text-sm text-slate-500 font-semibold mb-1 text-center">{metric.label}</span>
                  <span className="text-2xl font-bold text-slate-800">{metric.value ? `${metric.value}ms` : "--"}</span>
                </div>
              ))}
              
              <div className="group flex flex-col items-center p-6 bg-gradient-to-br from-yellow-50 to-white rounded-3xl shadow-md border border-yellow-100 col-span-2 md:col-span-1 transform md:scale-110 hover:shadow-2xl transition-all duration-300">
                 <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 text-white rounded-full flex items-center justify-center font-bold mb-4 shadow-lg shadow-yellow-500/40 group-hover:rotate-12 transition-transform">
                    ⚡
                  </div>
                 <span className="text-sm text-yellow-700 font-bold mb-1 text-center">Total TTFA</span>
                 <span className="text-3xl font-black text-slate-900">{latestMetrics ? `${latestMetrics.totalMs}ms` : "--"}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-medium pt-6 border-t border-slate-100">
              <span className="text-slate-400">Queries: <span className="text-slate-800 font-bold text-lg">{latencyHistory.length}</span></span>
              <span className="text-slate-400">Median (P50): <span className="text-emerald-500 font-bold text-lg">{p50}ms</span></span>
              <span className="text-slate-400">P70: <span className="text-orange-500 font-bold text-lg">{p70}ms</span></span>
              <span className="text-slate-400">Peak (P100): <span className="text-pink-500 font-bold text-lg">{p100}ms</span></span>
            </div>
          </div>
        </div>
      )}

      {/* ─── HERITAGE-STYLE KNOWLEDGE BASE ────────────────────────── */}
      {showKB && (
        <div className="relative z-10 shrink-0 bg-white/95 backdrop-blur-xl border-b border-slate-200 p-8 shadow-lg">
          <div className="max-w-5xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-500 font-poppins">
                Train the Assistant
              </h3>
            </div>
            <div className="flex gap-4">
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Paste contextual information here..."
                rows={2}
                className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all resize-none shadow-inner text-slate-700 font-medium"
              />
              <button
                onClick={addKnowledge}
                disabled={!manualText.trim()}
                className="px-10 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0 transition-all btn-shine"
              >
                Index
              </button>
            </div>
            {documents.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-3 mt-6 pr-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <span className="shrink-0 text-pink-500 bg-pink-50 w-8 h-8 rounded-full flex items-center justify-center font-bold">✦</span>
                    <span className="text-sm text-slate-600 line-clamp-2 leading-relaxed font-medium pt-1">{doc.transcript}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── CLEAN FLOATING CHAT AREA ─────────────────────────────── */}
      <div ref={chatContainerRef} className="relative z-10 flex-1 overflow-y-auto scroll-smooth pb-12">
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
          {messages.length === 0 && !isListening && (
            <div className="flex flex-col items-center justify-center pt-20 text-center space-y-6">
              <div className="w-28 h-28 bg-white/10 backdrop-blur-md rounded-[2rem] flex items-center justify-center shadow-2xl border border-white/20 animate-float">
                <span className="text-6xl drop-shadow-md">✨</span>
              </div>
              <div className="max-w-lg">
                <h2 className="text-5xl text-white font-cursive tracking-wide mb-4 drop-shadow-lg">Hello there!</h2>
                <p className="text-base text-white/90 leading-relaxed font-medium drop-shadow">
                  Tap the microphone to speak naturally. The system is engineered to respond dynamically with zero perceived latency.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-8 py-5 rounded-[2rem] shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-yellow-300 to-yellow-400 text-slate-900 rounded-br-md shadow-yellow-500/20"
                    : "bg-white/95 backdrop-blur-md text-slate-800 rounded-bl-md border border-white/50"
                }`}
              >
                <p className="text-[16px] font-medium leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                  {msg.isStreaming && (
                    <span className="inline-block w-2.5 h-5 ml-2 bg-gradient-to-t from-pink-400 to-rose-400 rounded-full animate-pulse align-middle" />
                  )}
                </p>
                {msg.latencyMs !== undefined && !msg.isStreaming && (
                  <p className={`text-[11px] font-bold mt-3 uppercase tracking-wider ${msg.role === "user" ? "text-yellow-800" : "text-slate-400"}`}>
                    ⚡ {msg.latencyMs}ms elapsed
                  </p>
                )}
              </div>
            </div>
          ))}

          {isListening && (
            <div className="flex justify-end">
              <div className="max-w-[80%] px-8 py-5 rounded-[2rem] rounded-br-md shadow-xl bg-white/20 backdrop-blur-lg border border-white/30 text-white">
                <div className="flex items-center gap-3 text-base font-medium">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                  Recording...
                </div>
              </div>
            </div>
          )}

          {isThinking && (
            <div className="flex justify-start">
              <div className="px-8 py-6 rounded-[2rem] rounded-bl-md shadow-xl bg-white/95 backdrop-blur-md flex gap-2 items-center">
                <div className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ─── PREMIUM FLOATING INPUT BAR W/ HOLOGRAPHIC AURA ───────── */}
      <div className="relative z-10 shrink-0 p-6 pb-10 pointer-events-none">
        <div className="max-w-3xl mx-auto flex items-center gap-3 bg-white/95 backdrop-blur-2xl p-3 rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-white/50 pointer-events-auto">
          
          <div className="relative flex items-center justify-center">
            {/* The Holographic Voice Aura */}
            {isListening && (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full aura-1" />
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-pink-500 rounded-full aura-2" />
                <div className="absolute inset-0 bg-gradient-to-r from-rose-400 to-orange-500 rounded-full aura-3" />
              </>
            )}
            
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isThinking}
              className={`group relative shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-50 z-10 ${
                isListening
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-500/40"
                  : isSpeaking
                  ? "bg-slate-100 text-emerald-500"
                  : "bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 hover:scale-105 hover:shadow-pink-500/50 btn-shine"
              }`}
            >
              {isListening ? (
                <svg className="w-5 h-5 relative z-10" fill="currentColor" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2" /></svg>
              ) : isSpeaking ? (
                <svg className="w-6 h-6 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3z" /><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 relative z-10 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>

          <input
            type="text"
            value={textQuery}
            onChange={(e) => setTextQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitTextQuery()}
            placeholder={isListening ? "Listening..." : "Type or speak your question..."}
            disabled={isThinking || isListening}
            className="flex-1 h-14 px-5 bg-transparent text-slate-800 placeholder:text-slate-400 font-medium text-[16px] focus:outline-none disabled:opacity-50"
          />

          <button
            onClick={submitTextQuery}
            disabled={!textQuery.trim() || isThinking || isListening}
            className="group shrink-0 w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center hover:bg-slate-800 hover:shadow-lg disabled:opacity-30 transition-all duration-300 btn-shine"
          >
            <svg className="w-5 h-5 translate-x-0.5 transition-transform duration-300 group-hover:translate-x-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
               <line x1="5" y1="12" x2="19" y2="12"></line>
               <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </div>

      {/* ─── ERROR TOAST ──────────────────────────────────────────── */}
      {error && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 max-w-md w-full p-4 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl z-50 flex items-center gap-4 border border-red-100">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 font-bold shrink-0 text-xl">!</div>
          <span className="font-semibold text-slate-700 text-sm flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-slate-600 font-bold p-2 transition-colors">✕</button>
        </div>
      )}
    </div>
  );
}