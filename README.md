# PRAYAS 3.0 — AI-Powered Accessible Job Application Assistant

> **Empowering candidates with disabilities to navigate and complete job applications on external career websites with dignity, autonomy, and speed.**

Built for the 36-Hour Hackathon.

---

## 👥 Team Responsibilities & Architecture

| Module / Member | Responsibilities | Directory / Branch |
|:---|:---|:---|
| **Member 1** | Accessibility Passport, User Profile & Resume Upload Portal | `member-1-passport-portal/` |
| **Member 2** | Chrome Extension (Manifest V3), Content Script DOM Inspection & Autofill | `member-2-chrome-extension/` |
| **Member 3** | FastAPI Backend, Vector RAG Pipeline & Gemini Answer Synthesis | `member-3-backend-rag/` |
| **Member 4** | Voice Agent, Text-to-Speech, Keyboard Alternatives, Controlled Demo Form & Testing | [`member-4-voice-input-and-testing/`](./member-4-voice-input-and-testing/) |

---

## 🎙️ Member 4: Voice Input & Testing Engine Overview

Member 4 provides:
- **Speech Recognition (STT):** Push-to-talk Web Speech API with non-continuous listening and confidence scoring.
- **Text-to-Speech (TTS):** Interruptible SpeechSynthesis with Chromium 15s freeze workaround.
- **Voice Commands:** 6 whitelisted navigation actions (*"Read this page"*, *"Read question"*, *"Next field"*, *"Previous field"*, *"Stop reading"*, *"Fill my details"*).
- **Conversational RAG Flow:** 7-step guided question assistant with anti-hallucination clarification loops.
- **Zero Auto-Submission Guarantee:** Forms are never submitted automatically; candidate maintains final authority.
- **Accessible Fallbacks:** 100% keyboard alternative parity (`Alt+M, N, B, R, W, F, H, A, X, Esc`) and manual command text input.
- **Controlled Demo Portal:** `demo/job-application.html` demonstrating fixes for unlinked labels, tab traps, and cognitive fatigue.
- **Testing Suite:** 25/25 automated unit/integration tests passing (100%) and interactive dashboard `tests/e2e-dashboard.html`.

For setup, running instructions, and architecture specifications, see [`member-4-voice-input-and-testing/README.md`](./member-4-voice-input-and-testing/README.md).
