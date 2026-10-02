# Member 4 — Voice Input, Conversational Agent & Testing Engine

**Project:** PRAYAS 3.0  
**Technologies:** JavaScript (ES6+), Web Speech API (`SpeechRecognition`, `SpeechSynthesis`), Manifest V3 Messaging, HTML5, CSS3  
**Status:** 100% Implemented & Verified (25/25 Tests Passing)

---

## 📁 Directory Layout

```text
member-4-voice-input-and-testing/
├── package.json                                 # Local development scripts
├── src/
│   ├── voice/
│   │   ├── speech-recognizer.js                 # Push-to-talk Web Speech API wrapper & state machine
│   │   └── speech-synthesizer.js                # SpeechSynthesis wrapper with keep-alive ticker
│   ├── commands/
│   │   ├── command-definitions.js               # Whitelisted regex command patterns & sanitizer
│   │   └── command-router.js                    # Spoken & visual feedback dispatcher
│   ├── bridge/
│   │   └── extension-bridge.js                  # Manifest V3 chrome.runtime messaging client
│   ├── agent/
│   │   └── conversational-agent.js              # 7-Step guided RAG dialog flow & clarification loop
│   └── ui/
│       ├── voice-widget.css                     # High-contrast WCAG 2.1 AA styling & 3px focus rings
│       └── voice-widget.js                      # Accessible floating assistant HUD & keyboard shortcuts
├── demo/
│   ├── job-application.html                     # Controlled demo portal with deliberate barriers
│   ├── demo-bundle.js                           # Self-contained bundle running on localhost & file:///
│   ├── demo-form.css                            # Demo portal styles & barrier callouts
│   ├── demo-form.js                             # Form reset, barrier toggle & submission guard
│   ├── presentation-mode.html                   # Presenter console with live 3-min pitch timer
│   └── presentation-script.md                   # Verbatim 3-minute hackathon pitch script & fallback plan
└── tests/
    ├── e2e-dashboard.html                       # Interactive visual test dashboard (12/12 passing)
    ├── run-e2e-tests.js                         # Automated CLI test suite (25/25 passing)
    ├── e2e-test-matrix.md                       # Comprehensive E2E checklist & fault injection matrix
    ├── test-voice.html                          # Stage 1: STT & TTS microphone diagnostic workbench
    ├── test-commands.html                       # Stage 2: Voice command router & feedback HUD workbench
    ├── test-extension-integration.html          # Stage 3: Extension messaging & fault injection bench
    ├── test-conversational-agent.html           # Stage 4: 7-step RAG flow & clarification loop workbench
    ├── test-accessible-fallbacks.html           # Stage 5: WCAG 2.1 AA keyboard parity & manual text input test
    ├── mock-backend.js                          # Standalone Node.js server simulating Member 3 FastAPI RAG
    └── mock-extension-content-script.js         # Reference content script implementation for Member 2 contract
```

---

## ⚡ Quick Start & Verification

### 1. Run the Local Test Server
```bash
python -m http.server 3000
```

### 2. Live Demo Portal
Open in Chrome:  
`http://localhost:3000/demo/job-application.html`

### 3. Run Automated Tests
```bash
node tests/run-e2e-tests.js
```
*(Result: 25 / 25 Passed - 100%)*

### 4. Interactive E2E Dashboard
Open in Chrome:  
`http://localhost:3000/tests/e2e-dashboard.html`

### 5. 3-Minute Hackathon Pitch Console
Open in Chrome:  
`http://localhost:3000/demo/presentation-mode.html`

---

## ⌨️ Global Keyboard Shortcuts

| Shortcut | Action | Spoken / Visual Feedback |
|:---|:---|:---|
| `Alt + M` | Toggle Microphone | Starts single-shot push-to-talk listening |
| `Alt + N` | Next Field | Shifts focus to next sequential input |
| `Alt + B` | Previous Field | Shifts focus back to previous input |
| `Alt + R` | Read Question | Reads active field label, required status, and constraints |
| `Alt + W` | Read Page Summary | Speaks page title and field counts |
| `Alt + F` | Autofill Passport | Fills Name, Email, Phone, and Experience from Passport |
| `Alt + H` | AI Essay Help | Initiates the 7-step RAG conversational assistance dialog |
| `Alt + Y` | Consent Yes | Authorizes AI draft generation |
| `Alt + A` | Accept Draft | Inserts confirmed draft into field without submitting |
| `Alt + X` | Reject Draft | Discards draft; leaves field untouched |
| `Esc` | Emergency Silence | Cancels speech synthesis and recognition immediately |
