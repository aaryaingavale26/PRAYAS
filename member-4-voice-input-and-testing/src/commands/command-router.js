/**
 * PRAYAS 3.0 - Intelligent Command Router (Member 4)
 * 
 * Features:
 * - Natural Language Intent classification
 * - Warm, audible confirmations designed for candidates with visual/motor disabilities
 * - Friendly clarifying question fallback for borderline confidence phrases
 * - Comprehensive help command
 * - Immediate speech synthesis cancellation on stop
 */

import { IntentType, matchCommandIntent, normalizeTranscript } from './command-definitions.js';

export class CommandRouter {
  /**
   * @param {Object} [options]
   * @param {Object} [options.synthesizer] - Instance of SpeechSynthesizer for spoken confirmations
   */
  constructor(options = {}) {
    this.synthesizer = options.synthesizer || null;
    this.actions = new Map();
    this.onFeedback = null; // ({ success, intent, message, transcript, needsClarification, clarification })
  }

  /**
   * Bind a SpeechSynthesizer instance for spoken feedback
   * @param {Object} synthesizer 
   */
  setSynthesizer(synthesizer) {
    this.synthesizer = synthesizer;
  }

  /**
   * Register a callback action for a specific IntentType
   * @param {string} intent - One of IntentType enum
   * @param {Function} handler - Async or sync action handler function
   */
  registerAction(intent, handler) {
    if (!Object.values(IntentType).includes(intent)) {
      throw new Error(`Invalid intent type: ${intent}`);
    }
    this.actions.set(intent, handler);
  }

  /**
   * Execute and route a recognized transcript
   * @param {string} rawTranscript 
   * @returns {Promise<{ success: boolean, intent: string, message: string, transcript: string, needsClarification?: boolean }>}
   */
  async execute(rawTranscript) {
    const match = matchCommandIntent(rawTranscript);

    // Stop command halts audio immediately
    if (match.intent === IntentType.STOP_READING) {
      if (this.synthesizer) {
        this.synthesizer.stop();
      }
      const feedback = {
        success: true,
        intent: match.intent,
        message: 'Speech halted.',
        transcript: rawTranscript
      };
      this._emitFeedback(feedback);

      const handler = this.actions.get(match.intent);
      if (typeof handler === 'function') {
        await handler();
      }
      return feedback;
    }

    // Borderline confidence: Ask a friendly clarifying question
    if (match.needsClarification && match.definition) {
      const clarifyText = match.clarification || `Did you want me to ${match.definition.label}?`;
      const feedback = {
        success: false,
        intent: match.intent,
        needsClarification: true,
        clarification: clarifyText,
        message: clarifyText,
        transcript: rawTranscript
      };
      this._emitFeedback(feedback);

      if (this.synthesizer) {
        this.synthesizer.speak(clarifyText);
      }
      return feedback;
    }

    // Help command
    if (match.intent === IntentType.HELP) {
      const helpMsg = 'You can say: Read Question, Next Field, Previous Field, Autofill, AI Draft, Page Info, or Start Voice Call.';
      const feedback = {
        success: true,
        intent: IntentType.HELP,
        message: helpMsg,
        transcript: rawTranscript
      };
      this._emitFeedback(feedback);

      const handler = this.actions.get(match.intent);
      if (typeof handler === 'function') {
        await handler({ intent: match.intent, definition: match.definition });
      } else if (this.synthesizer) {
        this.synthesizer.speak(helpMsg);
      }
      return feedback;
    }

    // Unrecognized command
    if (match.intent === IntentType.UNKNOWN || !match.definition) {
      const normalized = normalizeTranscript(rawTranscript, true);
      const feedback = {
        success: false,
        intent: IntentType.UNKNOWN,
        message: `Command "${normalized || rawTranscript}" not recognized.`,
        transcript: rawTranscript
      };

      this._emitFeedback(feedback);

      if (this.synthesizer) {
        this.synthesizer.speak('Command not recognized. You can say: Read question, Next field, Previous field, Autofill, AI draft, or Help.');
      }

      return feedback;
    }

    // Validated command
    const handler = this.actions.get(match.intent);
    const feedback = {
      success: true,
      intent: match.intent,
      message: match.definition.spokenFeedback,
      transcript: rawTranscript
    };

    this._emitFeedback(feedback);

    if (typeof handler === 'function') {
      try {
        await handler({ intent: match.intent, definition: match.definition });
      } catch (err) {
        console.error(`[PRAYAS Command] Handler failed for ${match.intent}:`, err);
        const errFeedback = {
          success: false,
          intent: match.intent,
          message: `Action execution error: ${err.message}`,
          transcript: rawTranscript
        };
        this._emitFeedback(errFeedback);
        return errFeedback;
      }
    } else {
      if (this.synthesizer) {
        this.synthesizer.speak(match.definition.spokenFeedback);
      }
    }

    return feedback;
  }

  /**
   * Emit visual feedback callback
   * @private
   */
  _emitFeedback(feedbackObj) {
    if (typeof this.onFeedback === 'function') {
      this.onFeedback(feedbackObj);
    }
  }
}
