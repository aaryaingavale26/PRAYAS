/**
 * PRAYAS 3.0 - Reference Content Script for Chrome Extension (Member 2 Contract)
 * 
 * This file serves as:
 * 1. The exact reference contract for Member 2 (Chrome Extension Developer).
 * 2. An in-page mock content script during standalone testing.
 * 
 * Responsibilities:
 * - Inspects and queries active DOM elements
 * - Handles field focus, form summary, and safe draft insertion
 * - NEVER auto-submits forms
 */

export class MockContentScript {
  /**
   * @param {Object} [options]
   * @param {string} [options.formSelector='form'] - CSS selector for application form
   */
  constructor(options = {}) {
    this.formSelector = options.formSelector || 'form';
    this.currentFieldIndex = 0;
  }

  /**
   * Query all interactive input fields in the application form
   * @returns {HTMLElement[]}
   */
  getFields() {
    return Array.from(document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'
    ));
  }

  /**
   * Extract human-readable label and hint metadata from an element
   * @param {HTMLElement} el 
   */
  getFieldMetadata(el) {
    if (!el) return null;
    let labelText = '';

    // Check <label for="id">
    if (el.id) {
      const labelEl = document.querySelector(`label[for="${el.id}"]`);
      if (labelEl) labelText = labelEl.innerText.trim();
    }

    // Check parent label or aria-label
    if (!labelText) {
      labelText = el.getAttribute('aria-label') || el.placeholder || el.name || 'Unnamed field';
    }

    return {
      id: el.id || el.name || 'field',
      name: el.name || '',
      type: el.tagName.toLowerCase() === 'textarea' ? 'textarea' : (el.type || 'text'),
      label: labelText,
      required: el.hasAttribute('required') || el.getAttribute('aria-required') === 'true',
      currentValue: el.value || '',
      placeholder: el.placeholder || ''
    };
  }

  /**
   * Main Message Dispatcher (Matches chrome.runtime.onMessage contract)
   * @param {Object} message - { type: string, payload?: any }
   * @returns {Object} response
   */
  handleMessage(message) {
    const fields = this.getFields();

    switch (message.type) {
      case 'PING':
        return { success: true, version: '3.0.0', status: 'ready', fieldCount: fields.length };

      case 'NAVIGATE_NEXT': {
        if (fields.length === 0) return { success: false, error: 'No fields detected.' };
        this.currentFieldIndex = Math.min(this.currentFieldIndex + 1, fields.length - 1);
        const target = fields[this.currentFieldIndex];
        target.focus();
        return {
          success: true,
          action: 'NAVIGATE_NEXT',
          field: this.getFieldMetadata(target),
          index: this.currentFieldIndex,
          total: fields.length
        };
      }

      case 'NAVIGATE_PREVIOUS': {
        if (fields.length === 0) return { success: false, error: 'No fields detected.' };
        this.currentFieldIndex = Math.max(this.currentFieldIndex - 1, 0);
        const target = fields[this.currentFieldIndex];
        target.focus();
        return {
          success: true,
          action: 'NAVIGATE_PREVIOUS',
          field: this.getFieldMetadata(target),
          index: this.currentFieldIndex,
          total: fields.length
        };
      }

      case 'READ_PAGE': {
        const title = document.title || 'Job Application Page';
        return {
          success: true,
          action: 'READ_PAGE',
          summary: {
            pageTitle: title,
            totalFields: fields.length,
            currentFieldIndex: this.currentFieldIndex + 1
          }
        };
      }

      case 'READ_CURRENT_FIELD': {
        if (fields.length === 0) return { success: false, error: 'No form fields found.' };
        const active = document.activeElement && fields.includes(document.activeElement)
          ? document.activeElement
          : fields[this.currentFieldIndex];

        return {
          success: true,
          action: 'READ_CURRENT_FIELD',
          field: this.getFieldMetadata(active)
        };
      }

      case 'FILL_PROFILE_DETAILS': {
        const dummyPassport = {
          name: 'Alex Morgan',
          email: 'alex.morgan@example.com',
          phone: '+1 555-0192',
          experience: 'Mid-Level (3-5 years)'
        };

        const filled = [];
        fields.forEach(f => {
          const type = (f.type || '').toLowerCase();
          const name = (f.name || f.id || '').toLowerCase();

          if (name.includes('name') && dummyPassport.name) {
            f.value = dummyPassport.name;
            f.dispatchEvent(new Event('input', { bubbles: true }));
            filled.push(f.id || 'name');
          } else if (name.includes('email') && dummyPassport.email) {
            f.value = dummyPassport.email;
            f.dispatchEvent(new Event('input', { bubbles: true }));
            filled.push(f.id || 'email');
          } else if (name.includes('phone') && dummyPassport.phone) {
            f.value = dummyPassport.phone;
            f.dispatchEvent(new Event('input', { bubbles: true }));
            filled.push(f.id || 'phone');
          } else if (name.includes('exp') && dummyPassport.experience) {
            f.value = dummyPassport.experience;
            f.dispatchEvent(new Event('change', { bubbles: true }));
            filled.push(f.id || 'experience');
          }
        });

        return {
          success: true,
          action: 'FILL_PROFILE_DETAILS',
          fieldsUpdated: filled,
          message: `Autofilled ${filled.length} fields from Accessibility Passport.`
        };
      }

      case 'GET_ACTIVE_QUESTION': {
        const active = document.activeElement && fields.includes(document.activeElement)
          ? document.activeElement
          : fields[this.currentFieldIndex];

        const meta = this.getFieldMetadata(active);
        return {
          success: true,
          action: 'GET_ACTIVE_QUESTION',
          fieldId: meta.id,
          question: meta.label || meta.placeholder || 'Job application question'
        };
      }

      case 'INSERT_DRAFT_ANSWER': {
        const target = document.activeElement && fields.includes(document.activeElement)
          ? document.activeElement
          : fields[this.currentFieldIndex];

        if (!target) return { success: false, error: 'No active target field to insert answer.' };

        const textToInsert = message.payload?.text || '';
        target.value = textToInsert;
        target.dispatchEvent(new Event('input', { bubbles: true }));

        return {
          success: true,
          action: 'INSERT_DRAFT_ANSWER',
          fieldId: target.id || target.name,
          charactersInserted: textToInsert.length
        };
      }

      default:
        return { success: false, error: `Unhandled message type: ${message.type}` };
    }
  }
}
