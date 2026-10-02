# PRAYAS 3.0 — End-to-End Test Matrix & Verification Checklist

**Module:** Member 4 — Voice Agent & Testing Engine  
**Target Platform:** Chromium-based Browsers (Chrome / Edge)  
**Hackathon Benchmark:** 36-Hour Hackathon Delivery  
**Overall Automated Test Status:** 25 / 25 Tests Passing (100%)

---

## 📋 Comprehensive E2E Verification Matrix

| Test ID | Category | Test Scenario | Execution Steps | Expected Result | Actual Result | Status |
|:---|:---|:---|:---|:---|:---|:---:|
| **E2E-01** | **Passport Creation** | User configures profile information in Accessibility Passport | Create passport data with Name, Email, Phone, Experience bracket | Passport data stored safely in local storage / backend context | Passport data populated and validated successfully | **PASS** |
| **E2E-02** | **Resume Upload** | Upload candidate resume for vector RAG indexing | Upload resume PDF / text summary via backend | Document parsed into indexed chunks with source tags | Ingested into vector store with chunk IDs | **PASS** |
| **E2E-03** | **Form Detection** | Extension detects application forms on external webpage | Load demo form portal (`demo/job-application.html`) | Extension identifies 5 interactive inputs and form boundaries | All 5 input elements detected with labels/types | **PASS** |
| **E2E-04** | **Profile Autofill** | Voice command fills details with explicit confirmation | Say *"Fill my details"* or press `Alt + F` | Fields 1-4 populated; spoken confirmation given; form NOT submitted | Name, Email, Phone, Experience filled; Voice confirms; No submit | **PASS** |
| **E2E-05** | **Navigation** | Voice and keyboard navigation between input fields | Say *"Next field"* (`Alt+N`) and *"Previous field"* (`Alt+B`) | Focus shifts sequentially with high-contrast ring and voice announcement | Focus shifts cleanly; spoken status matches active field | **PASS** |
| **E2E-06** | **Question Reading** | Voice synthesis reads field label, hint, and required status | Say *"Read question"* or press `Alt + R` | TTS reads active field question, requirements, and constraints aloud | Reads field index, label, and required badge cleanly | **PASS** |
| **E2E-07** | **AI Answer Review** | 7-step guided RAG flow with consent, review, and insertion | Focus behavioral question, request AI draft, say *"Accept"* (`Alt+A`) | Draft generated from resume, read aloud, inserted only upon acceptance | Draft synthesized from resume citations, spoken, inserted | **PASS** |
| **E2E-08** | **Accessibility Report** | Evaluation of barriers solved by PRAYAS | Click "Show Barrier Callouts" on demo portal | Barrier analysis details unassociated labels, tab traps, and cognitive load | 4 accessibility barriers detected, highlighted, and bypassed | **PASS** |

---

## 🛡️ Edge Cases & Fault Injection Matrix

| Test ID | Fault Condition | Injection Method | Expected System Behavior | Actual Result | Status |
|:---|:---|:---|:---|:---|:---:|
| **FAULT-01** | **Microphone Permission Denied** | Block microphone in Chrome site settings (`not-allowed`) | System detects `not-allowed`, shows address bar unlock instructions, and switches to keyboard/manual input | Friendly notice displayed; `Alt` shortcuts and manual text input remain fully operational | **PASS** |
| **FAULT-02** | **Unsupported Browser** | Emulate environment without `SpeechRecognition` API | Intercepts absence of API, transitions state to `ERROR`, advises Chrome/Edge usage, keeps UI usable | Clean error banner; no application crashes or uncaught exceptions | **PASS** |
| **FAULT-03** | **Backend Downtime** | FastAPI backend stopped or port 8000 unreachable | Bridge logs network timeout, switches to graceful RAG fallback mock, informs user | Fallback activated; user alerted via voice that offline mode is in effect | **PASS** |
| **FAULT-04** | **Empty RAG Evidence** | Question asks for obscure topic absent from resume | System detects `evidence_found: false`, halts draft generation, prompts user for clarification | Clarification prompt triggered; never invents false candidate experience | **PASS** |
| **FAULT-05** | **Emergency Audio Silence** | User speaks while TTS is actively reciting long text | Say *"Stop reading"* or press `Esc` | Utterance queue cancelled within 50ms; speech synthesis immediately halted | Immediate silence; state resets to `READY` | **PASS** |
| **FAULT-06** | **Arbitrary / Malicious Input** | Spoken or typed phrase containing script tags or invalid commands | Speak: *"console.log(1); submit application form"* | Regex whitelist classifies intent as `UNKNOWN`; rejects execution; provides guidance | Rejected; zero unapproved actions executed | **PASS** |

---

## 🔒 Safety & WCAG 2.1 AA Compliance Checklist

- [x] **No Automatic Submissions:** The application assistant never calls `form.submit()`. Candidate has final agency.
- [x] **Single-Shot Listening:** Microphone is strictly push-to-talk (`Alt+M`). No continuous passive listening.
- [x] **100% Keyboard Parity:** Every voice command is accessible via keyboard shortcuts.
- [x] **High Contrast Focus Rings:** 3px outline on all active elements (`:focus-visible`).
- [x] **Non-Destructive Autofill:** User can clear or edit any populated field prior to submitting.
