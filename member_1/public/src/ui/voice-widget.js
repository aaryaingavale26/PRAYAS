/**
 * PRAYAS 3.0 - Accessible Voice Widget (Unified Stage 4 & Stage 5 Deliverable)
 * 
 * Features:
 * - Floating Accessible Assistant Bar
 * - Integrated 7-Step Conversational RAG Dialog Flow:
 *   1. Read question aloud
 *   2. Prompt for user consent (Yes / No)
 *   3. Send to FastAPI backend
 *   4. Receive evidence-backed draft with source citations
 *   5. Read draft aloud and render editable draft card
 *   6. Review actions: Accept (Alt+A), Edit, Reject (Alt+X)
 *   7. Insert draft non-destructively (never auto-submits)
 * - Clarification loop for missing evidence (anti-hallucination)
 * - 100% keyboard parity and manual text command fallback
 */

import { SpeechRecognizer, RecognitionState } from '../voice/speech-recognizer.js';
import { SpeechSynthesizer } from '../voice/speech-synthesizer.js';
import { CommandRouter } from '../commands/command-router.js';
import { IntentType } from '../commands/command-definitions.js';
import { ExtensionBridge } from '../bridge/extension-bridge.js';
import { ConversationalAgent, AgentFlowStep } from '../agent/conversational-agent.js';

export class VoiceWidget {
  /**
   * @param {Object} [options]
   * @param {ExtensionBridge} [options.bridge]
   * @param {string} [options.backendUrl]
   * @param {boolean} [options.autoAttach=true]
   */
  constructor(options = {}) {
    this.bridge = options.bridge || new ExtensionBridge({ allowFallback: true });
    this.backendUrl = options.backendUrl || 'http://localhost:8000/api/v1/generate-answer';

    this.recognizer = new SpeechRecognizer({ lang: 'en-US', continuous: false, interimResults: true });
    this.synthesizer = new SpeechSynthesizer({ rate: 1.0 });
    this.router = new CommandRouter({ synthesizer: this.synthesizer });
    
    // Conversational Agent with automatic live/mock fallback
    this.agent = new ConversationalAgent({
      synthesizer: this.synthesizer,
      bridge: this.bridge,
      backendUrl: this.backendUrl,
      useMockBackend: true
    });

    this.container = null;

    if (options.autoAttach !== false) {
      this.attachToDOM();
    }
  }

  /**
   * Render widget into document body
   */
  attachToDOM() {
    if (document.getElementById('prayas-voice-widget-root')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'prayas-voice-widget-root';
    wrapper.className = 'prayas-voice-widget';
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', 'PRAYAS 3.0 Voice Assistant');

    wrapper.innerHTML = `
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
        <!-- Live Speech HUD / Screen Reader Announcement -->
        <div id="prayas-hud-display" class="prayas-hud-display" role="status" aria-live="polite" tabindex="0">
          Ready. Tap Speak (Alt+M) or type a command.
        </div>

        <!-- STAGE 4: Consent Prompt Card (Step 2) -->
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

        <!-- STAGE 4: Low-Evidence Clarification Drawer (Anti-Hallucination) -->
        <div id="prayas-clarification-card" class="prayas-clarification-card" role="region" aria-live="polite">
          <div class="prayas-clarification-title">⚠️ Clarification Needed</div>
          <div id="prayas-clarification-prompt" class="prayas-clarification-prompt">
            I could not find specific details about this in your uploaded resume. What project or experience would you like to highlight?
          </div>
          <div style="display: flex; gap: 6px;">
            <input 
              type="text" 
              id="prayas-clarification-input" 
              class="prayas-text-input" 
              placeholder="Speak or type your experience..."
            />
            <button id="prayas-btn-submit-clarification" class="prayas-btn prayas-btn-mic" style="padding: 6px 10px;">
              Submit
            </button>
          </div>
        </div>

        <!-- STAGE 4: Draft Review Card (Step 5 & 6) -->
        <div id="prayas-draft-card" class="prayas-draft-card" role="region" aria-live="polite">
          <div class="prayas-draft-header">
            <span style="font-size: 0.85rem; font-weight: 700; color: #38bdf8;">📝 AI Personalized Draft</span>
            <span id="prayas-confidence-badge" class="prayas-confidence-badge">94% Match</span>
          </div>

          <textarea id="prayas-draft-text" class="prayas-draft-textarea" aria-label="Editable draft answer"></textarea>

          <div id="prayas-sources-box" class="prayas-sources-box">
            <!-- Citation chips inserted dynamically -->
          </div>

          <div class="prayas-review-actions">
            <button id="prayas-btn-accept-draft" class="prayas-btn" style="flex: 1.2; background: #16a34a;" aria-label="Accept draft (Alt+A)">
              ✓ Accept & Insert <span class="prayas-kbd">Alt+A</span>
            </button>
            <button id="prayas-btn-save-draft" class="prayas-btn prayas-btn-stop" style="flex: 0.8;" aria-label="Save text changes">
              ✏️ Save Edits
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

        <!-- Quick Keyboard Shortcuts -->
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

        <!-- Manual Command Input (Non-verbal alternative) -->
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

    document.body.appendChild(wrapper);
    this.container = wrapper;

    this._bindEvents();
    this._wireCommandActions();
    this._bindAgentCallbacks();
    this._bindKeyboardShortcuts();
  }

  /**
   * Wire CommandRouter to ExtensionBridge & SpeechSynthesizer
   * @private
   */
  _wireCommandActions() {
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
      this._updateStatus('STOPPED', 'ready');
    });
  }

  /**
   * Bind Stage 4 Conversational Agent state callbacks
   * @private
   */
  _bindAgentCallbacks() {
    const consentCard = document.getElementById('prayas-consent-card');
    const clarificationCard = document.getElementById('prayas-clarification-card');
    const clarificationPrompt = document.getElementById('prayas-clarification-prompt');
    const draftCard = document.getElementById('prayas-draft-card');
    const draftText = document.getElementById('prayas-draft-text');
    const confidenceBadge = document.getElementById('prayas-confidence-badge');
    const sourcesBox = document.getElementById('prayas-sources-box');
    const hudDisplay = document.getElementById('prayas-hud-display');

    this.agent.onStepChange = (step, payload) => {
      switch (step) {
        case AgentFlowStep.READING_QUESTION:
          consentCard.classList.remove('visible');
          clarificationCard.classList.remove('visible');
          draftCard.classList.remove('visible');
          this._updateStatus('READING Q', 'speaking');
          break;

        case AgentFlowStep.AWAITING_CONSENT:
          consentCard.classList.add('visible');
          clarificationCard.classList.remove('visible');
          draftCard.classList.remove('visible');
          this._updateStatus('AWAITING YES/NO', 'listening');
          hudDisplay.innerHTML = '<strong>Consent Request:</strong> Would you like AI to draft an answer? (Say Yes or No)';
          break;

        case AgentFlowStep.FETCHING_DRAFT:
          consentCard.classList.remove('visible');
          this._updateStatus('QUERYING RAG', 'speaking');
          hudDisplay.innerHTML = '<span class="interim">Connecting to RAG service & searching resume vectors...</span>';
          break;

        case AgentFlowStep.AWAITING_CLARIFICATION:
          consentCard.classList.remove('visible');
          draftCard.classList.remove('visible');
          clarificationCard.classList.add('visible');
          if (payload?.prompt) {
            clarificationPrompt.textContent = payload.prompt;
          }
          this._updateStatus('CLARIFICATION', 'speaking');
          hudDisplay.innerHTML = '<span style="color: #fbbf24;">⚠️ Missing evidence in resume. Provide clarification note.</span>';
          break;

        case AgentFlowStep.REVIEWING_DRAFT:
          consentCard.classList.remove('visible');
          clarificationCard.classList.remove('visible');
          draftCard.classList.add('visible');
          draftText.value = payload.draft;
          confidenceBadge.textContent = `${Math.round((payload.metadata?.confidence || 0.9) * 100)}% Match`;

          sourcesBox.innerHTML = '';
          (payload.metadata?.sources || []).forEach(src => {
            const chip = document.createElement('span');
            chip.className = 'prayas-source-chip';
            chip.textContent = `📄 ${src}`;
            sourcesBox.appendChild(chip);
          });

          this._updateStatus('REVIEW DRAFT', 'speaking');
          hudDisplay.innerHTML = '<strong>Draft Ready:</strong> Say Accept, Edit, or Reject.';
          break;

        case AgentFlowStep.INSERTED:
          draftCard.classList.remove('visible');
          this._updateStatus('INSERTED', 'ready');
          hudDisplay.innerHTML = '<span style="color: #4ade80;">✓ Draft answer inserted into field. Form was NOT submitted.</span>';
          break;

        case AgentFlowStep.REJECTED:
          consentCard.classList.remove('visible');
          clarificationCard.classList.remove('visible');
          draftCard.classList.remove('visible');
          this._updateStatus('DECLINED', 'ready');
          hudDisplay.innerHTML = 'Assistance stopped. Target field left untouched.';
          break;
      }
    };
  }

  /**
   * Internal UI event binding
   * @private
   */
  _bindEvents() {
    const btnMic = document.getElementById('prayas-btn-mic');
    const btnStop = document.getElementById('prayas-btn-stop');
    const btnAiHelp = document.getElementById('prayas-btn-ai-help');
    const hudDisplay = document.getElementById('prayas-hud-display');
    const manualForm = document.getElementById('prayas-manual-form');
    const manualInput = document.getElementById('prayas-manual-cmd');

    // Stage 4 Buttons
    const btnConsentYes = document.getElementById('prayas-btn-consent-yes');
    const btnConsentNo = document.getElementById('prayas-btn-consent-no');
    const btnSubmitClarification = document.getElementById('prayas-btn-submit-clarification');
    const clarificationInput = document.getElementById('prayas-clarification-input');
    const btnAcceptDraft = document.getElementById('prayas-btn-accept-draft');
    const btnSaveDraft = document.getElementById('prayas-btn-save-draft');
    const btnRejectDraft = document.getElementById('prayas-btn-reject-draft');
    const draftText = document.getElementById('prayas-draft-text');

    btnConsentYes.addEventListener('click', () => this.agent.handleConsentResponse(true));
    btnConsentNo.addEventListener('click', () => this.agent.handleConsentResponse(false));

    btnSubmitClarification.addEventListener('click', () => {
      const val = clarificationInput.value.trim();
      if (val) {
        this.agent.submitClarificationNotes(val);
        clarificationInput.value = '';
      }
    });

    btnAcceptDraft.addEventListener('click', () => this.agent.acceptDraft());
    btnRejectDraft.addEventListener('click', () => this.agent.rejectDraft());
    btnSaveDraft.addEventListener('click', () => {
      this.agent.setEditedDraft(draftText.value.trim());
      hudDisplay.innerHTML = '<span style="color: #38bdf8;">✓ Edits saved to draft.</span>';
    });

    // Mic Button
    btnMic.addEventListener('click', () => {
      if (this.recognizer.state === RecognitionState.LISTENING) {
        this.recognizer.stop();
      } else {
        try {
          this.recognizer.start();
        } catch (err) {
          hudDisplay.textContent = `Mic Error: ${err.message}`;
        }
      }
    });

    // Stop Button
    btnStop.addEventListener('click', () => {
      this.router.execute('stop reading');
      hudDisplay.textContent = 'Audio stopped by user.';
    });

    // AI Help Flow
    btnAiHelp.addEventListener('click', () => {
      this.agent.startAssistanceFlow();
    });

    // Quick Command Buttons
    this.container.querySelectorAll('[data-cmd]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.getAttribute('data-cmd');
        this._executeCommandText(cmd);
      });
    });

    // Manual Command Input Form
    manualForm.addEventListener('submit', () => {
      const val = manualInput.value.trim();
      if (val) {
        this._executeCommandText(val);
        manualInput.value = '';
      }
    });

    // Recognizer Callbacks
    this.recognizer.onStateChange = (state) => {
      if (state === RecognitionState.LISTENING) {
        btnMic.classList.add('active-listening');
        this._updateStatus('LISTENING', 'listening');
        hudDisplay.innerHTML = '<span class="interim">Listening... speak your command.</span>';
      } else {
        btnMic.classList.remove('active-listening');
        if (state !== RecognitionState.ERROR && this.agent.currentStep === AgentFlowStep.IDLE) {
          this._updateStatus('READY', 'ready');
        }
      }
    };

    this.recognizer.onTranscript = async ({ transcript, isFinal }) => {
      if (isFinal) {
        hudDisplay.innerHTML = `<strong>Heard:</strong> "${transcript}"`;
        await this._executeCommandText(transcript);
      } else {
        hudDisplay.innerHTML = `<span class="interim">"${transcript}..."</span>`;
      }
    };

    this.recognizer.onError = (err) => {
      this._updateStatus('ERROR', 'error');
      hudDisplay.innerHTML = `<span style="color: #f87171;">⚠️ ${err.message}</span>`;
    };

    // Feedback from Router
    this.router.onFeedback = ({ success, message, transcript }) => {
      hudDisplay.innerHTML = `<div><strong>${success ? '✓' : '⚠️'} ${transcript}</strong></div><div style="color: #94a3b8; font-size: 0.8rem;">${message}</div>`;
    };
  }

  /**
   * Helper to execute command by text (from voice, shortcut, or manual input)
   * @private
   */
  async _executeCommandText(text) {
    const lower = text.toLowerCase();

    // Check if conversational agent is in active dialog
    if (this.agent.currentStep !== AgentFlowStep.IDLE && this.agent.currentStep !== AgentFlowStep.INSERTED) {
      if (this.agent.currentStep === AgentFlowStep.AWAITING_CONSENT) {
        if (lower.includes('yes') || lower.includes('sure') || lower.includes('draft')) {
          await this.agent.handleConsentResponse(true);
          return;
        } else if (lower.includes('no') || lower.includes('skip') || lower.includes('cancel')) {
          await this.agent.handleConsentResponse(false);
          return;
        }
      } else if (this.agent.currentStep === AgentFlowStep.AWAITING_CLARIFICATION) {
        await this.agent.submitClarificationNotes(text);
        return;
      } else if (this.agent.currentStep === AgentFlowStep.REVIEWING_DRAFT) {
        if (lower.includes('accept') || lower.includes('insert') || lower.includes('confirm')) {
          await this.agent.acceptDraft();
          return;
        } else if (lower.includes('reject') || lower.includes('discard') || lower.includes('cancel')) {
          await this.agent.rejectDraft();
          return;
        } else if (lower.includes('edit')) {
          const draftText = document.getElementById('prayas-draft-text');
          if (draftText) draftText.focus();
          await this.synthesizer.speak('You can now edit your draft in the text area.');
          return;
        }
      }
    }

    if (lower.includes('help') || lower.includes('ai draft') || lower.includes('draft answer')) {
      await this.agent.startAssistanceFlow();
      return;
    }

    await this.router.execute(text);
  }

  /**
   * Update visual status badge
   * @private
   */
  _updateStatus(text, type) {
    const badge = document.getElementById('prayas-status-badge');
    const label = document.getElementById('prayas-status-text');
    if (!badge || !label) return;

    label.textContent = text;
    badge.className = `prayas-status-badge ${type}`;
  }

  /**
   * Global Keyboard Shortcuts (WCAG 2.1 AA Compliant)
   * @private
   */
  _bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Global Escape halts speech immediately
      if (e.key === 'Escape') {
        this.synthesizer.stop();
        this.recognizer.stop();
        return;
      }

      // Alt shortcuts
      if (e.altKey) {
        if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          document.getElementById('prayas-btn-mic')?.click();
        } else if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          if (this.agent.currentStep === AgentFlowStep.AWAITING_CONSENT) {
            this.agent.handleConsentResponse(false);
          } else {
            this._executeCommandText('next field');
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          if (this.agent.currentStep === AgentFlowStep.AWAITING_CONSENT) {
            this.agent.handleConsentResponse(true);
          }
        } else if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          this._executeCommandText('previous field');
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          this._executeCommandText('read question');
        } else if (e.key === 'w' || e.key === 'W') {
          e.preventDefault();
          this._executeCommandText('read this page');
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          this._executeCommandText('fill my details');
        } else if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          this.agent.startAssistanceFlow();
        } else if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          if (this.agent.currentStep === AgentFlowStep.REVIEWING_DRAFT) {
            this.agent.acceptDraft();
          }
        } else if (e.key === 'x' || e.key === 'X') {
          e.preventDefault();
          if (this.agent.currentStep === AgentFlowStep.REVIEWING_DRAFT) {
            this.agent.rejectDraft();
          }
        }
      }
    });
  }
}
