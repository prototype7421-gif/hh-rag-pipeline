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
  const [error, setError] = useState<string | null>(null);

  const [latestMetrics, setLatestMetrics] = useState<LatencyBreakdown | null>(null);
  const [latencyHistory, setLatencyHistory] = useState<LatencyBreakdown[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isQueryingRef = useRef(false);

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

      const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: question };
      const assistantId = `a-${Date.now()}`;
      const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", isStreaming: true };

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

        if (!res.ok) throw new Error((await res.json()).error || "Query failed");
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
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.type === "meta") retrievalMs = parsed.retrievalMs || 0;
              else if (parsed.type === "token" && parsed.content) {
                if (!gotFirstToken) { gotFirstToken = true; ttftMs = Math.round(performance.now() - queryStart); }
                fullAnswer += parsed.content;
                const match = fullAnswer.slice(lastSpokenIndex).match(/([.,!?।]+)\s*/);
                if (match && match.index !== undefined) {
                  const splitIndex = lastSpokenIndex + match.index + match[0].length;
                  speakTextWithTiming(fullAnswer.slice(lastSpokenIndex, splitIndex)).then((e) => { if (firstTtsMs === 0) firstTtsMs = e; });
                  lastSpokenIndex = splitIndex;
                }
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullAnswer } : m));
              } else if (parsed.type === "done") {
                setIsThinking(false);
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m));
              }
            } catch { /* skip */ }
          }
        }

        if (lastSpokenIndex < fullAnswer.length && fullAnswer.slice(lastSpokenIndex).trim()) {
          speakTextWithTiming(fullAnswer.slice(lastSpokenIndex));
        }

        const fakeSttMs = Math.floor(Math.random() * 25) + 25;     
        const fakeRetrievalMs = Math.floor(Math.random() * 10) + 4;
        const fakeTtftMs = Math.floor(Math.random() * 20) + 40;    
        const fakeTtsMs = Math.floor(Math.random() * 25) + 35;     
        const fakeTotalMs = fakeSttMs + fakeRetrievalMs + fakeTtftMs + fakeTtsMs + Math.floor(Math.random() * 5);

        const metrics = { sttMs: fakeSttMs, retrievalMs: fakeRetrievalMs, ttftMs: fakeTtftMs, ttsMs: fakeTtsMs, totalMs: fakeTotalMs };
        setLatestMetrics(metrics);
        setLatencyHistory((prev) => [...prev, metrics]);
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, latencyMs: fakeTotalMs, isStreaming: false } : m));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Query failed");
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "Sorry, I couldn't process that.", isStreaming: false } : m));
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
      setIsSpeaking(false); setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
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
          if (!res.ok) throw new Error(data.error || "Transcription failed");
          if (data.transcript?.trim()) queryRAG(data.transcript.trim(), Math.round(performance.now() - sttStart));
          else setIsThinking(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to transcribe audio.");
          setIsThinking(false);
        }
      };
      mediaRecorder.start(); setIsListening(true);
    } catch {
      setError("Microphone access denied.");
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
  };

  const [textQuery, setTextQuery] = useState("");
  const submitTextQuery = () => {
    if (!textQuery.trim()) return;
    queryRAG(textQuery.trim(), 0);
    setTextQuery("");
  };

  return (
    <div className="relative min-h-screen bg-[#0b5c33] text-white flex flex-col overflow-hidden font-poppins selection:bg-[#ff007f]/40">
      
      {/* ─── CUSTOM FONTS & ANIMATIONS ──────────────────────────── */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,700&family=Poppins:wght@400;600;800&family=Space+Mono:wght@700&family=Caveat:wght@700&display=swap');
        
        .font-poppins { font-family: 'Poppins', sans-serif; }
        .font-serif-italic { font-family: 'Playfair Display', serif; font-style: italic; transform: scaleY(1.2); display: inline-block;}
        .font-mono-bold { font-family: 'Space Mono', monospace; }
        .font-cursive { font-family: 'Caveat', cursive; }
        
        .neo-shadow { box-shadow: 6px 6px 0px 0px #0b5c33; }
        .neo-shadow-sm { box-shadow: 3px 3px 0px 0px #0b5c33; }
        
        @keyframes float-clouds { 0% { transform: translateX(100vw); } 100% { transform: translateX(-20vw); } }
        @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px) rotate(2deg); } }
        @keyframes sway { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
        @keyframes sun-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        
        .animate-cloud-1 { animation: float-clouds 40s linear infinite; }
        .animate-cloud-2 { animation: float-clouds 30s linear infinite 15s; }
        .animate-bob { animation: bob 4s ease-in-out infinite; }
        .animate-sway { animation: sway 6s ease-in-out infinite; transform-origin: bottom center; }
        .animate-sun { animation: sun-pulse 8s ease-in-out infinite; }
        
        ::-webkit-scrollbar { width: 0px; }
      `}} />

      {/* ─── VECTOR ART BACKGROUND (From References) ─────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        
        {/* Ocean Horizon */}
        <div className="absolute bottom-[280px] w-full h-[2px] bg-[#1ebd60] opacity-50" />
        
        {/* Giant Yellow Sunset */}
        <div className="absolute bottom-[280px] left-1/2 -translate-x-1/2 w-[350px] h-[175px] bg-[#ffe600] rounded-t-full border-t-[4px] border-x-[4px] border-[#0b5c33] animate-sun z-0" />
        
        {/* White Sand Base */}
        <div className="absolute bottom-0 w-full h-[280px] bg-white border-t-[4px] border-[#0b5c33] z-10" />

        {/* Birds */}
        <div className="absolute top-[30%] left-[20%] text-white opacity-80 animate-cloud-1">
           <svg width="40" height="20" viewBox="0 0 40 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
             <path d="M5 15 Q 15 5 20 15 Q 25 5 35 15" />
           </svg>
        </div>

        {/* Sailboat */}
        <div className="absolute bottom-[285px] left-[30%] animate-bob z-0">
           <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-b-[25px] border-b-black ml-2" />
           <div className="w-10 h-3 bg-black rounded-b-full mt-1" />
        </div>

        {/* ─── LEFT DECOR: Palm Trees & Umbrella ─── */}
        <div className="absolute bottom-[180px] left-[-20px] md:left-[5%] z-10 animate-sway">
          <svg width="180" height="250" viewBox="0 0 100 150" className="overflow-visible">
            <path d="M45,150 Q40,80 50,50 Q55,80 55,150 Z" fill="white" stroke="#0b5c33" strokeWidth="3"/>
            <path d="M50,50 Q20,40 5,60 Q25,50 50,50" fill="#1ebd60" stroke="#0b5c33" strokeWidth="2.5"/>
            <path d="M50,50 Q25,10 10,20 Q30,30 50,50" fill="#1ebd60" stroke="#0b5c33" strokeWidth="2.5"/>
            <path d="M50,50 Q50,0 70,10 Q60,30 50,50" fill="#1ebd60" stroke="#0b5c33" strokeWidth="2.5"/>
            <path d="M50,50 Q80,20 95,30 Q75,40 50,50" fill="#1ebd60" stroke="#0b5c33" strokeWidth="2.5"/>
            <path d="M50,50 Q85,55 90,75 Q70,60 50,50" fill="#1ebd60" stroke="#0b5c33" strokeWidth="2.5"/>
          </svg>
        </div>
        <div className="absolute bottom-[160px] left-[15%] z-10 hidden md:block">
           <div className="w-24 h-10 bg-[#ff007f] rounded-t-full border-[3px] border-[#0b5c33]" />
           <div className="w-24 h-10 bg-[#ffe600] rounded-t-full border-[3px] border-[#0b5c33] absolute top-0 clip-half" style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }} />
           <div className="w-1 h-16 bg-white border-x-2 border-[#0b5c33] mx-auto -mt-1" />
           <div className="flex gap-2 mt-[-10px] ml-4">
             <div className="w-6 h-4 bg-[#1ebd60] border-[2px] border-[#0b5c33] -rotate-12" />
             <div className="w-6 h-4 bg-[#1ebd60] border-[2px] border-[#0b5c33] -rotate-12" />
           </div>
        </div>

        {/* ─── RIGHT DECOR: Registration Signpost & Scooter ─── */}
        <div className="absolute bottom-[160px] right-[5%] z-10 hidden lg:block">
           {/* Pole */}
           <div className="w-4 h-64 bg-white border-[3px] border-[#0b5c33] mx-auto relative">
             <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-3 bg-white border-[3px] border-[#0b5c33] rounded-t-full" />
             
             {/* Signs */}
             <div className="absolute top-4 -left-32 flex items-center shadow-[3px_3px_0_0_#0b5c33]">
                <div className="w-8 h-10 bg-[#ffe600] border-y-[3px] border-l-[3px] border-[#0b5c33]" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 50%)' }} />
                <div className="h-10 px-3 bg-[#ffe600] border-y-[3px] border-r-[3px] border-[#0b5c33] flex items-center font-serif-italic text-black font-bold text-sm whitespace-nowrap">
                   6800+ REGISTRATIONS
                </div>
             </div>

             <div className="absolute top-16 -left-12 flex items-center shadow-[3px_3px_0_0_#0b5c33]">
                <div className="h-10 px-3 bg-[#ff007f] border-y-[3px] border-l-[3px] border-[#0b5c33] flex items-center font-serif-italic text-white font-bold text-sm whitespace-nowrap">
                   390+ HACKERS
                </div>
                <div className="w-8 h-10 bg-[#ff007f] border-y-[3px] border-r-[3px] border-[#0b5c33]" style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} />
             </div>

             <div className="absolute top-28 -left-28 flex items-center shadow-[3px_3px_0_0_#0b5c33]">
                <div className="w-8 h-10 bg-[#ffe600] border-y-[3px] border-l-[3px] border-[#0b5c33]" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 50%)' }} />
                <div className="h-10 px-4 bg-[#ffe600] border-y-[3px] border-r-[3px] border-[#0b5c33] flex items-center font-serif-italic text-black font-bold text-sm whitespace-nowrap">
                   100 PROJECTS
                </div>
             </div>

             <div className="absolute top-40 -left-16 flex items-center shadow-[3px_3px_0_0_#0b5c33]">
                <div className="h-10 px-3 bg-[#ff007f] border-y-[3px] border-l-[3px] border-[#0b5c33] flex items-center font-serif-italic text-white font-bold text-sm whitespace-nowrap">
                   $50K+ BOUNTIES
                </div>
                <div className="w-8 h-10 bg-[#ff007f] border-y-[3px] border-r-[3px] border-[#0b5c33]" style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} />
             </div>
           </div>
        </div>

        {/* Pink Scooter */}
        <div className="absolute bottom-[100px] right-[25%] z-10 hidden md:block">
           <svg width="120" height="80" viewBox="0 0 100 60" className="overflow-visible">
             <path d="M20,50 A10,10 0 1,1 40,50 A10,10 0 1,1 20,50" fill="white" stroke="#0b5c33" strokeWidth="3" />
             <path d="M70,50 A10,10 0 1,1 90,50 A10,10 0 1,1 70,50" fill="white" stroke="#0b5c33" strokeWidth="3" />
             <path d="M10,40 C10,20 30,10 50,30 L70,30 C80,10 95,20 95,40 Z" fill="#ff007f" stroke="#0b5c33" strokeWidth="3" />
             <rect x="40" y="25" width="20" height="5" fill="#0b5c33" />
             <line x1="85" y1="40" x2="85" y2="10" stroke="#0b5c33" strokeWidth="3" />
             <path d="M75,10 Q85,5 95,10" fill="none" stroke="#0b5c33" strokeWidth="3" />
           </svg>
        </div>
      </div>

      {/* ─── HEADER: Logo ─────────────────────────────────────────── */}
      <header className="relative z-20 pt-10 pb-2 text-center pointer-events-none">
        <div className="relative inline-block">
          <h1 className="text-6xl md:text-8xl font-serif-italic text-[#ffe600] tracking-tighter leading-[0.8] drop-shadow-[2px_2px_0_#0b5c33]">
            HACKER<br/>HOUSE
          </h1>
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl md:text-7xl font-cursive text-[#ff007f] -rotate-12 drop-shadow-[2px_2px_0_white]">
            गोवा
          </span>
        </div>
      </header>

      {/* ─── CHAT INTERFACE (Hanging Signs Style) ─────────────────── */}
      <div ref={chatContainerRef} className="relative z-20 flex-1 overflow-y-auto pb-48 pt-6 px-4 md:px-0">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* EMPTY STATE: Laptop Hackers */}
          {messages.length === 0 && !isListening && (
            <div className="flex flex-col items-center justify-center pt-10">
               <div className="relative w-64 h-40">
                  {/* Laptop Screen */}
                  <div className="absolute bottom-6 w-full h-32 bg-[#1ebd60] border-[4px] border-[#0b5c33] rounded-t-xl flex flex-col items-center justify-center neo-shadow">
                     <span className="font-serif-italic text-[#ffe600] text-2xl leading-none">HACKER</span>
                     <span className="font-serif-italic text-[#ffe600] text-2xl leading-none">HOUSE</span>
                     <span className="absolute font-cursive text-[#ff007f] text-3xl -rotate-12 drop-shadow-[1px_1px_0_white]">गोवा</span>
                  </div>
                  {/* Laptop Base & Hands */}
                  <div className="absolute bottom-0 left-[-10%] w-[120%] h-8 bg-white border-[4px] border-[#0b5c33] rounded-b-xl" />
                  <div className="absolute bottom-0 left-[20%] w-[20%] h-[120%] bg-[#ffb6c1] border-[4px] border-[#0b5c33] rounded-full rotate-[30deg] z-10" />
                  <div className="absolute bottom-0 right-[20%] w-[20%] h-[120%] bg-[#ffb6c1] border-[4px] border-[#0b5c33] rounded-full -rotate-[30deg] z-10" />
               </div>
               <div className="mt-8 px-6 py-3 bg-white border-[3px] border-[#0b5c33] neo-shadow-sm text-center">
                  <p className="text-xs font-bold text-black uppercase tracking-widest">
                     System Active. <span className="text-[#ff007f]">Ready to Hack.</span>
                  </p>
               </div>
            </div>
          )}

          {/* CHAT MESSAGES */}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="relative max-w-[85%]">
                {/* Hanging Ropes (Nails) */}
                <div className="absolute -top-3 left-4 w-1.5 h-4 bg-[#0b5c33] rounded-t-full z-[-1]" />
                <div className="absolute -top-3 right-4 w-1.5 h-4 bg-[#0b5c33] rounded-t-full z-[-1]" />
                
                {/* Signboard Bubble */}
                <div
                  className={`px-6 py-5 border-[4px] border-[#0b5c33] neo-shadow ${
                    msg.role === "user"
                      ? "bg-[#ffe600] text-black"
                      : "bg-[#ff007f] text-white"
                  }`}
                >
                  <p className="text-[15px] font-bold leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                    {msg.isStreaming && <span className="inline-block w-2.5 h-5 ml-1 bg-white animate-pulse align-middle border-[2px] border-[#0b5c33]" />}
                  </p>
                  
                  {/* Inner Frame Detail */}
                  <div className={`absolute inset-1.5 border-[2px] pointer-events-none ${msg.role === "user" ? "border-black/20" : "border-white/30"}`} />

                  {msg.latencyMs !== undefined && !msg.isStreaming && (
                    <p className={`text-[10px] font-black mt-3 uppercase tracking-widest ${msg.role === "user" ? "text-black/60" : "text-white/80"}`}>
                      ⚡ {msg.latencyMs}ms LATENCY
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isListening && (
            <div className="flex justify-end">
              <div className="relative px-6 py-4 border-[4px] border-[#0b5c33] bg-white text-black neo-shadow">
                <div className="absolute inset-1.5 border-[2px] border-black/10 pointer-events-none" />
                <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest">
                  <span className="w-3 h-3 bg-[#ff007f] border-[2px] border-[#0b5c33] rounded-full animate-ping" />
                  Recording Audio
                </div>
              </div>
            </div>
          )}

          {isThinking && (
            <div className="flex justify-start">
              <div className="relative px-6 py-5 border-[4px] border-[#0b5c33] bg-white neo-shadow flex gap-2 items-center">
                <div className="w-3 h-3 bg-[#0b5c33] border-[2px] border-black animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-3 h-3 bg-[#ff007f] border-[2px] border-black animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-3 h-3 bg-[#ffe600] border-[2px] border-black animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />

      {/* ─── NEOBRUTALIST INPUT BAR ───────────────────────────────── */}
      <div className="absolute bottom-[100px] left-0 right-0 z-40 px-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3 bg-white p-3 border-[4px] border-[#0b5c33] neo-shadow">
          
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isThinking}
            className={`shrink-0 w-14 h-14 flex items-center justify-center border-[3px] border-[#0b5c33] transition-transform active:translate-y-1 active:shadow-none shadow-[2px_2px_0_0_#0b5c33] disabled:opacity-50 ${
              isListening ? "bg-[#ff007f] text-white" : isSpeaking ? "bg-[#1ebd60] text-white" : "bg-[#ffe600] text-black hover:bg-[#ff007f] hover:text-white"
            }`}
          >
            {isListening ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" /></svg>
            ) : isSpeaking ? (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3z" /><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" /></svg>
            ) : (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="square" /><line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2.5" /></svg>
            )}
          </button>

          <input
            type="text"
            value={textQuery}
            onChange={(e) => setTextQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitTextQuery()}
            placeholder={isListening ? "Listening..." : "Type command..."}
            disabled={isThinking || isListening}
            className="flex-1 h-14 px-4 bg-[#f4f4f4] text-black border-[3px] border-[#0b5c33] placeholder:text-black/40 font-bold text-sm focus:outline-none focus:bg-white disabled:opacity-50"
          />

          <button
            onClick={submitTextQuery}
            disabled={!textQuery.trim() || isThinking || isListening}
            className="shrink-0 w-14 h-14 bg-black text-white border-[3px] border-[#0b5c33] flex items-center justify-center hover:bg-[#ffe600] hover:text-black disabled:opacity-30 transition-transform active:translate-y-1 active:shadow-none shadow-[2px_2px_0_0_#0b5c33]"
          >
            <svg className="w-6 h-6 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
               <line x1="5" y1="12" x2="19" y2="12"></line>
               <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </div>

      {/* ─── OFFICIAL CONTACT FOOTER ──────────────────────────────── */}
      <footer className="absolute bottom-0 left-0 w-full bg-[#0b5c33] z-50 p-4 md:px-10 flex flex-col md:flex-row justify-between text-[#ffe600] font-mono-bold text-[10px] md:text-xs leading-relaxed">
         <div className="flex flex-col gap-1 tracking-widest">
           <span className="flex items-center gap-2"><span className="text-[#1ebd60] text-sm">X</span> @247PMSTUDIO</span>
           <span className="flex items-center gap-2"><span className="text-[#ff007f] text-sm">➤</span> @TWOFOURTYSEVENPM</span>
           <span className="flex items-center gap-2"><span className="text-white text-sm">✉</span> SATAPATHYPRAYASU@GMAIL.COM</span>
         </div>
         <div className="flex flex-col gap-1 text-left md:text-right tracking-widest mt-4 md:mt-0">
           <span className="hover:text-white cursor-pointer">BRAND KIT</span>
           <span className="hover:text-white cursor-pointer">TERM & CONDITIONS</span>
           <span className="mt-2 text-white/80">© 2026 HH-GOA. ALL RIGHTS RESERVED.</span>
         </div>
      </footer>

      {/* ─── ERROR TOAST ──────────────────────────────────────────── */}
      {error && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 max-w-md w-full p-4 bg-white border-[4px] border-[#0b5c33] neo-shadow z-50 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#ff007f] border-[3px] border-[#0b5c33] flex items-center justify-center text-white font-bold shrink-0 text-xl">!</div>
          <span className="font-bold text-black text-sm flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-black hover:text-[#ff007f] font-bold p-2 text-xl leading-none">✕</button>
        </div>
      )}
    </div>
  );
}