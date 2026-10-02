# PRAYAS 3.0 — Accessible Job Application Assistant

**Team ByteShastra** | **Problem Statement PS003: Accessible Job Application Assistant**  
*Empowering job seekers with disabilities to navigate existing job portals with confidence, autonomy, and zero barriers.*

---

## 🌟 Executive Summary

Traditional job application platforms (Workday, Taleo, Greenhouse, custom ATS portals) are notorious for accessibility barriers: unlabelled inputs, broken tab sequences, low-contrast text, keyboard traps, and complex essay prompts.

**PRAYAS 3.0** is an accessibility overlay and assistive layer designed for a 36-hour hackathon. It combines:
1. **Reusable Accessibility Passport** (Member 1): Store applicant preferences (screen reader, high contrast, voice control, simplified language) with optional disability disclosure.
2. **FastAPI & RAG Knowledge Engine** (Member 2): Private document processing, pgvector semantic search, and Google Gemini AI to draft evidence-grounded answers.
3. **Manifest V3 Chrome Extension** (Member 3): Non-destructive DOM inspection, one-click safe ARIA repairs, and consent-gated profile autofill.
4. **Voice Navigation & Testbed** (Member 4): Push-to-talk Web Speech API (STT/TTS), accessible keyboard shortcuts, a controlled demo portal with deliberate barriers, and automated E2E tests.

---

## 🏛️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        USER BROWSER / CLIENT                          │
├───────────────────────────────┬────────────────────────────────────────┤
│   Next.js 16 Web Application  │        Chrome Extension (MV3)          │
│   (Member 1 — Port 3000)      │        (Member 3 — Injected)           │
│   • Accessibility Passport    │        • 4-Tier Field Extraction       │
│   • Document Hub & Storage    │        • Live Accessibility Auditor    │
│   • AI Q&A Assistant Console  │        • Non-Destructive ARIA Repairs  │
│   • Accessibility Scorecard   │        • In-Page Floating Action Dock  │
│   • Demo Hub & Testbed Portal │        • Consent-Gated Autofill        │
└───────────────┬───────────────┴───────────────────┬────────────────────┘
                │                                   │
                │                ┌──────────────────┘
                │                ▼
┌───────────────▼────────────────────────────────────────────────────────┐
│              Voice Agent & Controlled Testbed (Member 4)              │
│   • Web Speech API (SpeechRecognition + SpeechSynthesis)              │
│   • Whitelisted Regex Command Router (Zero Arbitrary Execution)        │
│   • 7-Step Guided RAG Conversational Dialog Flow                      │
│   • Controlled Job Application Portal (3 Deliberate Barriers)         │
│   • Presenter Console with 3-Minute Live Pitch Timer                  │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│               FastAPI & Gemini RAG Backend (Member 2)                  │
│                     (Port 8000 — REST + OpenAPI)                       │
│   • Authentication & Authorization (Bearer JWT + Demo Bypass)          │
│   • Document Parsing (PDF / DOCX via PyMuPDF & python-docx)            │
│   • Text Chunking & Embeddings (Gemini embedding-001)                  │
│   • pgvector Cosine Similarity RPC Search                              │
│   • Grounded RAG Question Answering (Gemini 2.5 Flash)                 │
│   • Plain-Language Job Description Simplification                     │
│   • Real-Time Accessibility Scorecard Ingestion & Reporting            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 👥 Four Integrated Workstreams

| Workstream | Lead | Tech Stack | Responsibilities | Status |
|:---|:---|:---|:---|:---:|
| **Member 1** | Web App & UI | Next.js 16, React 19, Tailwind CSS | Passport page, Document Hub, AI Assistant, Scorecard, Demo Hub | **100% Verified** (12/12 routes) |
| **Member 2** | Backend & AI/RAG | Python FastAPI, Supabase, Gemini | REST API, PDF/DOCX indexing, pgvector RAG, text simplification, CORS | **100% Verified** (225/225 tests) |
| **Member 3** | Chrome Extension | Manifest V3, DOM API, MutationObserver | Field scanner, safe ARIA repairs, undo engine, autofill matching, popup | **100% Verified** (7/7 suites) |
| **Member 4** | Voice & Testbed | Web Speech API, HTML5/CSS3 | STT/TTS engine, 7-step dialog, controlled barrier portal, E2E tests | **100% Verified** (25/25 tests) |

---

## ⚡ Quick Start (One-Click Launch)

### Option A: Windows Batch Launcher (Fastest)
Double-click `run_all.bat` or run in terminal:
```cmd
run_all.bat
```
*This automatically starts the FastAPI backend on port 8000, the Next.js frontend on port 3000, and opens your browser.*

### Option B: PowerShell Launcher
```powershell
.\run_all.ps1
```

### Option C: Universal npm Script
```bash
npm run dev
```

---

## 🔌 Loading the Chrome Extension

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button.
4. Select the `member-3-prayas-extension` directory inside this project:
   `c:\Users\Muthusam\Downloads\PRAYAS-main\member-3-prayas-extension`
5. The **PRAYAS 3.0** icon will appear in your Chrome toolbar. Pin it for easy access!

---

## 🎯 3-Minute Hackathon Demo Script (For Judges)

### Minute 1: The Problem & The Passport (0:00 – 1:00)
1. Open the **PRAYAS Web App** at [http://localhost:3000](http://localhost:3000).
2. Navigate to **Accessibility Passport** (`/passport`).
   - Show how candidates customize their assistive preferences (Screen reader, voice control, large font, high contrast, simplified language).
   - Point out that **disability disclosure is 100% optional**.
3. Navigate to **Document Hub** (`/documents`).
   - Candidate has uploaded `Rahul_Sharma_Frontend_Resume.pdf`.
   - The backend indexes the text chunks into vector embeddings for grounded AI retrieval.

### Minute 2: Form Detection & Safe ARIA Repairs (1:00 – 2:00)
1. Navigate to the **Demo Portal** at [http://localhost:3000/demo/job-application.html](http://localhost:3000/demo/job-application.html).
2. Point out the deliberate accessibility barriers:
   - *Barrier 1:* Phone number input has an unassociated label (screen readers skip it).
   - *Barrier 2:* Irregular tabindex breaks sequential keyboard navigation.
   - *Barrier 3:* Open-ended behavioral prompt causes cognitive fatigue.
3. Click **🛡️ Safe ARIA Fixes** on the floating PRAYAS dock (or via extension popup):
   - Notice how PRAYAS injects proper `aria-label` attributes and restores sequential keyboard order.
   - Click **⚡ Autofill** to preview and populate candidate details with **explicit user confirmation**.
   - Note: PRAYAS **never** automatically submits forms.

### Minute 3: Hands-Free Voice Navigation & Grounded AI Drafting (2:00 – 3:00)
1. Focus on the behavioral question and press **`Alt + H`** (or click the microphone icon):
   - The voice agent reads the prompt aloud: *"Describe a complex challenge you solved using accessible design principles."*
   - Asks for user consent to draft an answer based on uploaded documents.
   - Fetches an answer grounded strictly in candidate resume/portfolio from the FastAPI RAG engine.
   - Reads the draft aloud and prompts: *"Would you like to Accept, Edit, or Reject?"*
2. Press **`Alt + A`** (Accept):
   - The draft is cleanly inserted into the textarea without submitting the form.
3. Open the **Scorecard** page on the web app (`/scorecard`):
   - Demonstrates real-time synchronization of detected vs repaired barriers.

---

## 🧪 Master Test Suite (All 4 Modules Verified)

Run all tests across the repository with one command:
```bash
npm test
```

### Verified Test Results:
```text
================================================================
                      SUMMARY REPORT                            
================================================================
1. [✔ PASS] Member 2: FastAPI Backend & RAG Engine
   Scope: 225 hermetic tests (auth, docs, chunks, pgvector, rag, simplifier)
   Result: Ran 225 tests in 1.74s | OK (skipped=8 live tests)

2. [✔ PASS] Member 3: Chrome Extension & DOM Auditor
   Scope: 7 test suites (extraction, audit, repairs, autofill, backend, scorecard, voice)
   Result: 7 / 7 Test Suites Passed

3. [✔ PASS] Member 4: Voice Agent & E2E Testing Suite
   Scope: 25 automated tests (STT/TTS, router, bridge, RAG flow, anti-hallucination)
   Result: 25 / 25 Passed (100%)

4. [✔ PASS] Member 1: Next.js 16 Web Application
   Scope: 12 static & dynamic routes (passport, documents, dashboard, scorecard, demo, auth)
   Result: Compiled 12/12 static pages successfully

🎉 ALL SYSTEMS INTEGRATED AND VERIFIED — READY FOR 36-HOUR HACKATHON DEMO!
```

---

## 📡 Unified API Contract Reference

| Method | Endpoint | Description | Consumed By | Status |
|:---|:---|:---|:---|:---:|
| `GET` | `/health` & `/api/health` | Service health check | Web App, Extension | `200 OK` |
| `GET` | `/api/profile` & `/api/v1/profile` | Retrieve candidate Accessibility Passport | Extension popup, Web App | `200 OK` |
| `POST` | `/api/profile` & `/api/v1/profile` | Update candidate Accessibility Passport | Web App, Extension | `200 OK` |
| `POST` | `/api/audit-report` & `/api/v1/audit-report` | Submit live accessibility audit scorecard | Chrome Extension | `200 OK` |
| `GET` | `/api/audit-report` & `/api/v1/audit-report` | Retrieve recorded audit scorecards | Web App Scorecard | `200 OK` |
| `POST` | `/api/rag-answer` | AI draft answer generation | Chrome Extension | `200 OK` |
| `POST` | `/api/v1/generate-answer` | 7-step conversational RAG agent | Voice Agent | `200 OK` |
| `POST` | `/api/rag/query` & `/api/v1/ask` | Document-grounded Q&A | Web App Assistant | `200 OK` |
| `POST` | `/api/v1/documents/upload` | PDF/DOCX document upload & vector indexing | Document Hub | `200 OK` |
| `POST` | `/api/v1/simplify` | Plain-language text simplification | Web App, Extension | `200 OK` |

---

## ⌨️ Global Assistive Keyboard Shortcuts

| Shortcut | Action | Description |
|:---|:---|:---|
| `Alt + N` / `Alt + →` | **Next Field** | Focuses next interactive input and speaks label |
| `Alt + B` / `Alt + ←` | **Previous Field** | Focuses previous interactive input |
| `Alt + R` / `Alt + Space` | **Read Field** | Speaks label, required status, and current value |
| `Alt + M` | **Microphone** | Activates single-shot push-to-talk listening |
| `Alt + F` / `Alt + A` | **Autofill** | Prompts consent and fills confirmed Passport values |
| `Alt + H` | **AI Essay Help** | Initiates 7-step grounded RAG assistance dialog |
| `Alt + Y` | **Consent Yes** | Authorizes draft answer retrieval |
| `Alt + A` | **Accept Draft** | Inserts confirmed draft into textarea |
| `Alt + X` | **Reject Draft** | Discards draft; leaves field untouched |
| `Esc` | **Emergency Silence** | Cancels speech recognition and audio output immediately |

---

## 🔒 Security & Privacy Guarantees

1. **No Automatic Submissions:** PRAYAS strictly prohibits automated form submission (`button[type="submit"]` is never triggered programmatically).
2. **Explicit User Confirmation:** Autofill values and AI-generated drafts are inserted only after explicit user review and confirmation.
3. **Optional Disability Disclosure:** Medical/disability details are strictly optional and stored locally or encrypted.
4. **Anti-Hallucination Guardrail:** The RAG pipeline checks for verified document evidence. If evidence is missing, it triggers a clarification loop rather than fabricating qualifications.
5. **No Universal WCAG Claims:** PRAYAS performs targeted, high-confidence ARIA remediations without claiming universal compliance.

---

## 👥 Team ByteShastra (PS003)

- **Member 1:** Web Application & UI/UX (Next.js 16, Tailwind CSS, React 19)
- **Member 2:** Backend & AI/RAG Engine (FastAPI, pgvector, Supabase, Gemini 2.5)
- **Member 3:** Chrome Extension & DOM Remediation (Manifest V3, ARIA, MutationObserver)
- **Member 4:** Voice Navigation & Testing Engine (Web Speech API, E2E Testbed)
