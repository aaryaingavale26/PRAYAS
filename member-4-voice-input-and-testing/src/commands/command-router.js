/**
 * PRAYAS 3.0 - Command Engine
 * CommandRouter: Validates, routes, and provides visual and auditory feedback for voice commands.
 * 
 * Safety:
 * - Rejects arbitrary spoken code
 * - Validates against strict IntentType
 * - Always provides spoken and visual status updates
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
    this.onFeedback = null; // ({ success, intent, message, transcript })
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
   * @returns {Promise<{ success: boolean, intent: string, message: string }>}
   */
  async execute(rawTranscript) {
    const match = matchCommandIntent(rawTranscript);

    // Stop command should always immediately stop speech synthesis regardless of registration
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

    // Handle unrecognized command
    if (match.intent === IntentType.UNKNOWN || !match.definition) {
      const normalized = normalizeTranscript(rawTranscript);
      const feedback = {
        success: false,
        intent: IntentType.UNKNOWN,
        message: `Command "${normalized || rawTranscript}" not recognized.`,
        transcript: rawTranscript
      };

      this._emitFeedback(feedback);

      if (this.synthesizer) {
        // Speak guidance briefly
        this.synthesizer.speak('Command not recognized. You can say: Read page, Read question, Next field, Previous field, Fill my details, or Stop reading.');
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
      // Default spoken feedback if no custom action handler is attached yet
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
