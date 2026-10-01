# PRAYAS 3.0 — Final 3-Minute Hackathon Demo Script & Presentation Guide

**Role:** Member 4 — Voice Interaction, Conversational Agent & Testing  
**Presentation Time Limit:** 3 Minutes (180 Seconds)  
**Target Audience:** Hackathon Judges & Technical Evaluators

---

## ⏱️ Chronological Presentation Roadmap

```text
[0:00 - 0:35]  HOOK & PROBLEM STATEMENT      (The digital barrier in job applications)
[0:35 - 1:15]  LIVE DEMO PART 1              (Voice navigation & Accessibility Passport autofill)
[1:15 - 2:05]  LIVE DEMO PART 2              (AI Conversational Agent & RAG grounding)
[2:05 - 2:35]  ARCHITECTURE & SAFEGUARDS     (Manifest V3 decoupling & Zero-Submit Safety)
[2:35 - 3:00]  IMPACT, LIMITATIONS & CLOSE   (Real-world impact & responsible AI)
```

---

## 🎤 Verbatim Presentation Script

### 1. Hook & Problem Statement (0:00 - 0:35)
> *"Judges, over 1.3 billion people worldwide live with disabilities, yet 97% of career portals fail basic WCAG accessibility tests. Candidates with motor, visual, or cognitive disabilities face unlabeled inputs, broken tab navigation, and exhausting open-ended questions that force them to drop out.*
>
> *Introducing **PRAYAS 3.0**: an AI-powered, voice-first accessibility equalizer. Instead of requiring companies to rebuild their websites, PRAYAS runs on top of existing job portals, giving candidates full voice control, verified profile autofill, and assistive AI answer drafting grounded strictly in their actual resume."*

---

### 2. Live Demo Part 1: Voice Navigation & Passport Autofill (0:35 - 1:15)
> *(Action: Display `demo/job-application.html` on screen)*
>
> *"Here is a real-world style job application with common deliberate accessibility barriers: Field 3 lacks an accessible label, Field 4 has a broken keyboard tab trap, and Field 5 is an intimidating essay question.*
>
> *(Action: Tap Mic or press `Alt + M`, speak: **"Next field"**)*
> *PRAYAS moves focus smoothly, bypassing the broken tab index, and announces: 'Moved to field 2: Email Address'.*
>
> *(Action: Speak: **"Read question"**)*
> *Even though Field 3 has an unassociated label that screen-readers miss, PRAYAS inspects the metadata and reads it aloud.*
>
> *(Action: Speak: **"Fill my details"** or press `Alt + F`)*
> *Instantly, PRAYAS populates the candidate's verified Accessibility Passport details into Name, Email, Phone, and Experience—saving repetitive typing while keeping the candidate in complete control."*

---

### 3. Live Demo Part 2: AI Conversational Agent & RAG Grounding (1:15 - 2:05)
> *(Action: Focus Field 5, say **"Help with this question"** or press `Alt + H`)*
>
> *"Now for the most challenging part: the behavioral essay question. PRAYAS initiates a respectful 7-step conversational dialog:*
> 1. *It reads the question aloud.*
> 2. *It asks: 'Would you like me to draft an answer using your resume? Say Yes or No.'*
> 3. *Upon consent, it queries our FastAPI RAG backend, retrieving vector chunks from the candidate's verified resume.*
> 4. *It speaks the draft aloud and displays citation sources and confidence scores.*
>
> *(Action: Say **"Accept"** or press `Alt + A`)*
> *Crucially: PRAYAS **never invents candidate experiences**. If information is missing from the resume, it pauses and asks for candidate clarification. Once accepted, the draft is non-destructively inserted into the field."*

---

### 4. Architecture & Essential Safeguards (2:05 - 2:35)
> *(Action: Show the Floating Voice HUD & Keyboard Indicators)*
>
> *"Our architecture is engineered for reliability in a 36-hour sprint:*
> * 🔌 **Decoupled Manifest V3 Messaging:** Member 4's voice layer communicates cleanly with Member 2's Chrome Extension via structured messages, without duplicating DOM logic.
> * 🔒 **Zero Auto-Submit Guarantee:** PRAYAS will **never** automatically submit a form. The candidate reviews every word and clicks submit themselves.
> * ♿ **100% Keyboard Parity:** Every voice command has an immediate keyboard alternative (`Alt+N`, `Alt+F`, `Alt+H`) plus manual text input for non-verbal users."*

---

### 5. Impact, Technical Limitations & Wrap-Up (2:35 - 3:00)
> *"**Technical Limitations & Future Work:** Today's prototype uses the Web Speech API, which requires Chromium and an active network connection. For production, we plan on integrating local Whisper models for offline environments and expanding multi-lingual support for regional languages.*
>
> *PRAYAS 3.0 restores dignity, speed, and autonomy to candidates with disabilities. Thank you, and we welcome your questions!"*

---

## 🛡️ Hackathon Stage Fallback & Contingency Plan

If the hackathon auditorium suffers from loud ambient noise, mic permission blocks, or Wi-Fi drops:

| Emergency Scenario | Immediate Presenter Action | Backup Mechanism |
|:---|:---|:---|
| **Auditorium background noise drowns voice recognition** | Do not struggle with the mic. Press **`Alt + N`**, **`Alt + F`**, and **`Alt + H`** directly on the keyboard. | The UI will execute the exact same feedback animations and spoken readouts smoothly. |
| **Microphone permission blocked in Chrome** | Click the **Quick Simulation Buttons** on the right sidebar or in the Floating Assistant Widget. | Demonstrates full feature execution without relying on native mic permissions. |
| **Backend Wi-Fi drops / FastAPI down** | `ExtensionBridge` and `ConversationalAgent` automatically run in built-in **Fallback Mock Mode**. | Realistic RAG responses and low-evidence clarification prompts execute offline in 600ms. |
| **TTS audio volume too low on stage** | Direct the judges' attention to the **Floating Feedback HUD** and **Live Stepper** at the top. | Every spoken word is rendered in high-contrast text in real time. |
