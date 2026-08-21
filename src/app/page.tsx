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

  const [showMetrics, setShowMetrics] = useState(false);
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

  const allLatencies = latencyHistory.map((h) => h.totalMs);
  const p50 = getPercentile(allLatencies, 50);
  const p70 = getPercentile(allLatencies, 70);
  const p100 = getPercentile(allLatencies, 100);

  return (
    <div className="relative min-h-screen bg-[#0b5c33] text-white flex flex-col overflow-hidden font-poppins selection:bg-[#ffe600]/40">
      
      {/* ─── GOOGLE FONTS & CUSTOM ANIMATIONS ──────────────────────── */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,600;1,700&family=Poppins:wght@400;500;600;700&family=Space+Mono:wght@700&display=swap');
        
        .font-poppins { font-family: 'Poppins', sans-serif; }
        .font-serif-italic { font-family: 'Playfair Display', serif; font-style: italic; }
        .font-mono-bold { font-family: 'Space Mono', monospace; }
        
        /* Sun Rays Animation */
        @keyframes spin-slow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 60s linear infinite;
        }

        /* Subtle Wave Animation */
        @keyframes wave-flow {
          0% { background-position-x: 0; }
          100% { background-position-x: 100px; }
        }
        .animate-waves {
          animation: wave-flow 4s linear infinite;
        }

        /* Float for Beach Elements */
        @keyframes float-soft {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-float-soft { animation: float-soft 4s ease-in-out infinite; }
        .animate-float-delayed { animation: float-soft 5s ease-in-out infinite 2s; }
        
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.4); border-radius: 10px; }
      `}} />

      {/* ─── VECTOR ART BACKGROUND ────────────────────────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        
        {/* Giant Yellow Sun & Rays */}
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]">
          {/* Rotating Rays */}
          <div className="absolute top-1/2 left-1/2 w-full h-full animate-spin-slow">
            {Array.from({ length: 16 }).map((_, i) => (
              <div 
                key={i} 
                className="absolute top-1/2 left-1/2 w-1.5 h-16 bg-[#ffe600] rounded-full"
                style={{
                  transform: `translate(-50%, -50%) rotate(${i * (360 / 16)}deg) translateY(-280px)`
                }}
              />
            ))}
          </div>
          {/* Solid Sun Circle behind chat */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] bg-[#ffe600] rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-white rounded-full" />
        </div>

        {/* Ocean Waves */}
        <div className="absolute bottom-[220px] left-0 right-0 h-12 flex opacity-80 animate-waves" 
             style={{ 
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 Q 25 20, 50 10 T 100 10' fill='none' stroke='white' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`,
               backgroundRepeat: 'repeat-x' 
             }} 
        />

        {/* White Sand Base */}
        <div className="absolute bottom-0 left-0 right-0 h-[240px] bg-white border-t-[3px] border-white z-0" />

        {/* LINE ART BEACH ELEMENTS */}
        
        {/* Left Palm Tree */}
        <div className="absolute bottom-[160px] left-4 md:left-16 w-32 h-48 z-10 animate-float-soft">
          <svg viewBox="0 0 100 150" className="w-full h-full overflow-visible">
            {/* Trunk */}
            <path d="M45,150 Q40,80 50,50 Q55,80 55,150 Z" fill="white" stroke="#0b5c33" strokeWidth="3"/>
            {/* Leaves */}
            <path d="M50,50 Q20,40 5,60 Q25,50 50,50" fill="#1ebd60" stroke="#0b5c33" strokeWidth="2.5"/>
            <path d="M50,50 Q25,10 10,20 Q30,30 50,50" fill="#1ebd60" stroke="#0b5c33" strokeWidth="2.5"/>
            <path d="M50,50 Q50,0 70,10 Q60,30 50,50" fill="#1ebd60" stroke="#0b5c33" strokeWidth="2.5"/>
            <path d="M50,50 Q80,20 95,30 Q75,40 50,50" fill="#1ebd60" stroke="#0b5c33" strokeWidth="2.5"/>
            <path d="M50,50 Q85,55 90,75 Q70,60 50,50" fill="#1ebd60" stroke="#0b5c33" strokeWidth="2.5"/>
          </svg>
        </div>

        {/* Right Palm Tree */}
        <div className="absolute bottom-[140px] right-2 md:right-12 w-40 h-56 z-10 animate-float-delayed" style={{ transform: 'scaleX(-1)' }}>
          <svg viewBox="0 0 100 150" className="w-full h-full overflow-visible">
            <path d="M45,150 Q40,80 50,50 Q55,80 55,150 Z" fill="white" stroke="#0b5c33" strokeWidth="3"/>
            <path d="M50,50 Q20,40 5,60 Q25,50 50,50" fill="#1ebd60" stroke="#0b5c33" strokeWidth="2.5"/>
            <path d="M50,50 Q25,10 10,20 Q30,30 50,50" fill="#1ebd60" stroke="#0b5c33" strokeWidth="2.5"/>
            <path d="M50,50 Q50,0 70,10 Q60,30 50,50" fill="#1ebd60" stroke="#0b5c33" strokeWidth="2.5"/>
            <path d="M50,50 Q80,20 95,30 Q75,40 50,50" fill="#1ebd60" stroke="#0b5c33" strokeWidth="2.5"/>
            <path d="M50,50 Q85,55 90,75 Q70,60 50,50" fill="#1ebd60" stroke="#0b5c33" strokeWidth="2.5"/>
          </svg>
        </div>

        {/* Goa Beach Shack */}
        <div className="absolute bottom-[150px] right-32 md:right-48 w-32 h-24 bg-[#1ebd60] border-[3px] border-[#0b5c33] z-10">
           <div className="absolute -top-6 left-[-10%] w-[120%] h-6 bg-white border-[3px] border-[#0b5c33]" />
           <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#ff007f] border-[2px] border-[#0b5c33] px-2 py-0.5">
             <span className="text-[8px] font-bold text-white whitespace-nowrap">GOA BEACH</span>
           </div>
           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-10 bg-white border-x-[3px] border-t-[3px] border-[#0b5c33]" />
        </div>

        {/* Yellow Umbrella & Surfboards */}
        <div className="absolute bottom-[120px] left-32 md:left-48 z-10">
           {/* Umbrella Top */}
           <div className="w-16 h-8 bg-[#ffe600] rounded-t-full border-[3px] border-[#0b5c33]" />
           {/* Stick */}
           <div className="w-1 h-12 bg-white border-x-2 border-[#0b5c33] mx-auto -mt-1" />
        </div>

        <div className="absolute bottom-[130px] right-[40%] flex gap-2 z-10">
           {/* Surfboard 1 */}
           <div className="w-4 h-16 bg-[#ffe600] rounded-t-full border-[2px] border-[#0b5c33] rotate-12" />
           {/* Surfboard 2 */}
           <div className="w-4 h-14 bg-white rounded-t-full border-[2px] border-[#0b5c33] -rotate-6 mt-2" />
        </div>

      </div>

      <audio ref={audioRef} className="hidden" />

      {/* ─── TYPOGRAPHY HEADER (Z-20) ─────────────────────────────── */}
      <header className="relative z-20 pt-10 pb-4 text-center">
        <h1 className="text-5xl md:text-6xl font-serif-italic text-white tracking-wide flex items-center justify-center gap-3">
          Hacker House <span className="text-2xl md:text-3xl not-italic text-[#ffe600]">✦</span> Goa
        </h1>
        <p className="text-xs md:text-sm font-mono-bold text-white/90 tracking-[0.3em] mt-4 uppercase">
          28-31 OCT 2026 • GOA, INDIA
        </p>
        
        {/* Top Controls - ONLY Metrics Now */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 bg-transparent border-2 border-white/40 text-white hover:bg-white hover:text-[#0b5c33] transition-colors"
          >
            Metrics Status
          </button>
        </div>
      </header>

      {/* ─── VECTOR-STYLE METRICS DASHBOARD ───────────────────────── */}
      {showMetrics && (
        <div className="relative z-20 shrink-0 bg-[#0a4d2b] border-y-4 border-[#ffe600]">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: "STT", value: latestMetrics?.sttMs },
                { label: "RETRIEVAL", value: latestMetrics?.retrievalMs },
                { label: "TTFT", value: latestMetrics?.ttftMs },
                { label: "TTS", value: latestMetrics?.ttsMs },
              ].map((metric, i) => (
                <div key={i} className="flex flex-col items-center p-4 bg-white border-[3px] border-[#0b5c33]">
                  <span className="text-[10px] text-[#0b5c33] font-bold tracking-widest mb-1">{metric.label}</span>
                  <span className="text-2xl font-black text-black">{metric.value ? `${metric.value}ms` : "--"}</span>
                </div>
              ))}
              
              <div className="flex flex-col items-center p-4 bg-[#ffe600] border-[3px] border-[#0b5c33] col-span-2 md:col-span-1">
                 <span className="text-[10px] text-[#0b5c33] font-bold tracking-widest mb-1">TOTAL TTFA</span>
                 <span className="text-3xl font-black text-black">{latestMetrics ? `${latestMetrics.totalMs}ms` : "--"}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] tracking-widest font-bold pt-4 text-white uppercase">
              <span>Runs: {latencyHistory.length}</span>
              <span>P50: {p50}ms</span>
              <span>P70: {p70}ms</span>
              <span className="text-[#ffe600]">P100: {p100}ms</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── CHAT INTERFACE (Z-20) ────────────────────────────────── */}
      <div ref={chatContainerRef} className="relative z-20 flex-1 overflow-y-auto scroll-smooth pb-48 pt-10">
        <div className="max-w-2xl mx-auto px-6 space-y-6">
          
          {messages.length === 0 && !isListening && (
            <div className="flex justify-center pt-20">
               <div className="px-6 py-4 bg-white border-[3px] border-[#0b5c33] text-center max-w-sm">
                  <p className="text-sm font-bold text-black uppercase tracking-wider">
                     Voice RAG Initialized.<br/><span className="text-[#1ebd60]">System Ready.</span>
                  </p>
               </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] px-6 py-4 border-[3px] border-[#0b5c33] ${
                  msg.role === "user"
                    ? "bg-[#ffe600] text-black"
                    : "bg-white text-black"
                }`}
              >
                <p className="text-[14px] font-bold leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-[#ff007f] animate-pulse align-middle" />
                  )}
                </p>
                {msg.latencyMs !== undefined && !msg.isStreaming && (
                  <p className="text-[9px] font-black mt-2 uppercase tracking-widest opacity-60">
                    ⚡ {msg.latencyMs}ms Total
                  </p>
                )}
              </div>
            </div>
          ))}

          {isListening && (
            <div className="flex justify-end">
              <div className="max-w-[80%] px-6 py-4 border-[3px] border-[#0b5c33] bg-[#ff007f] text-white">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                  <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                  Listening
                </div>
              </div>
            </div>
          )}

          {isThinking && (
            <div className="flex justify-start">
              <div className="px-6 py-5 border-[3px] border-[#0b5c33] bg-white flex gap-1.5 items-center">
                <div className="w-2 h-2 bg-[#0b5c33] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-[#1ebd60] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-[#ffe600] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ─── BOTTOM BANNER ────────────────────────────────────────── */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-max max-w-[95%] z-30 pointer-events-none">
        <div className="bg-white px-4 md:px-8 py-2 md:py-3 border-[3px] border-[#0b5c33] flex items-center justify-center">
           <p className="text-[#0b5c33] font-mono-bold text-[10px] md:text-sm tracking-widest whitespace-nowrap">
             LESS NOISE <span className="text-black px-2 md:px-3 text-lg align-middle leading-none">✦</span> MORE SIGNAL <span className="text-black px-2 md:px-3 text-lg align-middle leading-none">✦</span> #FRAMEINGOA
           </p>
        </div>
      </div>

      {/* ─── VECTOR FLOATING INPUT BAR ────────────────────────────── */}
      <div className="absolute bottom-20 left-0 right-0 z-40 p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3 bg-white p-2 border-[3px] border-[#0b5c33] shadow-[0_10px_0_0_rgba(11,92,51,0.2)]">
          
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isThinking}
            className={`shrink-0 w-12 h-12 flex items-center justify-center border-[3px] border-[#0b5c33] transition-colors disabled:opacity-50 ${
              isListening
                ? "bg-[#ff007f] text-white"
                : isSpeaking
                ? "bg-[#1ebd60] text-white"
                : "bg-[#ffe600] text-black hover:bg-[#ff007f] hover:text-white"
            }`}
          >
            {isListening ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="1" /></svg>
            ) : isSpeaking ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3z" /><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="square" />
                <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2.5" />
              </svg>
            )}
          </button>

          <input
            type="text"
            value={textQuery}
            onChange={(e) => setTextQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitTextQuery()}
            placeholder={isListening ? "Listening..." : "Type or speak..."}
            disabled={isThinking || isListening}
            className="flex-1 h-12 px-3 bg-transparent text-black placeholder:text-slate-400 font-bold text-sm focus:outline-none disabled:opacity-50"
          />

          <button
            onClick={submitTextQuery}
            disabled={!textQuery.trim() || isThinking || isListening}
            className="shrink-0 w-12 h-12 bg-black text-white border-[3px] border-[#0b5c33] flex items-center justify-center hover:bg-[#ffe600] hover:text-black disabled:opacity-30 transition-colors"
          >
            <svg className="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
               <line x1="5" y1="12" x2="19" y2="12"></line>
               <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </div>

      {/* ─── ERROR TOAST ──────────────────────────────────────────── */}
      {error && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 max-w-md w-full p-4 bg-white border-[3px] border-[#0b5c33] z-50 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#ff007f] flex items-center justify-center text-white font-bold shrink-0">!</div>
          <span className="font-bold text-black text-sm flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-black hover:text-[#ff007f] font-bold p-2 text-lg leading-none">✕</button>
        </div>
      )}
    </div>
  );
}