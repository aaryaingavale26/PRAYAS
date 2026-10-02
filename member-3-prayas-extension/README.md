# PRAYAS 3.0 — Accessible Job Application Assistant
### Manifest V3 Chrome Extension | Team ByteShastra
**Hackathon Problem Statement:** PS003 — Accessible Job Application Assistant  
**Workstream:** Member 3 — Chrome Extension & DOM Interaction Engine  

---

## 1. Overview & Vision
Applying for jobs online should be equitable and dignified for everyone. However, standard applicant tracking systems (e.g. Workday, Greenhouse, Taleo) consistently present severe accessibility barriers: unlabelled inputs, unannounced icon buttons, transient form fields, and complex multi-page questionnaires that frustrate screen-reader users, keyboard-only applicants, and neurodivergent job seekers.

**PRAYAS 3.0** is an assistive layer that augments any existing job application site directly in the browser:
- **Zero Hostile Takeover:** Operates natively within the live employer portal without breaking the host application's scripts or styles.
- **Strict User Consent:** Job applications are **never** submitted automatically. Every autofilled field requires human preview and confirmation.
- **Lossless Rollback:** Any ARIA label repair can be reverted back to pristine DOM state with a single click.
- **Offline & Standalone Resilience:** If backend AI or cloud services are unreachable, PRAYAS seamlessly falls back to local storage and offline caches.

---

## 2. Multi-Workstream Coordination
PRAYAS 3.0 is built collaboratively across four specialized engineering workstreams:

| Workstream | Owner | Scope & Responsibility | Extension Touchpoints |
| :--- | :--- | :--- | :--- |
| **Member 1** | Web App & UI | Next.js + React + Tailwind Accessibility Passport dashboard | Generates Passport schema stored in `chrome.storage.local` |
| **Member 2** | Backend & RAG | FastAPI, LangChain, Supabase pgvector RAG pipeline | REST API endpoints (`/api/profile`, `/api/audit-report`, `/api/rag-answer`) |
| **Member 3** | Chrome Extension & DOM | **(This Deliverable)** MV3 content scripts, ARIA repair, autofill, scorecard | Content extraction, popup UI, DOM mutations, background worker |
| **Member 4** | Voice & Demo | Voice agent (Web Speech API / whisper), demo test form | Voice handshake (`VOICE_INTEGRATION.md`) & hardware shortcuts |

---

## 3. Extension Architecture (Manifest V3)

```
prayas-extension/
├── manifest.json              # MV3 configuration & permissions
├── package.json               # Test scripts & project metadata
├── .env.example               # Shared environment variables contract
├── VOICE_INTEGRATION.md       # Member 4 Voice Handshake Specification
├── README.md                  # Comprehensive documentation & demo guide
├── background/
│   └── service-worker.js     # Isolated network bridge, auth headers, offline queue
├── content/
│   ├── content-script.js     # DOM extraction, A11y audit, safe ARIA repair, voice navigation
│   └── content.css           # High-contrast focus & audit indicator styling
├── popup/
│   ├── popup.html            # 4-panel accessible extension popup interface
│   ├── popup.css             # High-contrast, dark-mode accessible UI design system
│   └── popup.js              # State manager, preview table, consent gate, JSON exporter
├── demo/
│   └── job-application-demo.html  # Controlled test portal with dynamic & deliberate a11y flaws
├── icons/                    # High-res SVG-rendered extension icons (16px, 48px, 128px)
└── tests/                    # Comprehensive automated test suite
    ├── run-all-tests.js      # Unified master test runner
    ├── test-extraction.js    # 4-tier accessible name extraction verification
    ├── test-audit.js         # Deterministic a11y rule auditing tests
    ├── test-repairs.js       # Safe ARIA improvements & 100% lossless undo verification
    ├── test-autofill.js      # 4-tier Passport autofill matching & event dispatching
    ├── test-backend.js       # FastAPI API contracts & offline fallback testing
    ├── test-scorecard.js     # WCAG 2.2 scorecard scoring & consent gate testing
    └── test-voice.js         # Voice whitelist security & navigation engine testing
```

### Component Breakdown
1. **Content Script (`content/content-script.js`)**:
   - Injected into all web pages at `document_idle`.
   - Stamps interactive controls with unique de-duplication IDs (`data-prayas-id="prayas-field-N"`).
   - Evaluates accessibility barriers deterministically using WCAG 2.2 criteria.
   - Monitors single-page app DOM mutations with a debounced `MutationObserver`.
   - Listens for voice/keyboard navigation events and synthesizes speech via the Web Speech API.
2. **Background Service Worker (`background/service-worker.js`)**:
   - Enforces execution isolation: Third-party web pages **never** have access to auth tokens or private user data.
   - Handles network requests to the FastAPI backend with timeout protection (4.5s) and offline caching.
3. **Popup Interface (`popup/popup.html`, `popup.js`, `popup.css`)**:
   - Tabbed layout: **Autofill Preview**, **Voice & Nav**, **Scorecard & Audit**, and **Field Catalog**.
   - Selective checkboxes for each autofill candidate.
   - Explicit user consent gate required before submitting audit reports to the server.
   - One-click JSON scorecard export.

---

## 4. Key Engineering Modules

### A. 4-Tier Accessible Name Extraction
To reliably extract field labels across disparate web architectures, PRAYAS employs a 4-tier resolution ladder:
1. `aria-labelledby`: Resolves one or more element IDs and joins text content.
2. `aria-label`: Direct developer-provided accessible name.
3. `<label for="...">`: Explicit standard HTML label association.
4. Closest ancestor `<label>`: Implicit wrapping label fallback.

### B. Deterministic A11y Audit Engine
Barriers are categorized strictly by confidence level:
- **DEFINITIVE** (High confidence; safe for automatic ARIA improvement):
  - `MISSING_LABEL`: Form control has zero label or aria identifier.
  - `EMPTY_LABEL`: Label element exists but contains empty whitespace or only invisible glyphs.
  - `MISSING_BUTTON_NAME`: Interactive `<button>` without text or aria-label (e.g. icon-only attachment buttons).
- **UNCERTAIN** (Flagged as warning; user is alerted but no automatic DOM edit is made):
  - `PLACEHOLDER_AS_LABEL`: Control relies solely on placeholder text (disappears on focus, low contrast).

### C. Safe ARIA Improvements & Lossless Undo
When the user clicks **"Apply Safe Fixes"**:
- PRAYAS derives human-readable titles from `name` or `id` attributes (e.g., `referralCode` &rarr; `"Referral Code"`).
- Original attribute states are captured in `dataset.prayasOriginalAriaLabel`. If no prior label existed, `__NONE__` is stored.
- Elements are tagged with `.prayas-a11y-fixed` for visual feedback.
- When the user clicks **"Undo Fixes"**, every mutated element is restored to its exact initial state, removing all injected attributes without leaving residue.

### D. Accessibility Passport Autofill & Consent Gate
- Matches fields using a 4-tier cascading algorithm (`autocomplete` &rarr; `id`/`name` regex &rarr; `label` semantics &rarr; `type`).
- Dispatches synthetic `input`, `change`, and `blur` events using prototype property setters (`Object.getOwnPropertyDescriptor(prototype, 'value').set`) to guarantee compatibility with React, Next.js, Vue, and Angular forms.
- **Safety Guarantee:** Forms are **never** submitted automatically. Fields are only populated when the user explicitly reviews the preview table and clicks "Confirm & Autofill".

### E. Structured WCAG 2.2 Scorecard & Export
- Computes an objective accessibility health score (`0% - 100%`) based on detected vs. repaired issues.
- Maps findings to WCAG 2.2 success criteria (1.3.1 Info and Relationships, 4.1.2 Name Role Value, 3.3.2 Labels or Instructions).
- Requires an explicit user consent checkbox before any scorecard can be transmitted to the backend.
- Provides offline JSON file download for manual reporting or inclusion in accommodation requests.

### F. Voice & Assistive Navigation Engine
- Enforces a strict command whitelist (`ALLOWED_VOICE_COMMANDS`):
  - `NEXT_FIELD`
  - `PREVIOUS_FIELD`
  - `READ_CURRENT_FIELD`
  - `FOCUS_FIELD`
  - `START_AUTOFILL`
  - `CLEAR_CURRENT_FIELD`
- Zero arbitrary code execution: Unrecognized commands are rejected immediately.
- Hardware keyboard shortcuts:
  - `Alt + ArrowRight`: Next field
  - `Alt + ArrowLeft`: Previous field
  - `Alt + Space`: Read current field aloud

---

## 5. Installation & Setup Guide

### Prerequisites
- Google Chrome (version 100+ recommended) or any Chromium-based browser.
- Node.js (v18+) for running test suites.
- Python 3.9+ for running the local test server.

### Step 1: Load the Unpacked Chrome Extension
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left toolbar.
4. Select the extension directory:
   ```
   C:\Users\Muthusam\.gemini\antigravity-ide\scratch\prayas-extension
   ```
5. Verify that **PRAYAS 3.0 - Accessible Job Application Assistant** appears with its blue gradient icon.

### Step 2: Start the Demo Test Environment
Open a terminal in the extension root and start the demo HTTP server:
```bash
# Start local test server on port 3000
python -m http.server 3000
```
Open your browser and navigate to:
```
http://localhost:3000/demo/job-application-demo.html
```

---

## 6. Verification & Test Suite

The extension comes with 7 comprehensive unit test suites covering every layer of the architecture.

To run all tests at once:
```bash
npm test
# OR
node tests/run-all-tests.js
```

### Individual Test Suites
```bash
# 1. 4-Tier Accessible Name Extraction
node tests/test-extraction.js

# 2. Deterministic A11y Audit Rules Engine
node tests/test-audit.js

# 3. Safe ARIA Repairs & Lossless Undo
node tests/test-repairs.js

# 4. Accessibility Passport Autofill Matching
node tests/test-autofill.js

# 5. Backend API Contracts & Offline Resilience
node tests/test-backend.js

# 6. WCAG 2.2 Scorecard & User Consent Gate
node tests/test-scorecard.js

# 7. Voice Whitelist Security & Navigation Engine
node tests/test-voice.js

# 8. JavaScript Syntax & Linter Verification
npm run lint
```

---

## 7. Hackathon Demo Walkthrough (3-Minute Script)

Use this script during your pitch to wow judges:

### **Minute 1: The Problem & Live A11y Audit**
1. Open `http://localhost:3000/demo/job-application-demo.html`.
2. Point out that while the form looks modern, it contains severe hidden barriers: unlabelled inputs (`referralCode`, `emptyLabelField`), placeholder-only labels (`emergencyContact`), and an icon-only button without an accessible name.
3. Open the **PRAYAS 3.0 Extension Popup**.
4. Show the **Quick Stats** banner: 1 Form, 19 Fields, 4 Accessibility Issues Detected.
5. Click the **Scorecard** tab: Point out the health score (e.g. 58%), the breakdown of **3 Definitive** and **1 Uncertain** barriers, and the WCAG 2.2 mappings.

### **Minute 2: Safe ARIA Improvements & Lossless Undo**
1. In the Scorecard tab, click **"Apply Safe Fixes"**.
2. Notice the instant feedback: 3 definitive issues turn green and badge as `REPAIRED`. The health score surges to **94%**.
3. In the live web page, observe that previously unlabelled inputs now carry clear accessible labels (`Referral Code`, `Empty Label Field`, `Attach Document / Resume`).
4. Click **"Undo Fixes"**: Demonstrate lossless rollback. The elements revert to their pristine pre-mutation state instantly. Click "Apply Safe Fixes" once more to re-enable accommodations.

### **Minute 3: Accessibility Passport Autofill & Voice Navigation**
1. Switch to the **Autofill** tab.
2. Show how PRAYAS matched 9 relevant fields from the user's Accessibility Passport (name, email, accommodations, portfolio, experience).
3. Emphasize user consent: The user can uncheck any field they do not wish to populate.
4. Click **"Confirm & Autofill (9 Fields)"**.
5. Switch to the page: All fields are populated cleanly with synthetic events firing. The submit button is untouched.
6. Switch to the **Voice & Nav** tab:
   - Click **"Next Field"** or press `Alt + ArrowRight`: The field lights up with high-contrast violet outline and is read aloud via speech synthesis.
   - Type `"phone"` into the Semantic Jump box and click **Focus**: Focus jumps directly to the phone input and speaks its status.
7. Return to the Scorecard tab, check the **Consent Box**, and click **"Export JSON"** to demonstrate download of the compliance report.

---

## 8. Safety & Ethical Guarantees

| Rule | Enforcement Mechanism |
| :--- | :--- |
| **Never Submit Forms** | Zero calls to `form.submit()`. Submit buttons are explicitly excluded from synthetic click actions. |
| **Lossless Undo** | Every DOM alteration preserves original attributes in `dataset.prayasOriginalAriaLabel`. |
| **No Arbitrary Code Execution** | Strict command whitelist (`ALLOWED_VOICE_COMMANDS`). Injection attempts are rejected. |
| **Execution Isolation** | Background service worker proxies network requests. Host DOM never sees server bearer tokens. |
| **Offline Resilience** | If FastAPI or cloud AI is unreachable, extension functions 100% offline using local storage. |

---

## 9. Team Interfaces Reference

- **Member 2 Backend Integration Contract:** See [`.env.example`](file:///.env.example) and [`tests/test-backend.js`](file:///tests/test-backend.js)
- **Member 4 Voice Integration Handshake:** See [`VOICE_INTEGRATION.md`](file:///VOICE_INTEGRATION.md)

---
*Built with ❤️ by Team ByteShastra for PRAYAS 3.0*
