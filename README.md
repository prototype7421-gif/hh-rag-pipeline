👥 Team
Ayush Kumar — Lead Architect & AI Engineer
Prateek Verma — System Architecture & Pipeline Optimization
# 🎙️ Sub-200ms Voice RAG Pipeline

An ultra-low latency, voice-activated Retrieval-Augmented Generation (RAG) assistant designed and built for **Hacker House Goa 2026**. This application bridges the gap between natural human speech (supporting English, Hindi, and Hinglish) and lightning-fast AI inference.

![Hacker House Goa 2026](https://img.shields.io/badge/Hacker%20House-Goa%202026-ff007f?style=for-the-badge&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black?style=for-the-badge&logo=next.js)
![Groq](https://img.shields.io/badge/Groq-Whisper%20&%20LPU-orange?style=for-the-badge)
![Sarvam AI](https://img.shields.io/badge/Sarvam%20AI-Bulbul%20TTS-emerald?style=for-the-badge)

---

## 🌟 Key Architecture & Features

* **Speech-to-Text (STT):** Powered by **Groq Whisper (`whisper-large-v3-turbo`)** for near-instant transcription with native support for Devanagari script and Hinglish code-switching.
* **Hybrid Vector/Full-Text Retrieval:** Utilizes **Neon PostgreSQL** with built-in `to_tsvector` full-text search and semantic fallback ranking to fetch context in under 15ms.
* **Low-Latency Generation:** Orchestrated via **Groq LPU** streaming endpoints to achieve instantaneous Time-to-First-Token (TTFT).
* **Streaming Audio Queue (TTS):** Integrated with **Sarvam AI (`bulbul:v3`)** using an advanced frontend chunking queue to stream audio playback seamlessly without audio-overlap stutter.
* **Real-Time Telemetry Dashboard:** Built-in analytics panel tracking per-stage turnaround times (STT, Retrieval, TTFT, TTS) and session percentiles ($P_{50}$, $P_{70}$, $P_{100}$).
* **Vector Beach Aesthetic:** Custom-themed UI inspired by the Hacker House Goa visual identity, featuring dynamic SVG animations, swaying palm trees, and a rotating sun backdrop.

---

## 🛠️ Tech Stack

* **Framework:** Next.js (App Router, Edge Runtime)
* **Styling:** Tailwind CSS, custom CSS keyframe animations
* **Database & ORM:** Neon Serverless PostgreSQL + Drizzle ORM
* **AI & Voice Models:** Groq Whisper, Groq Chat Completion, Sarvam AI Text-to-Speech

---

## 🚀 Getting Started Locally

### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/hh-rag-pipeline.git](https://github.com/your-username/hh-rag-pipeline.git)
cd hh-rag-pipeline
