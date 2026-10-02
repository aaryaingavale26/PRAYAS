/**
 * PRAYAS 3.0 - Voice Module
 * SpeechRecognizer: Accessible, robust wrapper around Web Speech API (SpeechRecognition).
 * 
 * Features:
 * - State machine (UNINITIALIZED, IDLE, STARTING, LISTENING, PROCESSING, ERROR)
 * - Safe handling of WebKit/Standard SpeechRecognition API
 * - Explicit user control (no unconsented background listening)
 * - Interim vs. Final transcript separation with confidence metrics
 * - Comprehensive error diagnostics (not-allowed, no-speech, audio-capture, etc.)
 */

export const RecognitionState = Object.freeze({
  UNINITIALIZED: 'UNINITIALIZED',
  IDLE: 'IDLE',
  STARTING: 'STARTING',
  LISTENING: 'LISTENING',
  PROCESSING: 'PROCESSING',
  ERROR: 'ERROR'
});

export class SpeechRecognizer {
  /**
   * @param {Object} options
   * @param {string} [options.lang='en-US'] - BCP 47 language tag
   * @param {boolean} [options.continuous=false] - Continuous listening or push-to-talk
   * @param {boolean} [options.interimResults=true] - Return interim results
   * @param {number} [options.maxAlternatives=1] - Maximum candidate alternatives
   */
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

    // Callbacks
    this.onStateChange = null;
    this.onTranscript = null; // ({ transcript, isFinal, confidence })
    this.onError = null;      // ({ code, message, resolution })
    this.onStart = null;
    this.onEnd = null;

    this._initEngine();
  }

  /**
   * Initialize browser SpeechRecognition instance
   * @private
   */
  _initEngine() {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      this.isSupported = false;
      this._setState(RecognitionState.ERROR);
      this.lastError = {
        code: 'unsupported',
        message: 'Speech Recognition is not supported in this browser.',
        resolution: 'Please use Google Chrome, Microsoft Edge, or a Chromium-based browser with SpeechRecognition support.'
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
      this.lastError = {
        code: 'initialization-failed',
        message: `Failed to initialize SpeechRecognition: ${err.message}`,
        resolution: 'Check browser security permissions and ensure HTTPS or localhost is used.'
      };
    }
  }

  /**
   * Bind recognition lifecycle events
   * @private
   */
  _bindEvents() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.lastError = null;
      this._setState(RecognitionState.LISTENING);
      if (typeof this.onStart === 'function') this.onStart();
    };

    this.recognition.onspeechstart = () => {
      this._setState(RecognitionState.PROCESSING);
    };

    this.recognition.onspeechend = () => {
      this._setState(RecognitionState.PROCESSING);
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      let highestConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        const transcriptPart = item[0].transcript;
        const confidence = item[0].confidence || 0;

        if (item.isFinal) {
          finalTranscript += transcriptPart;
          highestConfidence = Math.max(highestConfidence, confidence);
        } else {
          interimTranscript += transcriptPart;
        }
      }

      if (finalTranscript.trim().length > 0) {
        if (typeof this.onTranscript === 'function') {
          this.onTranscript({
            transcript: finalTranscript.trim(),
            isFinal: true,
            confidence: Number((highestConfidence || 0.9).toFixed(2))
          });
        }
      } else if (interimTranscript.trim().length > 0) {
        if (typeof this.onTranscript === 'function') {
          this.onTranscript({
            transcript: interimTranscript.trim(),
            isFinal: false,
            confidence: 0.5
          });
        }
      }
    };

    this.recognition.onerror = (event) => {
      const errorDetail = this._mapError(event.error);
      this.lastError = errorDetail;
      this._setState(RecognitionState.ERROR);

      if (typeof this.onError === 'function') {
        this.onError(errorDetail);
      }
    };

    this.recognition.onend = () => {
      if (this.state !== RecognitionState.ERROR) {
        this._setState(RecognitionState.IDLE);
      }
      if (typeof this.onEnd === 'function') this.onEnd();
    };
  }

  /**
   * Map standard SpeechRecognition error codes to accessible human instructions
   * @private
   */
  _mapError(code) {
    switch (code) {
      case 'not-allowed':
      case 'service-not-allowed':
        return {
          code: 'not-allowed',
          message: 'Microphone permission was denied or blocked by the browser.',
          resolution: 'Click the camera/microphone icon in your browser address bar and allow microphone access, then try again.'
        };
      case 'no-speech':
        return {
          code: 'no-speech',
          message: 'No speech was detected.',
          resolution: 'Speak closer to your microphone or check microphone volume levels.'
        };
      case 'audio-capture':
        return {
          code: 'audio-capture',
          message: 'No audio capture device (microphone) found.',
          resolution: 'Ensure your microphone is plugged in, powered on, and recognized by Windows.'
        };
      case 'network':
        return {
          code: 'network',
          message: 'Network error communicating with speech recognition service.',
          resolution: 'The browser Web Speech engine requires internet access to Google Speech servers. Check internet connection.'
        };
      case 'aborted':
        return {
          code: 'aborted',
          message: 'Listening was cancelled by the user.',
          resolution: 'Ready to listen again when requested.'
        };
      default:
        return {
          code: code || 'unknown',
          message: `Speech recognition error occurred (${code}).`,
          resolution: 'Please retry or use manual keyboard controls.'
        };
    }
  }

  /**
   * Transition state and notify subscriber
   * @private
   */
  _setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    if (typeof this.onStateChange === 'function') {
      this.onStateChange(this.state);
    }
  }

  /**
   * Start listening for voice input
   */
  start() {
    if (!this.isSupported || !this.recognition) {
      throw new Error(this.lastError ? this.lastError.message : 'Speech recognition is not supported.');
    }

    if (this.state === RecognitionState.LISTENING || this.state === RecognitionState.STARTING) {
      return; // Already running
    }

    this._setState(RecognitionState.STARTING);
    try {
      this.recognition.start();
    } catch (err) {
      // Handles InvalidStateError if already started in native layer
      console.warn('[PRAYAS Voice] Recognition start error:', err);
    }
  }

  /**
   * Stop listening and finalize any remaining transcript
   */
  stop() {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch (err) {
      console.warn('[PRAYAS Voice] Recognition stop error:', err);
    }
  }

  /**
   * Abort immediately without waiting for results
   */
  abort() {
    if (!this.recognition) return;
    try {
      this.recognition.abort();
    } catch (err) {
      console.warn('[PRAYAS Voice] Recognition abort error:', err);
    }
  }
}
