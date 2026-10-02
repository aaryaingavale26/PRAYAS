/**
 * PRAYAS 3.0 - Extension Bridge
 * ExtensionBridge: Handles Manifest V3 communication between the Voice Agent and the Chrome Extension.
 * 
 * Responsibilities:
 * - Sends messages to Chrome Extension content scripts / background service workers
 * - Never duplicates DOM querying or manipulation logic (delegated to Member 2)
 * - Safely handles missing tabs, disconnected ports, and "Receiving end does not exist" errors
 * - Provides graceful fallback simulator when running outside Chrome Extension environment
 */

export const ConnectionStatus = Object.freeze({
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  FALLBACK_MOCK: 'FALLBACK_MOCK',
  ERROR: 'ERROR'
});

export class ExtensionBridge {
  /**
   * @param {Object} [options]
   * @param {number} [options.timeoutMs=3500] - Message timeout in milliseconds
   * @param {boolean} [options.allowFallback=true] - Fall back to simulated mock if extension absent
   * @param {Object} [options.mockHandler] - Custom mock handler if fallback is active
   */
  constructor(options = {}) {
    this.timeoutMs = options.timeoutMs || 3500;
    this.allowFallback = options.allowFallback ?? true;
    this.mockHandler = options.mockHandler || null;

    this.status = ConnectionStatus.DISCONNECTED;
    this.hasChromeRuntime = typeof chrome !== 'undefined' && !!(chrome.runtime && chrome.runtime.sendMessage);
    this.lastError = null;

    // Callbacks
    this.onStatusChange = null;
  }

  /**
   * Set connection status and notify subscriber
   * @private
   */
  _setStatus(newStatus) {
    if (this.status === newStatus) return;
    this.status = newStatus;
    if (typeof this.onStatusChange === 'function') {
      this.onStatusChange(this.status, this.lastError);
    }
  }

  /**
   * Test connection to Member 2's Chrome Extension
   * @returns {Promise<boolean>}
   */
  async checkConnection() {
    this._setStatus(ConnectionStatus.CONNECTING);

    if (!this.hasChromeRuntime) {
      if (this.allowFallback) {
        this._setStatus(ConnectionStatus.FALLBACK_MOCK);
        return true;
      }
      this.lastError = 'Chrome runtime API not detected (running outside Chrome Extension context).';
      this._setStatus(ConnectionStatus.ERROR);
      return false;
    }

    try {
      const response = await this.sendMessage({ type: 'PING' });
      if (response && response.success) {
        this.lastError = null;
        this._setStatus(ConnectionStatus.CONNECTED);
        return true;
      }
      throw new Error(response?.error || 'Invalid ping response from extension.');
    } catch (err) {
      if (this.allowFallback) {
        this.lastError = `Extension not reachable (${err.message}). Using fallback simulator.`;
        this._setStatus(ConnectionStatus.FALLBACK_MOCK);
        return true;
      }
      this.lastError = err.message;
      this._setStatus(ConnectionStatus.ERROR);
      return false;
    }
  }

  /**
   * Send a strongly-typed message to the Chrome Extension
   * @param {Object} message - { type: string, payload?: any }
   * @returns {Promise<any>}
   */
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      // If running in Mock/Fallback mode
      if (this.status === ConnectionStatus.FALLBACK_MOCK || (!this.hasChromeRuntime && this.allowFallback)) {
        if (this.mockHandler && typeof this.mockHandler.handleMessage === 'function') {
          try {
            const mockResponse = this.mockHandler.handleMessage(message);
            resolve(mockResponse);
            return;
          } catch (mockErr) {
            reject(mockErr);
            return;
          }
        } else {
          // Default internal mock response if no custom mock is supplied
          resolve(this._defaultMockResponse(message));
          return;
        }
      }

      if (!this.hasChromeRuntime) {
        const err = new Error('Chrome runtime messaging is unavailable in this environment.');
        this.lastError = err.message;
        this._setStatus(ConnectionStatus.ERROR);
        return reject(err);
      }

      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        const timeoutErr = new Error(`Extension response timed out after ${this.timeoutMs}ms.`);
        this.lastError = timeoutErr.message;
        reject(timeoutErr);
      }, this.timeoutMs);

      try {
        // Send to active tab or runtime
        chrome.runtime.sendMessage(message, (response) => {
          if (timedOut) return;
          clearTimeout(timer);

          if (chrome.runtime.lastError) {
            const errorMsg = chrome.runtime.lastError.message || 'Extension communication error.';
            this.lastError = errorMsg;

            // Handle missing tab / receiving end does not exist
            if (errorMsg.includes('Receiving end does not exist') || errorMsg.includes('Could not establish connection')) {
              if (this.allowFallback) {
                console.warn('[PRAYAS ExtensionBridge] Extension content script not injected. Falling back to simulator.');
                this._setStatus(ConnectionStatus.FALLBACK_MOCK);
                resolve(this._defaultMockResponse(message));
                return;
              }
            }

            this._setStatus(ConnectionStatus.ERROR);
            reject(new Error(errorMsg));
            return;
          }

          resolve(response);
        });
      } catch (err) {
        clearTimeout(timer);
        this.lastError = err.message;
        this._setStatus(ConnectionStatus.ERROR);
        reject(err);
      }
    });
  }

  // High-Level Voice Actions Mapped to Extension Contract

  /**
   * Request extension to move focus to next input field
   */
  async navigateNext() {
    return this.sendMessage({ type: 'NAVIGATE_NEXT' });
  }

  /**
   * Request extension to move focus to previous input field
   */
  async navigatePrevious() {
    return this.sendMessage({ type: 'NAVIGATE_PREVIOUS' });
  }

  /**
   * Request extension to summarize active page & form field count
   */
  async readPage() {
    return this.sendMessage({ type: 'READ_PAGE' });
  }

  /**
   * Request extension to read metadata of currently focused field
   */
  async readCurrentField() {
    return this.sendMessage({ type: 'READ_CURRENT_FIELD' });
  }

  /**
   * Request extension to autofill user profile passport details
   */
  async fillProfileDetails() {
    return this.sendMessage({ type: 'FILL_PROFILE_DETAILS' });
  }

  /**
   * Request extension for the active question prompt text for AI drafting
   */
  async getActiveQuestion() {
    return this.sendMessage({ type: 'GET_ACTIVE_QUESTION' });
  }

  /**
   * Request extension to insert confirmed AI draft into the active field
   * Note: NEVER automatically submits the form.
   */
  async insertDraftAnswer(draftText) {
    if (!draftText || typeof draftText !== 'string') {
      throw new Error('Draft text must be a non-empty string.');
    }
    return this.sendMessage({
      type: 'INSERT_DRAFT_ANSWER',
      payload: { text: draftText }
    });
  }

  /**
   * Built-in default mock responder when extension is offline
   * @private
   */
  _defaultMockResponse(message) {
    switch (message.type) {
      case 'PING':
        return { success: true, version: '3.0.0', status: 'ready' };
      case 'NAVIGATE_NEXT':
        return {
          success: true,
          action: 'NAVIGATE_NEXT',
          field: {
            id: 'email_field',
            label: 'Email Address',
            type: 'email',
            required: true,
            hint: 'Primary contact email'
          }
        };
      case 'NAVIGATE_PREVIOUS':
        return {
          success: true,
          action: 'NAVIGATE_PREVIOUS',
          field: {
            id: 'name_field',
            label: 'Full Legal Name',
            type: 'text',
            required: true,
            hint: 'Name as shown on passport'
          }
        };
      case 'READ_PAGE':
        return {
          success: true,
          summary: {
            pageTitle: 'Software Engineer Application — Demo Portal',
            totalFields: 5,
            currentFieldIndex: 1
          }
        };
      case 'READ_CURRENT_FIELD':
        return {
          success: true,
          field: {
            id: 'current_field',
            label: 'Full Legal Name',
            type: 'text',
            required: true,
            currentValue: '',
            hint: 'Enter your given name and surname.'
          }
        };
      case 'FILL_PROFILE_DETAILS':
        return {
          success: true,
          fieldsUpdated: ['name_field', 'email_field', 'phone_field', 'experience_field'],
          message: 'Profile details populated from Accessibility Passport.'
        };
      case 'GET_ACTIVE_QUESTION':
        return {
          success: true,
          question: 'Describe a complex challenge you solved using accessible design principles.',
          fieldId: 'behavioral_question'
        };
      case 'INSERT_DRAFT_ANSWER':
        return {
          success: true,
          inserted: true,
          length: message.payload?.text?.length || 0
        };
      default:
        return { success: false, error: `Unknown mock message type: ${message.type}` };
    }
  }
}
