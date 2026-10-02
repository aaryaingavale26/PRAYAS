/**
 * PRAYAS 3.0 - Standalone Demo Bundle
 * 
 * Bundles all core engines into a self-contained script so it works seamlessly on:
 * 1. http://localhost:3000 (recommended secure context)
 * 2. file:/// (direct desktop double-click without CORS import errors)
 */

(function() {
  'use strict';

  // --- 1. RECOGNITION STATE & ENGINE ---
  const RecognitionState = Object.freeze({
    UNINITIALIZED: 'UNINITIALIZED',
    IDLE: 'IDLE',
    STARTING: 'STARTING',
    LISTENING: 'LISTENING',
    PROCESSING: 'PROCESSING',
    ERROR: 'ERROR'
  });

  class SpeechRecognizer {
    constructor(options = {}) {
      this.options = {
        lang: options.lang || 'en-US',
        continuous: options.continuous ?? false,
        interimResults: options.interimResults ?? true,
        maxAlternatives: options.maxAlternatives || 1
      };
      this.state = RecognitionState.UNINITIALIZED;
      this.recognition = null;
      this.isSupported = false;
      this.lastError = null;
      this.onStateChange = null;
      this.onTranscript = null;
      this.onError = null;
      this.onStart = null;
      this.onEnd = null;

      this._initEngine();
    }

    _initEngine() {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) {
        this.isSupported = false;
        this._setState(RecognitionState.ERROR);
        this.lastError = {
          code: 'unsupported',
          message: 'Speech Recognition is not supported in this browser. Please use Chrome or Edge.'
        };
        return;
      }

      this.isSupported = true;
      try {
        this.recognition = new SpeechRecognitionAPI();
        this.recognition.lang = this.options.lang;
        this.recognition.continuous = this.options.continuous;
        this.recognition.interimResults = this.options.interimResults;
        this.recognition.maxAlternatives = this.options.maxAlternatives;
        this._bindEvents();
        this._setState(RecognitionState.IDLE);
      } catch (err) {
        this.isSupported = false;
        this._setState(RecognitionState.ERROR);
        this.lastError = { code: 'initialization-failed', message: err.message };
      }
    }

    _bindEvents() {
      if (!this.recognition) return;

      this.recognition.onstart = () => {
        this.lastError = null;
        this._setState(RecognitionState.LISTENING);
        if (typeof this.onStart === 'function') this.onStart();
      };

      this.recognition.onspeechstart = () => this._setState(RecognitionState.PROCESSING);
      this.recognition.onspeechend = () => this._setState(RecognitionState.PROCESSING);

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        let highestConfidence = 0;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const text = item[0].transcript;
          const conf = item[0].confidence || 0;
          if (item.isFinal) {
            finalTranscript += text;
            highestConfidence = Math.max(highestConfidence, conf);
          } else {
            interimTranscript += text;
          }
        }

        if (finalTranscript.trim().length > 0 && typeof this.onTranscript === 'function') {
          this.onTranscript({
            transcript: finalTranscript.trim(),
            isFinal: true,
            confidence: Number((highestConfidence || 0.9).toFixed(2))
          });
        } else if (interimTranscript.trim().length > 0 && typeof this.onTranscript === 'function') {
          this.onTranscript({
            transcript: interimTranscript.trim(),
            isFinal: false,
            confidence: 0.5
          });
        }
      };

      this.recognition.onerror = (event) => {
        let msg = `Speech recognition error (${event.error}).`;
        if (event.error === 'not-allowed') {
          msg = 'Microphone permission denied. Allow mic access in Chrome address bar.';
        } else if (event.error === 'no-speech') {
          msg = 'No speech detected. Please speak closer to microphone.';
        }
        const errDetail = { code: event.error, message: msg };
        this.lastError = errDetail;
        this._setState(RecognitionState.ERROR);
        if (typeof this.onError === 'function') this.onError(errDetail);
      };

      this.recognition.onend = () => {
        if (this.state !== RecognitionState.ERROR) {
          this._setState(RecognitionState.IDLE);
        }
        if (typeof this.onEnd === 'function') this.onEnd();
      };
    }

    _setState(newState) {
      if (this.state === newState) return;
      this.state = newState;
      if (typeof this.onStateChange === 'function') this.onStateChange(this.state);
    }

    start() {
      if (!this.isSupported || !this.recognition) return;
      if (this.state === RecognitionState.LISTENING || this.state === RecognitionState.STARTING) return;
      this._setState(RecognitionState.STARTING);
      try {
        this.recognition.start();
      } catch (err) {
        console.warn('Recognition start exception:', err);
      }
    }

    stop() {
      if (!this.recognition) return;
      try { this.recognition.stop(); } catch (e) {}
    }

    abort() {
      if (!this.recognition) return;
      try { this.recognition.abort(); } catch (e) {}
    }
  }

  // --- 2. SYNTHESIZER ENGINE ---
  class SpeechSynthesizer {
    constructor(options = {}) {
      this.rate = options.rate ?? 1.0;
      this.pitch = options.pitch ?? 1.0;
      this.volume = options.volume ?? 1.0;
      this.isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
      this.synth = this.isSupported ? window.speechSynthesis : null;
      this.voices = [];
      this.selectedVoice = null;
      this.isSpeaking = false;
      this._keepAliveTimer = null;

      if (this.isSupported) {
        this._loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => this._loadVoices();
        }
      }
    }

    _loadVoices() {
      if (!this.synth) return;
      this.voices = this.synth.getVoices();
      const pref = this.voices.filter(v => v.lang.startsWith('en'));
      const natural = pref.find(v => v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Jenny'));
      this.selectedVoice = natural || pref[0] || this.voices[0] || null;
    }

    speak(text, options = {}) {
      return new Promise((resolve) => {
        if (!this.isSupported || !this.synth || !text || !text.trim()) {
          resolve();
          return;
        }

        if (options.interrupt ?? true) {
          this.stop();
        }

        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = options.rate ?? this.rate;
        utter.pitch = options.pitch ?? this.pitch;
        utter.volume = options.volume ?? this.volume;
        if (this.selectedVoice) utter.voice = this.selectedVoice;

        utter.onstart = () => {
          this.isSpeaking = true;
          this._startKeepAlive();
        };

        utter.onend = () => {
          this.isSpeaking = false;
          this._stopKeepAlive();
          resolve();
        };

        utter.onerror = () => {
          this.isSpeaking = false;
          this._stopKeepAlive();
          resolve();
        };

        try {
          this.synth.speak(utter);
        } catch (e) {
          this._stopKeepAlive();
          resolve();
        }
      });
    }

    stop() {
      if (!this.synth) return;
      this._stopKeepAlive();
      try { this.synth.cancel(); } catch (e) {}
      this.isSpeaking = false;
    }

    _startKeepAlive() {
      this._stopKeepAlive();
      this._keepAliveTimer = setInterval(() => {
        if (this.synth && this.isSpeaking) {
          this.synth.pause();
          this.synth.resume();
        }
      }, 10000);
    }

    _stopKeepAlive() {
      if (this._keepAliveTimer) {
        clearInterval(this._keepAliveTimer);
        this._keepAliveTimer = null;
      }
    }
  }

  // --- 3. COMMAND WHITELIST & ROUTER ---
  const IntentType = Object.freeze({
    READ_PAGE: 'READ_PAGE',
    READ_QUESTION: 'READ_QUESTION',
    NEXT_FIELD: 'NEXT_FIELD',
    PREV_FIELD: 'PREV_FIELD',
    STOP_READING: 'STOP_READING',
    FILL_DETAILS: 'FILL_DETAILS',
    UNKNOWN: 'UNKNOWN'
  });

  function normalizeTranscript(raw) {
    if (!raw) return '';
    return raw.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"]/g, '').replace(/\s+/g, ' ').trim();
  }

  function matchCommandIntent(raw) {
    const norm = normalizeTranscript(raw);
    if (!norm) return { intent: IntentType.UNKNOWN, confidence: 0 };

    if (/^read (this )?page$/i.test(norm) || /^summarize page$/i.test(norm)) return { intent: IntentType.READ_PAGE, confidence: 1 };
    if (/^read (the |this )?(current )?question$/i.test(norm) || /^read field$/i.test(norm)) return { intent: IntentType.READ_QUESTION, confidence: 1 };
    if (/^next( field| input)?$/i.test(norm) || /^go next$/i.test(norm) || /^forward$/i.test(norm)) return { intent: IntentType.NEXT_FIELD, confidence: 1 };
    if (/^(previous|prev)( field)?$/i.test(norm) || /^go back$/i.test(norm) || /^back$/i.test(norm)) return { intent: IntentType.PREV_FIELD, confidence: 1 };
    if (/^stop( reading| talking)?$/i.test(norm) || /^quiet$/i.test(norm) || /^silence$/i.test(norm) || /^cancel$/i.test(norm)) return { intent: IntentType.STOP_READING, confidence: 1 };
    if (/^fill (my |the )?details$/i.test(norm) || /^autofill$/i.test(norm) || /^fill profile$/i.test(norm)) return { intent: IntentType.FILL_DETAILS, confidence: 1 };

    return { intent: IntentType.UNKNOWN, confidence: 0 };
  }

  class CommandRouter {
    constructor(options = {}) {
      this.synthesizer = options.synthesizer || null;
      this.actions = new Map();
      this.onFeedback = null;
    }

    registerAction(intent, handler) {
      this.actions.set(intent, handler);
    }

    async execute(rawText) {
      const match = matchCommandIntent(rawText);

      if (match.intent === IntentType.STOP_READING) {
        if (this.synthesizer) this.synthesizer.stop();
        const fb = { success: true, intent: match.intent, message: 'Audio stopped.', transcript: rawText };
        if (this.onFeedback) this.onFeedback(fb);
        const h = this.actions.get(match.intent);
        if (h) await h();
        return fb;
      }

      if (match.intent === IntentType.UNKNOWN) {
        const fb = { success: false, intent: IntentType.UNKNOWN, message: `Command "${rawText}" not recognized.`, transcript: rawText };
        if (this.onFeedback) this.onFeedback(fb);
        if (this.synthesizer) {
          this.synthesizer.speak('Command not recognized. Say: Next field, Read question, Fill my details, or Stop reading.');
        }
        return fb;
      }

      const handler = this.actions.get(match.intent);
      const fb = { success: true, intent: match.intent, message: `Executing ${match.intent}`, transcript: rawText };
      if (this.onFeedback) this.onFeedback(fb);

      if (typeof handler === 'function') {
        try {
          await handler();
        } catch (err) {
          console.error('Handler error:', err);
        }
      }
      return fb;
    }
  }

  // --- 4. EXTENSION BRIDGE & MOCK CONTENT SCRIPT ---
  class MockContentScript {
    constructor() {
      this.currentFieldIndex = 0;
    }

    getFields() {
      return Array.from(document.querySelectorAll(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'
      ));
    }

    getFieldMeta(el) {
      if (!el) return null;
      let label = '';
      if (el.id) {
        const l = document.querySelector(`label[for="${el.id}"]`);
        if (l) label = l.innerText.trim();
      }
      if (!label) label = el.getAttribute('aria-label') || el.placeholder || el.name || 'Input field';
      return {
        id: el.id || el.name,
        label: label,
        required: el.hasAttribute('required') || el.getAttribute('aria-required') === 'true',
        value: el.value || '',
        placeholder: el.placeholder || ''
      };
    }

    handleMessage(msg) {
      const fields = this.getFields();

      switch (msg.type) {
        case 'NAVIGATE_NEXT': {
          if (fields.length === 0) return { success: false };
          this.currentFieldIndex = Math.min(this.currentFieldIndex + 1, fields.length - 1);
          const target = fields[this.currentFieldIndex];
          target.focus();
          return { success: true, field: this.getFieldMeta(target), index: this.currentFieldIndex, total: fields.length };
        }
        case 'NAVIGATE_PREVIOUS': {
          if (fields.length === 0) return { success: false };
          this.currentFieldIndex = Math.max(this.currentFieldIndex - 1, 0);
          const target = fields[this.currentFieldIndex];
          target.focus();
          return { success: true, field: this.getFieldMeta(target), index: this.currentFieldIndex, total: fields.length };
        }
        case 'READ_PAGE': {
          return {
            success: true,
            summary: {
              pageTitle: document.title || 'Job Application Demo',
              totalFields: fields.length,
              currentFieldIndex: this.currentFieldIndex + 1
            }
          };
        }
        case 'READ_CURRENT_FIELD': {
          const active = document.activeElement && fields.includes(document.activeElement)
            ? document.activeElement
            : fields[this.currentFieldIndex];
          return { success: true, field: this.getFieldMeta(active) };
        }
        case 'FILL_PROFILE_DETAILS': {
          const passport = {
            name: 'Alex Morgan',
            email: 'alex.morgan@example.com',
            phone: '+1 (555) 019-2834',
            experience: 'Mid-Level (3-5 years)'
          };
          const filled = [];
          fields.forEach(f => {
            const id = (f.id || f.name || '').toLowerCase();
            if (id.includes('name')) { f.value = passport.name; filled.push('Name'); }
            else if (id.includes('email')) { f.value = passport.email; filled.push('Email'); }
            else if (id.includes('phone')) { f.value = passport.phone; filled.push('Phone'); }
            else if (id.includes('exp')) { f.value = passport.experience; filled.push('Experience'); }
            f.dispatchEvent(new Event('input', { bubbles: true }));
            f.dispatchEvent(new Event('change', { bubbles: true }));
          });
          return {
            success: true,
            fieldsUpdated: filled,
            message: 'Populated Name, Email, Phone, and Experience from your Accessibility Passport.'
          };
        }
        case 'GET_ACTIVE_QUESTION': {
          const active = document.getElementById('applicant-behavioral') || fields[fields.length - 1];
          return {
            success: true,
            fieldId: active?.id,
            question: 'Describe a complex technical or accessibility challenge you solved in a past project, detailing your implementation and outcome.'
          };
        }
        case 'INSERT_DRAFT_ANSWER': {
          const target = document.getElementById('applicant-behavioral') || document.activeElement;
          if (target) {
            target.value = msg.payload?.text || '';
            target.dispatchEvent(new Event('input', { bubbles: true }));
          }
          return { success: true };
        }
        default:
          return { success: true };
      }
    }
  }

  class ExtensionBridge {
    constructor() {
      this.mock = new MockContentScript();
    }
    sendMessage(msg) {
      return Promise.resolve(this.mock.handleMessage(msg));
    }
    navigateNext() { return this.sendMessage({ type: 'NAVIGATE_NEXT' }); }
    navigatePrevious() { return this.sendMessage({ type: 'NAVIGATE_PREVIOUS' }); }
    readPage() { return this.sendMessage({ type: 'READ_PAGE' }); }
    readCurrentField() { return this.sendMessage({ type: 'READ_CURRENT_FIELD' }); }
    fillProfileDetails() { return this.sendMessage({ type: 'FILL_PROFILE_DETAILS' }); }
    getActiveQuestion() { return this.sendMessage({ type: 'GET_ACTIVE_QUESTION' }); }
    insertDraftAnswer(text) { return this.sendMessage({ type: 'INSERT_DRAFT_ANSWER', payload: { text } }); }
  }

  // --- 5. CONVERSATIONAL RAG AGENT ---
  const AgentFlowStep = Object.freeze({
    IDLE: 'IDLE',
    READING_QUESTION: 'READING_QUESTION',
    AWAITING_CONSENT: 'AWAITING_CONSENT',
    FETCHING_DRAFT: 'FETCHING_DRAFT',
    AWAITING_CLARIFICATION: 'AWAITING_CLARIFICATION',
    REVIEWING_DRAFT: 'REVIEWING_DRAFT',
    INSERTED: 'INSERTED',
    REJECTED: 'REJECTED'
  });

  class ConversationalAgent {
    constructor({ synthesizer, bridge }) {
      this.synthesizer = synthesizer;
      this.bridge = bridge;
      this.currentStep = AgentFlowStep.IDLE;
      this.activeQuestion = '';
      this.currentDraft = '';
      this.currentMetadata = null;
      this.onStepChange = null;
    }

    _setStep(step, payload = {}) {
      this.currentStep = step;
      if (this.onStepChange) this.onStepChange(step, payload);
    }

    async startAssistanceFlow() {
      this._setStep(AgentFlowStep.READING_QUESTION);
      const qRes = await this.bridge.getActiveQuestion();
      this.activeQuestion = qRes.question;

      await this.synthesizer.speak(`Application Question: ${this.activeQuestion}`);
      this._setStep(AgentFlowStep.AWAITING_CONSENT, { question: this.activeQuestion });
      await this.synthesizer.speak('Would you like me to draft an answer using your Accessibility Passport and resume? Say Yes or No.');
    }

    async handleConsentResponse(consent) {
      if (this.currentStep !== AgentFlowStep.AWAITING_CONSENT) return;
      if (!consent) {
        this._setStep(AgentFlowStep.REJECTED);
        await this.synthesizer.speak('Understood. You can write your answer manually or navigate to another field.');
        return;
      }
      await this.fetchDraft();
    }

    async fetchDraft(supplementalNotes = '') {
      this._setStep(AgentFlowStep.FETCHING_DRAFT);
      await this.synthesizer.speak('Retrieving details from your uploaded documents...');

      // Try live FastAPI endpoint on port 8000, fallback to offline RAG mock
      let data = null;
      try {
        const resp = await fetch('http://localhost:8000/api/v1/generate-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: this.activeQuestion,
            supplemental_notes: supplementalNotes,
            user_id: 'alex_morgan'
          })
        });
        if (resp.ok) data = await resp.json();
      } catch (e) {
        // Fallback mock
      }

      if (!data) {
        await new Promise(r => setTimeout(r, 600));
        data = {
          success: true,
          draft_answer: "In my previous engineering role, I led the accessibility overhaul for high-traffic web workflows to reach full WCAG 2.1 AA compliance. I implemented keyboard trap prevention, ARIA live regions, and screen-reader automated audits, boosting accessibility scores by 42% and eliminating critical navigation barriers for users with motor and vision disabilities.",
          confidence: 0.94,
          sources: ['Resume: Accessibility Experience', 'Passport: Engineering Projects']
        };
      }

      this.currentDraft = data.draft_answer;
      this.currentMetadata = { confidence: data.confidence, sources: data.sources };
      this._setStep(AgentFlowStep.REVIEWING_DRAFT, {
        draft: this.currentDraft,
        metadata: this.currentMetadata
      });

      await this.synthesizer.speak(`Here is the draft answer based on your resume: ${this.currentDraft}`);
      await this.synthesizer.speak('Would you like to Accept, Edit, or Reject this draft?');
    }

    async acceptDraft() {
      if (this.currentStep !== AgentFlowStep.REVIEWING_DRAFT) return;
      await this.bridge.insertDraftAnswer(this.currentDraft);
      this._setStep(AgentFlowStep.INSERTED);
      await this.synthesizer.speak('Draft answer accepted and inserted into the field. You can review or edit it on the page before submitting.');
    }

    async rejectDraft() {
      this.currentDraft = '';
      this._setStep(AgentFlowStep.REJECTED);
      await this.synthesizer.speak('Draft discarded. The form field was left unchanged.');
    }

    setEditedDraft(text) {
      this.currentDraft = text;
    }
  }

  // --- 6. VOICE WIDGET UI CONTROLLER ---
  class VoiceWidget {
    constructor({ bridge }) {
      this.bridge = bridge;
      this.recognizer = new SpeechRecognizer({ lang: 'en-US' });
      this.synthesizer = new SpeechSynthesizer({ rate: 1.0 });
      this.router = new CommandRouter({ synthesizer: this.synthesizer });
      this.agent = new ConversationalAgent({ synthesizer: this.synthesizer, bridge: this.bridge });

      this.attachToDOM();
      this.wireActions();
      this.bindShortcuts();
    }

    attachToDOM() {
      if (document.getElementById('prayas-voice-widget-root')) return;

      const el = document.createElement('div');
      el.id = 'prayas-voice-widget-root';
      el.className = 'prayas-voice-widget';
      el.setAttribute('role', 'region');
      el.setAttribute('aria-label', 'PRAYAS 3.0 Voice Assistant');

      el.innerHTML = `
        <div class="prayas-widget-header">
          <div class="prayas-brand">
            <span aria-hidden="true">🎙️</span>
            <span>PRAYAS Assistant</span>
          </div>
          <div id="prayas-status-badge" class="prayas-status-badge" role="status" aria-live="polite">
            <span class="prayas-dot"></span>
            <span id="prayas-status-text">READY</span>
          </div>
        </div>

        <div class="prayas-widget-body">
          <div id="prayas-hud-display" class="prayas-hud-display" role="status" aria-live="polite" tabindex="0">
            Ready. Tap Speak (Alt+M), press a shortcut, or type a command.
          </div>

          <!-- Consent Prompt Card (Step 2) -->
          <div id="prayas-consent-card" class="prayas-consent-card" role="region" aria-live="polite">
            <div class="prayas-consent-title">
              🤖 Would you like me to draft an answer using your Accessibility Passport & resume?
            </div>
            <div class="prayas-consent-actions">
              <button id="prayas-btn-consent-yes" class="prayas-btn" style="flex: 1; background: #16a34a;">
                👍 Yes, Draft It <span class="prayas-kbd">Alt+Y</span>
              </button>
              <button id="prayas-btn-consent-no" class="prayas-btn" style="flex: 1; background: #dc2626;">
                👎 No, Skip <span class="prayas-kbd">Alt+N</span>
              </button>
            </div>
          </div>

          <!-- Draft Review Card (Step 5 & 6) -->
          <div id="prayas-draft-card" class="prayas-draft-card" role="region" aria-live="polite">
            <div class="prayas-draft-header">
              <span style="font-size: 0.85rem; font-weight: 700; color: #38bdf8;">📝 AI Personalized Draft</span>
              <span id="prayas-confidence-badge" class="prayas-confidence-badge">94% Match</span>
            </div>
            <textarea id="prayas-draft-text" class="prayas-draft-textarea" rows="4" aria-label="Editable draft answer"></textarea>
            <div id="prayas-sources-box" class="prayas-sources-box"></div>
            <div class="prayas-review-actions">
              <button id="prayas-btn-accept-draft" class="prayas-btn" style="flex: 1.2; background: #16a34a;" aria-label="Accept draft (Alt+A)">
                ✓ Accept & Insert <span class="prayas-kbd">Alt+A</span>
              </button>
              <button id="prayas-btn-reject-draft" class="prayas-btn" style="flex: 0.8; background: #dc2626;" aria-label="Reject draft (Alt+X)">
                ✕ Reject <span class="prayas-kbd">Alt+X</span>
              </button>
            </div>
          </div>

          <!-- Mic Controls -->
          <div class="prayas-controls-row">
            <button id="prayas-btn-mic" class="prayas-btn prayas-btn-mic" aria-label="Activate microphone (Shortcut: Alt+M)">
              🎤 <span>Tap & Speak</span> <span class="prayas-kbd">Alt+M</span>
            </button>
            <button id="prayas-btn-stop" class="prayas-btn prayas-btn-stop" aria-label="Silence speech (Shortcut: Escape)">
              ⏹ <span>Stop</span> <span class="prayas-kbd">Esc</span>
            </button>
          </div>

          <!-- Quick Action Shortcuts -->
          <div class="prayas-shortcuts-row">
            <button class="prayas-btn-sm" data-cmd="next field" aria-label="Next field (Alt+N)">
              <span>Next Field</span>
              <span class="prayas-kbd">Alt+N</span>
            </button>
            <button class="prayas-btn-sm" data-cmd="previous field" aria-label="Previous field (Alt+B)">
              <span>Prev Field</span>
              <span class="prayas-kbd">Alt+B</span>
            </button>
            <button class="prayas-btn-sm" data-cmd="read question" aria-label="Read question (Alt+R)">
              <span>Read Q</span>
              <span class="prayas-kbd">Alt+R</span>
            </button>
            <button class="prayas-btn-sm" data-cmd="read this page" aria-label="Read this page (Alt+W)">
              <span>Page Info</span>
              <span class="prayas-kbd">Alt+W</span>
            </button>
            <button class="prayas-btn-sm" data-cmd="fill my details" aria-label="Fill my details (Alt+F)">
              <span>Autofill</span>
              <span class="prayas-kbd">Alt+F</span>
            </button>
            <button id="prayas-btn-ai-help" class="prayas-btn-sm" aria-label="AI answer help (Alt+H)">
              <span>AI Draft</span>
              <span class="prayas-kbd">Alt+H</span>
            </button>
          </div>

          <!-- Manual Input -->
          <form id="prayas-manual-form" class="prayas-manual-input-box" onsubmit="event.preventDefault();">
            <input 
              type="text" 
              id="prayas-manual-cmd" 
              class="prayas-text-input" 
              placeholder="Type command (e.g. next, autofill, draft)..." 
              aria-label="Manual command text input"
            />
            <button type="submit" class="prayas-btn prayas-btn-stop" style="padding: 6px 12px;">Run</button>
          </form>
        </div>
      `;

      document.body.appendChild(el);
      this.bindEvents();
    }

    wireActions() {
      this.router.registerAction(IntentType.NEXT_FIELD, async () => {
        const res = await this.bridge.navigateNext();
        await this.synthesizer.speak(`Next field: ${res.field?.label || 'Input'}.`);
      });

      this.router.registerAction(IntentType.PREV_FIELD, async () => {
        const res = await this.bridge.navigatePrevious();
        await this.synthesizer.speak(`Previous field: ${res.field?.label || 'Input'}.`);
      });

      this.router.registerAction(IntentType.READ_QUESTION, async () => {
        const res = await this.bridge.readCurrentField();
        const f = res.field;
        await this.synthesizer.speak(`Question: ${f.label}. ${f.required ? 'Required.' : ''}`);
      });

      this.router.registerAction(IntentType.READ_PAGE, async () => {
        const res = await this.bridge.readPage();
        await this.synthesizer.speak(`${res.summary.pageTitle}. Contains ${res.summary.totalFields} form fields.`);
      });

      this.router.registerAction(IntentType.FILL_DETAILS, async () => {
        const res = await this.bridge.fillProfileDetails();
        await this.synthesizer.speak(res.message);
      });

      this.router.registerAction(IntentType.STOP_READING, async () => {
        this.synthesizer.stop();
        this.recognizer.stop();
        this.updateStatus('STOPPED', 'ready');
      });

      // Agent State Callbacks
      const consentCard = document.getElementById('prayas-consent-card');
      const draftCard = document.getElementById('prayas-draft-card');
      const draftText = document.getElementById('prayas-draft-text');
      const confBadge = document.getElementById('prayas-confidence-badge');
      const sourcesBox = document.getElementById('prayas-sources-box');
      const hud = document.getElementById('prayas-hud-display');

      this.agent.onStepChange = (step, payload) => {
        switch (step) {
          case AgentFlowStep.READING_QUESTION:
            consentCard.classList.remove('visible');
            draftCard.classList.remove('visible');
            this.updateStatus('READING Q', 'speaking');
            break;
          case AgentFlowStep.AWAITING_CONSENT:
            consentCard.classList.add('visible');
            draftCard.classList.remove('visible');
            this.updateStatus('AWAITING YES/NO', 'listening');
            hud.innerHTML = '<strong>Consent Request:</strong> Would you like AI to draft an answer? (Say Yes or No)';
            break;
          case AgentFlowStep.FETCHING_DRAFT:
            consentCard.classList.remove('visible');
            this.updateStatus('QUERYING RAG', 'speaking');
            hud.innerHTML = '<span class="interim">Searching resume vector store...</span>';
            break;
          case AgentFlowStep.REVIEWING_DRAFT:
            consentCard.classList.remove('visible');
            draftCard.classList.add('visible');
            draftText.value = payload.draft;
            confBadge.textContent = `${Math.round((payload.metadata?.confidence || 0.9) * 100)}% Match`;
            sourcesBox.innerHTML = '';
            (payload.metadata?.sources || []).forEach(s => {
              const chip = document.createElement('span');
              chip.className = 'prayas-source-chip';
              chip.textContent = `📄 ${s}`;
              sourcesBox.appendChild(chip);
            });
            this.updateStatus('REVIEW DRAFT', 'speaking');
            hud.innerHTML = '<strong>Draft Ready:</strong> Review above. Say Accept, Edit, or Reject.';
            break;
          case AgentFlowStep.INSERTED:
            draftCard.classList.remove('visible');
            this.updateStatus('INSERTED', 'ready');
            hud.innerHTML = '<span style="color: #4ade80;">✓ Draft answer inserted. Form was NOT submitted.</span>';
            break;
          case AgentFlowStep.REJECTED:
            consentCard.classList.remove('visible');
            draftCard.classList.remove('visible');
            this.updateStatus('DECLINED', 'ready');
            hud.innerHTML = 'Assistance stopped. Field left untouched.';
            break;
        }
      };
    }

    bindEvents() {
      const btnMic = document.getElementById('prayas-btn-mic');
      const btnStop = document.getElementById('prayas-btn-stop');
      const btnAi = document.getElementById('prayas-btn-ai-help');
      const hud = document.getElementById('prayas-hud-display');
      const form = document.getElementById('prayas-manual-form');
      const input = document.getElementById('prayas-manual-cmd');

      const btnYes = document.getElementById('prayas-btn-consent-yes');
      const btnNo = document.getElementById('prayas-btn-consent-no');
      const btnAccept = document.getElementById('prayas-btn-accept-draft');
      const btnReject = document.getElementById('prayas-btn-reject-draft');
      const draftText = document.getElementById('prayas-draft-text');

      btnYes.addEventListener('click', () => this.agent.handleConsentResponse(true));
      btnNo.addEventListener('click', () => this.agent.handleConsentResponse(false));
      btnAccept.addEventListener('click', () => this.agent.acceptDraft());
      btnReject.addEventListener('click', () => this.agent.rejectDraft());
      draftText.addEventListener('input', () => this.agent.setEditedDraft(draftText.value));

      btnMic.addEventListener('click', () => {
        if (this.recognizer.state === RecognitionState.LISTENING) {
          this.recognizer.stop();
        } else {
          this.recognizer.start();
        }
      });

      btnStop.addEventListener('click', () => {
        this.router.execute('stop reading');
        hud.textContent = 'Audio stopped by user.';
      });

      btnAi.addEventListener('click', () => this.agent.startAssistanceFlow());

      document.querySelectorAll('[data-cmd]').forEach(b => {
        b.addEventListener('click', () => {
          const cmd = b.getAttribute('data-cmd');
          this.execText(cmd);
        });
      });

      form.addEventListener('submit', () => {
        const val = input.value.trim();
        if (val) {
          this.execText(val);
          input.value = '';
        }
      });

      this.recognizer.onStateChange = (state) => {
        if (state === RecognitionState.LISTENING) {
          btnMic.classList.add('active-listening');
          this.updateStatus('LISTENING', 'listening');
          hud.innerHTML = '<span class="interim">Listening... speak your command.</span>';
        } else {
          btnMic.classList.remove('active-listening');
          if (state !== RecognitionState.ERROR && this.agent.currentStep === AgentFlowStep.IDLE) {
            this.updateStatus('READY', 'ready');
          }
        }
      };

      this.recognizer.onTranscript = async ({ transcript, isFinal }) => {
        if (isFinal) {
          hud.innerHTML = `<strong>Heard:</strong> "${transcript}"`;
          await this.execText(transcript);
        } else {
          hud.innerHTML = `<span class="interim">"${transcript}..."</span>`;
        }
      };

      this.recognizer.onError = (err) => {
        this.updateStatus('ERROR', 'error');
        hud.innerHTML = `<span style="color: #f87171;">⚠️ ${err.message}</span>`;
      };

      this.router.onFeedback = ({ success, message, transcript }) => {
        hud.innerHTML = `<div><strong>${success ? '✓' : '⚠️'} ${transcript}</strong></div><div style="color: #94a3b8; font-size: 0.8rem;">${message}</div>`;
      };
    }

    async execText(text) {
      const lower = text.toLowerCase();
      if (this.agent.currentStep === AgentFlowStep.AWAITING_CONSENT) {
        if (lower.includes('yes') || lower.includes('draft') || lower.includes('sure')) {
          await this.agent.handleConsentResponse(true);
          return;
        } else if (lower.includes('no') || lower.includes('skip') || lower.includes('cancel')) {
          await this.agent.handleConsentResponse(false);
          return;
        }
      } else if (this.agent.currentStep === AgentFlowStep.REVIEWING_DRAFT) {
        if (lower.includes('accept') || lower.includes('insert') || lower.includes('confirm')) {
          await this.agent.acceptDraft();
          return;
        } else if (lower.includes('reject') || lower.includes('discard') || lower.includes('cancel')) {
          await this.agent.rejectDraft();
          return;
        }
      }

      if (lower.includes('help') || lower.includes('draft') || lower.includes('ai')) {
        await this.agent.startAssistanceFlow();
        return;
      }

      await this.router.execute(text);
    }

    updateStatus(text, type) {
      const b = document.getElementById('prayas-status-badge');
      const l = document.getElementById('prayas-status-text');
      if (b && l) {
        l.textContent = text;
        b.className = `prayas-status-badge ${type}`;
      }
    }

    bindShortcuts() {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.synthesizer.stop();
          this.recognizer.stop();
          return;
        }

        if (e.altKey) {
          if (e.key === 'm' || e.key === 'M') { e.preventDefault(); document.getElementById('prayas-btn-mic')?.click(); }
          else if (e.key === 'n' || e.key === 'N') {
            e.preventDefault();
            if (this.agent.currentStep === AgentFlowStep.AWAITING_CONSENT) this.agent.handleConsentResponse(false);
            else this.execText('next field');
          }
          else if (e.key === 'y' || e.key === 'Y') {
            e.preventDefault();
            if (this.agent.currentStep === AgentFlowStep.AWAITING_CONSENT) this.agent.handleConsentResponse(true);
          }
          else if (e.key === 'b' || e.key === 'B') { e.preventDefault(); this.execText('previous field'); }
          else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); this.execText('read question'); }
          else if (e.key === 'w' || e.key === 'W') { e.preventDefault(); this.execText('read this page'); }
          else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); this.execText('fill my details'); }
          else if (e.key === 'h' || e.key === 'H') { e.preventDefault(); this.agent.startAssistanceFlow(); }
          else if (e.key === 'a' || e.key === 'A') {
            e.preventDefault();
            if (this.agent.currentStep === AgentFlowStep.REVIEWING_DRAFT) this.agent.acceptDraft();
          }
          else if (e.key === 'x' || e.key === 'X') {
            e.preventDefault();
            if (this.agent.currentStep === AgentFlowStep.REVIEWING_DRAFT) this.agent.rejectDraft();
          }
        }
      });
    }
  }

  // Auto-init on page load
  window.addEventListener('DOMContentLoaded', () => {
    const bridge = new ExtensionBridge();
    window.prayasWidget = new VoiceWidget({ bridge });

    // Wire Demo Portal buttons
    const btnReset = document.getElementById('btn-reset-demo');
    const btnToggleBarriers = document.getElementById('btn-toggle-barriers');
    const form = document.getElementById('job-application-form');

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (form) form.reset();
        document.querySelectorAll('input, select, textarea').forEach(el => el.value = '');
        window.prayasWidget.synthesizer.speak('Form reset.');
      });
    }

    let showBarriers = true;
    if (btnToggleBarriers) {
      btnToggleBarriers.addEventListener('click', () => {
        showBarriers = !showBarriers;
        document.querySelectorAll('.barrier-callout').forEach(el => {
          el.style.display = showBarriers ? 'inline-flex' : 'none';
        });
        btnToggleBarriers.textContent = showBarriers
          ? 'Hide Accessibility Barrier Callouts'
          : 'Show Accessibility Barrier Callouts';
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('🎉 Candidate submitted application successfully! (PRAYAS assisted without automatic submission)');
      });
    }
  });

})();
