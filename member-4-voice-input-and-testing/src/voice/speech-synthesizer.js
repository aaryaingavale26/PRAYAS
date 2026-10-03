/**
 * PRAYAS 3.0 - Voice Module
 * SpeechSynthesizer: Accessible, interruptible Text-To-Speech (TTS) engine using SpeechSynthesis.
 * 
 * Features:
 * - Interruptible playback (stops immediately if requested)
 * - Safe chrome voice loading lifecycle (handles async voiceschanged)
 * - Chrome 15s freeze bug workaround (periodic resume ticker)
 * - Accessible voice defaults (clear, natural rate and pitch)
 * - Utterance queue with priority overrides
 */

export class SpeechSynthesizer {
  /**
   * @param {Object} [options]
   * @param {number} [options.rate=1.0] - Speed rate (0.5 to 2.0)
   * @param {number} [options.pitch=1.0] - Voice pitch (0.5 to 1.5)
   * @param {number} [options.volume=1.0] - Volume (0.0 to 1.0)
   * @param {string} [options.lang='en-US'] - Language
   */
  constructor(options = {}) {
    this.rate = options.rate ?? 1.0;
    this.pitch = options.pitch ?? 1.0;
    this.volume = options.volume ?? 1.0;
    this.lang = options.lang || 'en-US';

    this.isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    this.synth = this.isSupported ? window.speechSynthesis : null;
    this.voices = [];
    this.selectedVoice = null;
    this.isSpeaking = false;
    this._keepAliveTimer = null;

    // Callbacks
    this.onStart = null;
    this.onEnd = null;
    this.onError = null;
    this.onVoicesLoaded = null;

    if (this.isSupported) {
      this._loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this._loadVoices();
      }
    }
  }

  /**
   * Load and filter system voices
   * @private
   */
  _loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();

    const currentLangPrefix = (this.lang || 'en').split('-')[0].toLowerCase();

    // Look for matching regional voice first (e.g. Hindi, Tamil, Telugu, etc.)
    const exactVoice = this.voices.find(v => v.lang.toLowerCase() === this.lang.toLowerCase());
    const prefixVoice = this.voices.find(v => v.lang.toLowerCase().startsWith(currentLangPrefix));

    if (exactVoice) {
      this.selectedVoice = exactVoice;
    } else if (prefixVoice) {
      this.selectedVoice = prefixVoice;
    } else {
      // Prefer high-quality natural voices
      const naturalVoice = this.voices.find(v => 
        v.name.includes('Natural') || 
        v.name.includes('Google') || 
        v.name.includes('Jenny') || 
        v.name.includes('Aria')
      );
      this.selectedVoice = naturalVoice || this.voices[0] || null;
    }

    if (typeof this.onVoicesLoaded === 'function') {
      this.onVoicesLoaded(this.voices);
    }
  }

  /**
   * Dynamically update synthesis language
   * @param {string} lang - BCP 47 language tag
   */
  setLanguage(lang) {
    if (!lang) return;
    this.lang = lang;
    this._loadVoices();
  }

  /**
   * Get list of currently loaded voices
   * @returns {SpeechSynthesisVoice[]}
   */
  getVoices() {
    return this.voices;
  }

  /**
   * Set specific voice by name
   * @param {string} voiceName
   */
  setVoiceByName(voiceName) {
    const voice = this.voices.find(v => v.name === voiceName);
    if (voice) {
      this.selectedVoice = voice;
      return true;
    }
    return false;
  }

  /**
   * Speak a phrase aloud
   * @param {string} text - Text to speak
   * @param {Object} [options]
   * @param {boolean} [options.interrupt=true] - Stop previous speech before speaking
   * @param {Function} [options.onComplete] - Callback when utterance finishes
   * @returns {Promise<void>}
   */
  speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isSupported || !this.synth) {
        const err = new Error('Speech synthesis is not supported in this browser.');
        if (typeof this.onError === 'function') this.onError(err);
        return reject(err);
      }

      if (!text || text.trim().length === 0) {
        resolve();
        return;
      }

      const interrupt = options.interrupt ?? true;
      if (interrupt) {
        this.stop();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? this.rate;
      utterance.pitch = options.pitch ?? this.pitch;
      utterance.volume = options.volume ?? this.volume;
      utterance.lang = options.lang || this.lang;

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
        this._startKeepAlive();
        if (typeof this.onStart === 'function') this.onStart(text);
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this._stopKeepAlive();
        if (typeof this.onEnd === 'function') this.onEnd();
        if (typeof options.onComplete === 'function') options.onComplete();
        resolve();
      };

      utterance.onerror = (event) => {
        this.isSpeaking = false;
        this._stopKeepAlive();
        // Ignore "interrupted" or "canceled" errors caused by intentional user stops
        if (event.error === 'interrupted' || event.error === 'canceled') {
          resolve();
          return;
        }
        const errorObj = { error: event.error, text };
        if (typeof this.onError === 'function') this.onError(errorObj);
        reject(errorObj);
      };

      try {
        this.synth.speak(utterance);
      } catch (err) {
        this._stopKeepAlive();
        reject(err);
      }
    });
  }

  /**
   * Stop any current speech playback immediately
   */
  stop() {
    if (!this.synth) return;
    this._stopKeepAlive();
    try {
      this.synth.cancel();
    } catch (err) {
      console.warn('[PRAYAS Voice] Speech cancel error:', err);
    }
    this.isSpeaking = false;
    if (typeof this.onEnd === 'function') this.onEnd();
  }

  /**
   * Pause speech synthesis
   */
  pause() {
    if (this.synth && this.isSpeaking) {
      this.synth.pause();
    }
  }

  /**
   * Resume speech synthesis
   */
  resume() {
    if (this.synth) {
      this.synth.resume();
    }
  }

  /**
   * Workaround for Chromium engine bug where speech synthesis pauses indefinitely
   * after 15 seconds of speaking unless periodically paused/resumed.
   * @private
   */
  _startKeepAlive() {
    this._stopKeepAlive();
    this._keepAliveTimer = setInterval(() => {
      if (this.synth && this.isSpeaking) {
        this.synth.pause();
        this.synth.resume();
      }
    }, 10000);
  }

  /**
   * @private
   */
  _stopKeepAlive() {
    if (this._keepAliveTimer) {
      clearInterval(this._keepAliveTimer);
      this._keepAliveTimer = null;
    }
  }
}
