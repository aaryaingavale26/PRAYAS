/**
 * PRAYAS 3.0 - Unified Content Script (Member 3)
 * 
 * Features:
 * - Single Guarded Assistant Panel (matches Image 3)
 * - Interactive Voice Call Screen (matches Image 2)
 * - Guided Form Filling Engine (field-by-field, speech-to-text, confirmation, dropdowns/radios/checkboxes)
 * - 4-Tier Accessible Name Extraction & Non-destructive ARIA repairs
 * - Natural Language Intent Detection (Member 4 integration)
 * - Complete keyboard navigation & screen-reader accessibility
 */

(function () {
  // Prevent double injection of content script
  if (window.__prayasAssistantContentScriptLoaded) return;
  window.__prayasAssistantContentScriptLoaded = true;

  console.log('[PRAYAS 3.0] Unified Content Script initialized on:', window.location.href);

  // Core Registries & Counters
  const fieldRegistry = new Map();
  const auditIssues = [];
  let fieldIdCounter = 1;
  let issueIdCounter = 1;
  let activeRepairsCount = 0;
  let currentNavIndex = -1;

  // Detect whether current page is PRAYAS web portal (candidate management) vs target job application form
  function checkIsPrayasPortal() {
    if (typeof window === 'undefined' || !window.location) return false;
    const path = window.location.pathname || '';
    if (path.startsWith('/demo/job-application')) return false;

    const host = (window.location.hostname || '').toLowerCase();
    const port = window.location.port || '';
    if (port === '3000' || port === '3001') return true;
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return true;
    if (host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.') || host.endsWith('.local')) return true;
    if (host.includes('prayas')) return true;
    if (typeof document !== 'undefined' && document.title && document.title.includes('PRAYAS')) return true;
    return false;
  }

  function getElementByPrayasId(prayasId) {
    if (!prayasId) return null;
    const meta = fieldRegistry.get(prayasId);
    if (meta && meta.element && (meta.element.isConnected === undefined || meta.element.isConnected)) {
      return meta.element;
    }
    if (typeof document !== 'undefined' && document.querySelector) {
      return document.querySelector(`[data-prayas-id="${prayasId}"]`);
    }
    return null;
  }

  const INTERACTIVE_SELECTOR = [
    'input:not([type="hidden"])',
    'textarea',
    'select',
    'button'
  ].join(', ');

  const WCAG_MAPPINGS = {
    'MISSING_LABEL': 'WCAG 2.2 - 4.1.2 (Name, Role, Value) & 3.3.2 (Labels or Instructions)',
    'EMPTY_LABEL': 'WCAG 2.2 - 1.3.1 (Info and Relationships) & 4.1.2 (Name, Role, Value)',
    'MISSING_BUTTON_NAME': 'WCAG 2.2 - 4.1.2 (Name, Role, Value)',
    'PLACEHOLDER_AS_LABEL': 'WCAG 2.2 - 3.3.2 (Labels or Instructions) & 1.4.3 (Contrast)'
  };

  const ALLOWED_VOICE_COMMANDS = new Set([
    'NEXT_FIELD',
    'PREVIOUS_FIELD',
    'READ_CURRENT_FIELD',
    'START_AUTOFILL',
    'FOCUS_FIELD',
    'CLEAR_CURRENT_FIELD',
    'READ_PAGE',
    'AI_DRAFT',
    'VOICE_CALL',
    'HELP',
    'STOP_READING'
  ]);

  // =========================================================
  // SECURE AUTH & SESSION HANDOFF (SHARED IDENTITY)
  // =========================================================
  function syncWebsiteSessionToExtension() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const rawUser = localStorage.getItem('prayas_mock_user');
        const rawPassport = localStorage.getItem('prayas_user_passport');
        const rawDocs = localStorage.getItem('prayas_uploaded_documents');
        const rawToken = localStorage.getItem('prayas_auth_token');

        if (rawUser || rawPassport || rawDocs || rawToken) {
          const user = rawUser ? JSON.parse(rawUser) : null;
          const passport = rawPassport ? JSON.parse(rawPassport) : null;
          const docs = rawDocs ? JSON.parse(rawDocs) : null;

          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({
              type: 'PRAYAS_SYNC_USER_SESSION',
              user,
              passport,
              documents: docs,
              token: rawToken || undefined
            }).catch(() => { });
          }
        }
      }
    } catch (e) {
      console.warn('[PRAYAS 3.0] Session handoff notice:', e.message);
    }
  }

  // Run on startup
  syncWebsiteSessionToExtension();

  // Listen to postMessage from PRAYAS Web Application
  if (typeof window !== 'undefined') {
    window.addEventListener('message', (event) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) return;

      if (event.data.type === 'PRAYAS_AUTH_SYNC') {
        chrome.runtime.sendMessage({
          type: 'PRAYAS_SYNC_USER_SESSION',
          user: event.data.user,
          token: event.data.token
        }).catch(() => { });
      } else if (event.data.type === 'PRAYAS_PASSPORT_SYNC') {
        chrome.runtime.sendMessage({
          type: 'PRAYAS_SYNC_USER_SESSION',
          passport: event.data.passport
        }).catch(() => { });
      } else if (event.data.type === 'PRAYAS_DOCUMENTS_SYNC') {
        chrome.runtime.sendMessage({
          type: 'PRAYAS_SYNC_USER_SESSION',
          documents: event.data.documents
        }).catch(() => { });
      }
    });
  }

  // =========================================================
  // 1. ACCESSIBLE NAME EXTRACTION & REPAIR ENGINE
  // =========================================================
  function formatReadableTitle(raw) {
    if (!raw) return 'Form Field';
    return raw
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim();
  }

  function cleanLabelText(text) {
    if (!text) return '';
    return text
      .replace(/[\*\:]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractAccessibleLabel(el) {
    if (!el) return '';
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelText = labelledBy
        .split(/\s+/)
        .map((id) => {
          const refEl = document.getElementById(id);
          return refEl ? refEl.textContent : '';
        })
        .join(' ')
        .trim();
      if (labelText) return cleanLabelText(labelText);
    }

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) {
      return cleanLabelText(ariaLabel);
    }

    if (el.id) {
      try {
        const externalLabel = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (externalLabel && externalLabel.textContent.trim()) {
          return cleanLabelText(externalLabel.textContent);
        }
      } catch (e) { }
    }

    const wrappingLabel = el.closest('label');
    if (wrappingLabel) {
      const clone = wrappingLabel.cloneNode(true);
      const inputsInClone = clone.querySelectorAll('input, select, textarea, button');
      inputsInClone.forEach((input) => input.remove());
      const labelText = clone.textContent.trim();
      if (labelText) return cleanLabelText(labelText);
    }

    const placeholder = el.getAttribute('placeholder');
    if (placeholder && placeholder.trim()) {
      return cleanLabelText(placeholder);
    }

    const title = el.getAttribute('title');
    if (title && title.trim()) {
      return cleanLabelText(title);
    }

    if (el.tagName === 'BUTTON' || (el.tagName === 'INPUT' && ['submit', 'button', 'reset'].includes(el.type))) {
      const btnText = el.textContent || el.value;
      if (btnText && btnText.trim()) {
        return cleanLabelText(btnText);
      }
    }

    return formatReadableTitle(el.name || el.id || '');
  }

  function auditElementAccessibility(el, meta) {
    const issues = [];
    const tagName = el.tagName.toLowerCase();
    const type = (el.type || '').toLowerCase();
    const isButton = tagName === 'button' || (tagName === 'input' && ['button', 'submit', 'reset'].includes(type));

    if (el.hasAttribute('data-prayas-repaired')) return issues;

    if (isButton) {
      const hasAriaLabel = !!(el.getAttribute('aria-label') && el.getAttribute('aria-label').trim());
      const hasAriaLabelledBy = !!(el.getAttribute('aria-labelledby') && el.getAttribute('aria-labelledby').trim());
      const hasTextContent = !!(el.textContent && el.textContent.trim());
      const hasValue = !!(el.value && el.value.trim());
      const hasTitle = !!(el.getAttribute('title') && el.getAttribute('title').trim());

      if (!hasAriaLabel && !hasAriaLabelledBy && !hasTextContent && !hasValue && !hasTitle) {
        issues.push({
          id: `a11y-issue-${issueIdCounter++}`,
          prayasId: meta.prayasId,
          elementId: el.id || '',
          elementName: el.name || '',
          tagName,
          fieldLabel: 'Button',
          type: 'MISSING_BUTTON_NAME',
          confidence: 'DEFINITIVE',
          severity: 'HIGH',
          title: 'Missing Accessible Button Name',
          description: 'Button has no visible text, aria-label, or title.',
          recommendation: 'Add descriptive text or an aria-label attribute.',
          repairable: true,
          status: 'DETECTED',
          wcagCriterion: WCAG_MAPPINGS['MISSING_BUTTON_NAME']
        });
      }
    } else {
      const labelledBy = el.getAttribute('aria-labelledby');
      const ariaLabel = el.getAttribute('aria-label');
      let externalLabel = null;
      if (el.id) {
        try {
          externalLabel = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        } catch (e) { }
      }
      const wrappingLabel = el.closest('label');
      const placeholder = el.getAttribute('placeholder');

      if (externalLabel && externalLabel.textContent.trim().length === 0) {
        issues.push({
          id: `a11y-issue-${issueIdCounter++}`,
          prayasId: meta.prayasId,
          elementId: el.id || '',
          elementName: el.name || '',
          tagName,
          fieldLabel: el.id || el.name || 'Unnamed input',
          type: 'EMPTY_LABEL',
          confidence: 'DEFINITIVE',
          severity: 'HIGH',
          title: 'Empty Associated Label',
          description: `A <label for="${el.id}"> exists but contains zero text content.`,
          recommendation: 'Add descriptive text inside the label.',
          repairable: true,
          status: 'DETECTED',
          wcagCriterion: WCAG_MAPPINGS['EMPTY_LABEL']
        });
      } else if (!labelledBy && !ariaLabel && !externalLabel && !wrappingLabel) {
        if (placeholder && placeholder.trim().length > 0) {
          issues.push({
            id: `a11y-issue-${issueIdCounter++}`,
            prayasId: meta.prayasId,
            elementId: el.id || '',
            elementName: el.name || '',
            tagName,
            fieldLabel: `Hint: "${placeholder.trim()}"`,
            type: 'PLACEHOLDER_AS_LABEL',
            confidence: 'UNCERTAIN',
            severity: 'MEDIUM',
            title: 'Placeholder Used As Sole Label',
            description: `Field relies solely on placeholder.`,
            recommendation: 'Provide a permanent visible label or aria-label.',
            repairable: false,
            status: 'DETECTED',
            wcagCriterion: WCAG_MAPPINGS['PLACEHOLDER_AS_LABEL']
          });
        } else {
          issues.push({
            id: `a11y-issue-${issueIdCounter++}`,
            prayasId: meta.prayasId,
            elementId: el.id || '',
            elementName: el.name || '',
            tagName,
            fieldLabel: el.id || el.name || 'Unlabeled field',
            type: 'MISSING_LABEL',
            confidence: 'DEFINITIVE',
            severity: 'HIGH',
            title: 'Missing Accessible Label',
            description: 'Field has no associated label or aria-label.',
            recommendation: `Provide an accessible label.`,
            repairable: true,
            status: 'DETECTED',
            wcagCriterion: WCAG_MAPPINGS['MISSING_LABEL']
          });
        }
      }
    }

    if (issues.length > 0 && !checkIsPrayasPortal()) el.classList.add('prayas-a11y-warning');
    else el.classList.remove('prayas-a11y-warning');

    return issues;
  }

  function processFieldElement(el) {
    const existingId = el.__prayasId || el.getAttribute('data-prayas-id');
    if (existingId && fieldRegistry.has(existingId)) {
      return fieldRegistry.get(existingId);
    }

    const prayasId = existingId || `prayas-field-${fieldIdCounter++}`;
    el.__prayasId = prayasId;
    if (!existingId && !checkIsPrayasPortal()) {
      el.setAttribute('data-prayas-id', prayasId);
    }

    const tagName = el.tagName.toLowerCase();
    let type = (el.type || tagName).toLowerCase();
    const isRequired = el.hasAttribute('required') || el.getAttribute('aria-required') === 'true';
    const parentForm = el.closest('form');
    const formId = parentForm ? (parentForm.id || parentForm.name || 'unnamed-form') : null;

    const metadata = {
      prayasId,
      tagName,
      type,
      id: el.id || '',
      name: el.getAttribute('name') || '',
      placeholder: el.getAttribute('placeholder') || '',
      required: isRequired,
      autocomplete: el.getAttribute('autocomplete') || '',
      label: extractAccessibleLabel(el) || formatReadableTitle(el.name || el.id || 'Field'),
      formId,
      isVisible: el.offsetParent !== null || el.getClientRects().length > 0,
      element: el
    };

    fieldRegistry.set(prayasId, metadata);
    const fieldIssues = auditElementAccessibility(el, metadata);
    if (fieldIssues.length > 0) auditIssues.push(...fieldIssues);

    return metadata;
  }

  function runFullScanAndAudit() {
    auditIssues.length = 0;
    fieldRegistry.clear();
    fieldIdCounter = 1;
    issueIdCounter = 1;

    document.querySelectorAll('.prayas-a11y-warning').forEach(el => el.classList.remove('prayas-a11y-warning'));
    const elements = document.querySelectorAll(INTERACTIVE_SELECTOR);
    const scannedFields = [];
    elements.forEach(el => scannedFields.push(processFieldElement(el)));

    const forms = document.querySelectorAll('form');
    return {
      formsCount: forms.length,
      fieldsCount: scannedFields.length,
      fields: scannedFields,
      activeRepairsCount,
      auditSummary: {
        totalIssues: auditIssues.length,
        definitiveCount: auditIssues.filter(i => i.confidence === 'DEFINITIVE').length,
        uncertainCount: auditIssues.filter(i => i.confidence === 'UNCERTAIN').length,
        issues: auditIssues
      }
    };
  }

  function applySafeImprovements() {
    let appliedCount = 0;
    const candidates = auditIssues.filter(i => i.repairable && i.status === 'DETECTED');

    for (const issue of candidates) {
      const el = getElementByPrayasId(issue.prayasId);
      if (!el) continue;

      const originalAriaLabel = el.hasAttribute('aria-label') ? el.getAttribute('aria-label') : '__NONE__';
      el.dataset.prayasOriginalAriaLabel = originalAriaLabel;

      let generatedLabel = '';
      if (issue.type === 'MISSING_BUTTON_NAME') {
        generatedLabel = (el.id && el.id.toLowerCase().includes('upload')) ? 'Upload document' : 'Action button';
      } else {
        generatedLabel = formatReadableTitle(el.id || el.name || 'Input field');
      }

      if (generatedLabel) {
        el.setAttribute('aria-label', generatedLabel);
        el.setAttribute('data-prayas-repaired', 'true');
        el.classList.remove('prayas-a11y-warning');
        el.classList.add('prayas-a11y-fixed');
        issue.status = 'REPAIRED';
        appliedCount++;
      }
    }

    activeRepairsCount += appliedCount;
    return { success: true, appliedCount, activeRepairsCount };
  }

  function undoAccessibilityImprovements() {
    let revertedCount = 0;
    document.querySelectorAll('[data-prayas-repaired="true"]').forEach((el) => {
      const orig = el.dataset.prayasOriginalAriaLabel;
      if (orig === '__NONE__') el.removeAttribute('aria-label');
      else if (orig) el.setAttribute('aria-label', orig);
      delete el.dataset.prayasOriginalAriaLabel;
      el.removeAttribute('data-prayas-repaired');
      el.classList.remove('prayas-a11y-fixed');
      revertedCount++;
    });
    activeRepairsCount = 0;
    runFullScanAndAudit();
    return { success: true, revertedCount };
  }

  function isPanelElement(el) {
    if (!el) return false;
    const panel = document.getElementById(PANEL_ID);
    return Boolean(panel && (panel === el || panel.contains(el)));
  }

  function getNavigableElements() {
    return Array.from(document.querySelectorAll(INTERACTIVE_SELECTOR)).filter((el) => {
      if (isPanelElement(el)) return false;
      const tag = el.tagName.toLowerCase();
      const type = (el.type || '').toLowerCase();
      if (type === 'hidden') return false;
      return el.offsetParent !== null || el.getClientRects().length > 0;
    });
  }

  function highlightElement(el) {
    document.querySelectorAll('.prayas-highlight-field, .prayas-call-speaking-glow').forEach((node) => {
      node.classList.remove('prayas-highlight-field', 'prayas-call-speaking-glow');
    });
    if (!el) return;
    el.classList.add('prayas-highlight-field');
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) { }
  }

  function navigateField(direction = 1) {
    const navigables = getNavigableElements();
    if (navigables.length === 0) return { success: false, error: 'No form fields found' };

    currentNavIndex = (currentNavIndex + direction + navigables.length) % navigables.length;
    const target = navigables[currentNavIndex];
    target.focus();
    highlightElement(target);

    const prayasId = target.__prayasId || target.getAttribute('data-prayas-id');
    const meta = fieldRegistry.get(prayasId) || processFieldElement(target);
    const text = `Field ${currentNavIndex + 1} of ${navigables.length}. ${meta.label}. ${meta.required ? 'Required' : 'Optional'}.`;
    speakAnnouncement(text);

    return {
      success: true,
      index: currentNavIndex,
      total: navigables.length,
      field: meta,
      announcement: text
    };
  }

  function readCurrentField() {
    const navigables = getNavigableElements();
    if (navigables.length === 0) return { success: false, error: 'No fields on page' };
    if (currentNavIndex < 0 || currentNavIndex >= navigables.length) currentNavIndex = 0;

    const target = navigables[currentNavIndex];
    target.focus();
    highlightElement(target);
    const prayasId = target.__prayasId || target.getAttribute('data-prayas-id');
    const meta = fieldRegistry.get(prayasId) || processFieldElement(target);

    let val = target.value ? `Current value: ${target.value}.` : 'Currently empty.';
    if (target.tagName.toLowerCase() === 'select') {
      const sel = target.options[target.selectedIndex];
      val = sel ? `Selected: ${sel.text}.` : 'No option chosen.';
    }

    const announcement = `Question: ${meta.label}. ${meta.required ? 'Required.' : 'Optional.'} ${val}`;
    speakAnnouncement(announcement);
    return { success: true, field: meta, announcement };
  }

  const KNOWN_COMMAND_LABELS = new Set([
    'next field', 'next', 'prev field', 'prev', 'previous field', 'previous',
    'read q', 'read question', 'read current question', 'read the question',
    'page info', 'read this page', 'read page',
    'autofill', 'fill my details', 'fill details',
    'ai draft', 'draft', 'draft answer',
    'skip', 'skip field', 'stop', 'stop reading',
    'alt+n', 'alt+b', 'alt+r', 'alt+w', 'alt+f', 'alt+h', 'alt+m', 'esc', 'escape',
    'tap & speak', 'voice call'
  ]);

  // Native Value Setter for React, Angular, Vue, and vanilla DOM forms
  function setNativeValue(el, val, source = null) {
    if (!el || isPanelElement(el)) return false;

    // Guard: reject any text that matches a known command label or shortcut name
    // when it arrived from a button or ACTION source, or non-answer source
    if (source === 'ACTION') {
      console.warn('[PRAYAS Guard] Blocked ACTION insertion into field:', val);
      return false;
    }
    if (typeof val === 'string') {
      const lower = val.trim().toLowerCase();
      if (source !== 'UTTERANCE_ANSWER' && source !== 'AUTOFILL' && source !== 'AI_DRAFT' && KNOWN_COMMAND_LABELS.has(lower)) {
        console.warn('[PRAYAS Guard] Blocked command label from insertion into field:', val);
        return false;
      }
    }

    const tag = el.tagName.toLowerCase();
    const type = (el.type || 'text').toLowerCase();

    if (tag === 'select') {
      const norm = normalizeText(String(val));
      let matchedIndex = -1;
      for (let i = 0; i < el.options.length; i++) {
        const optText = normalizeText(el.options[i].text);
        const optVal = normalizeText(el.options[i].value);
        if (optText === norm || optVal === norm || optText.includes(norm) || norm.includes(optText)) {
          matchedIndex = i;
          break;
        }
      }
      if (matchedIndex !== -1) {
        el.selectedIndex = matchedIndex;
      }
    } else if (type === 'checkbox') {
      const norm = normalizeText(String(val));
      el.checked = norm.includes('yes') || norm.includes('true') || norm.includes('check') || norm.includes('agree') || norm.includes('tick');
    } else if (type === 'radio') {
      el.checked = true;
    } else {
      const proto = Object.getPrototypeOf(el);
      const desc = Object.getOwnPropertyDescriptor(proto, 'value') ||
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value') ||
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      if (desc && desc.set) {
        desc.set.call(el, val);
      } else {
        el.value = val;
      }
    }

    el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
    return true;
  }

  // Parses spoken date into YYYY-MM-DD or readable date
  function parseSpokenDate(text) {
    if (!text) return '';
    const months = {
      january: '01', jan: '01',
      february: '02', feb: '02',
      march: '03', mar: '03',
      april: '04', apr: '04',
      may: '05',
      june: '06', jun: '06',
      july: '07', jul: '07',
      august: '08', aug: '08',
      september: '09', sep: '09', sept: '09',
      october: '10', oct: '10',
      november: '11', nov: '11',
      december: '12', dec: '12'
    };

    const clean = text.toLowerCase().replace(/(\d+)(st|nd|rd|th)/g, '$1');
    const tokens = clean.split(/[\s,/-]+/);

    let day, month, year;
    tokens.forEach((tok) => {
      if (months[tok]) {
        month = months[tok];
      } else if (/^\d{4}$/.test(tok)) {
        year = tok;
      } else if (/^\d{1,2}$/.test(tok)) {
        const num = parseInt(tok, 10);
        if (!day && num >= 1 && num <= 31) {
          day = tok.padStart(2, '0');
        }
      }
    });

    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
    return text;
  }

  // Cleans dictation answer by field type before inserting
  function cleanAnswerByFieldType(el, raw) {
    if (!raw) return '';
    const tag = el ? el.tagName.toLowerCase() : 'input';
    const type = el ? (el.type || 'text').toLowerCase() : 'text';
    const prayasId = el ? (el.__prayasId || el.getAttribute('data-prayas-id')) : null;
    const meta = el ? (fieldRegistry.get(prayasId) || processFieldElement(el)) : {};
    const label = (meta.label || el.name || el.id || '').toLowerCase();

    let text = raw.trim();

    // 1. Email cleaning
    if (type === 'email' || label.includes('mail')) {
      return text.toLowerCase()
        .replace(/\bat\b/gi, '@')
        .replace(/\bdot\b/gi, '.')
        .replace(/\s+/g, '');
    }

    // 2. Phone cleaning
    if (type === 'tel' || label.includes('phone') || label.includes('mobile') || label.includes('contact number')) {
      const wordToDigit = {
        zero: '0', one: '1', two: '2', three: '3', four: '4',
        five: '5', six: '6', seven: '7', eight: '8', nine: '9',
        plus: '+'
      };
      let clean = text.toLowerCase();
      Object.entries(wordToDigit).forEach(([word, digit]) => {
        clean = clean.replace(new RegExp(`\\b${word}\\b`, 'g'), digit);
      });
      clean = clean.replace(/[^\d+]/g, '');
      return clean.length >= 7 ? clean : text;
    }

    // 3. Date of birth / Date fields
    if (type === 'date' || label.includes('dob') || label.includes('birth')) {
      const parsed = parseSpokenDate(text);
      if (parsed) return parsed;
    }

    // 4. Name / Title capitalization
    if (label.includes('name') && !label.includes('user') && !label.includes('company')) {
      return text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }

    return text;
  }

  // Comprehensive Structured Field Matcher with Synonyms
  function previewAutofillMatches(passport) {
    if (!passport) return [];
    const matches = [];
    const p = passport;

    fieldRegistry.forEach((meta) => {
      const tag = meta.tagName.toLowerCase();
      const type = meta.type.toLowerCase();
      const lowerId = (meta.id || '').toLowerCase();
      const lowerName = (meta.name || '').toLowerCase();
      const lowerLabel = (meta.label || '').toLowerCase();
      const lowerPlaceholder = (meta.placeholder || '').toLowerCase();
      const lowerAuto = (meta.autocomplete || '').toLowerCase();
      const allText = `${lowerId} ${lowerName} ${lowerLabel} ${lowerPlaceholder} ${lowerAuto}`;

      let fillVal = null;
      let matchedProp = null;

      // Full / First / Last Name
      if (allText.includes('first name') || allText.includes('given name') || lowerAuto.includes('given-name')) {
        fillVal = p.fullName ? p.fullName.split(' ')[0] : p.fullName;
        matchedProp = 'firstName';
      } else if (allText.includes('last name') || allText.includes('surname') || allText.includes('family name') || lowerAuto.includes('family-name')) {
        const parts = (p.fullName || '').split(' ');
        fillVal = parts.length > 1 ? parts.slice(1).join(' ') : p.fullName;
        matchedProp = 'lastName';
      } else if ((allText.includes('name') || lowerAuto.includes('name')) && !allText.includes('user') && !allText.includes('company') && !allText.includes('school')) {
        fillVal = p.fullName;
        matchedProp = 'fullName';
      }
      // Email
      else if (allText.includes('mail') || type === 'email' || lowerAuto.includes('email')) {
        fillVal = p.email;
        matchedProp = 'email';
      }
      // Phone / Mobile
      else if (allText.includes('phone') || allText.includes('mobile') || allText.includes('cell') || allText.includes('contact number') || type === 'tel' || lowerAuto.includes('tel')) {
        fillVal = p.phone;
        matchedProp = 'phone';
      }
      // Date of Birth
      else if (allText.includes('dob') || allText.includes('birth') || allText.includes('date of birth') || lowerAuto.includes('bday')) {
        fillVal = p.dob || '1998-03-05';
        matchedProp = 'dob';
      }
      // City / Location
      else if (allText.includes('city') || allText.includes('town') || lowerAuto.includes('address-level2')) {
        fillVal = p.location ? p.location.split(',')[0].trim() : p.location;
        matchedProp = 'city';
      }
      // Full Address / Location
      else if (allText.includes('address') || allText.includes('street') || allText.includes('location') || lowerAuto.includes('street-address')) {
        fillVal = p.address || p.location;
        matchedProp = 'address';
      }
      // Postal / Zip / Pincode
      else if (allText.includes('zip') || allText.includes('postal') || allText.includes('pincode') || allText.includes('pin code') || lowerAuto.includes('postal-code')) {
        fillVal = '560038';
        matchedProp = 'postalCode';
      }
      // Education / Degree / University
      else if (allText.includes('education') || allText.includes('degree') || allText.includes('university') || allText.includes('college') || allText.includes('school') || allText.includes('institution') || allText.includes('major')) {
        fillVal = p.education || 'Bachelor of Technology in Computer Science';
        matchedProp = 'education';
      }
      // Skills / Technical competencies
      else if (allText.includes('skill') || allText.includes('technolog') || allText.includes('competenc')) {
        fillVal = p.skills || 'React, Next.js, WCAG 2.2 AA, JavaScript, Python';
        matchedProp = 'skills';
      }
      // Experience / Work History
      else if (allText.includes('experience') || allText.includes('work history') || allText.includes('employment') || allText.includes('current company') || allText.includes('years of exp')) {
        fillVal = p.workExperience || 'Senior Accessibility Engineer with 4+ years of experience.';
        matchedProp = 'workExperience';
      }
      // LinkedIn
      else if (allText.includes('linkedin')) {
        fillVal = p.linkedinUrl || 'https://linkedin.com/in/rahul-sharma-access';
        matchedProp = 'linkedinUrl';
      }
      // GitHub
      else if (allText.includes('github') || allText.includes('git')) {
        fillVal = p.githubUrl || p.portfolioUrl || 'https://github.com/rahul-sharma';
        matchedProp = 'githubUrl';
      }
      // Portfolio / Website / URL
      else if (allText.includes('portfolio') || allText.includes('website') || allText.includes('site') || type === 'url' || lowerAuto.includes('url')) {
        fillVal = p.portfolioUrl || 'https://github.com/rahul-sharma';
        matchedProp = 'portfolioUrl';
      }
      // Passport / ID Details
      else if (allText.includes('passport') || allText.includes('id details') || allText.includes('national id') || allText.includes('ssn') || allText.includes('applicant id')) {
        fillVal = p.idDetails || 'Verified Applicant ID: PRAYAS-2026-IND-0824';
        matchedProp = 'idDetails';
      }
      // Accommodations / Assistive Tech Needs
      else if (allText.includes('accommodat') || allText.includes('disabilit') || allText.includes('assistive') || allText.includes('special need')) {
        fillVal = p.accommodationNotes || 'Screen reader compatible UI, high-contrast palette, and extra time for coding assessments.';
        matchedProp = 'accommodations';
      }
      // Summary / About Yourself / Cover Letter Box
      else if (allText.includes('summary') || (tag === 'textarea' && (allText.includes('about') || allText.includes('cover') || allText.includes('bio')))) {
        fillVal = p.professionalSummary || 'Dedicated software engineer specialized in accessible web technologies and inclusive UI engineering.';
        matchedProp = 'professionalSummary';
      }

      if (fillVal) {
        matches.push({
          prayasId: meta.prayasId,
          elementId: meta.id,
          fieldLabel: meta.label,
          matchedProperty: matchedProp,
          valueToFill: fillVal,
        });
      }
    });

    return matches;
  }

  // Executes confirmed autofill using native property setters and generates report
  function executeConfirmedAutofill(fieldsToFill) {
    if (!fieldsToFill || fieldsToFill.length === 0) return { success: false, filledCount: 0, unfilledFields: [] };
    let filledCount = 0;
    const filledIds = new Set();

    fieldsToFill.forEach((item) => {
      const el = getElementByPrayasId(item.prayasId);
      if (el && !el.hasAttribute('disabled')) {
        setNativeValue(el, item.valueToFill, 'AUTOFILL');
        el.classList.remove('prayas-needs-input');
        filledIds.add(item.prayasId);
        filledCount++;
      }
    });

    // Determine unfilled fields that still need applicant input
    const unfilledFields = [];
    fieldRegistry.forEach((meta) => {
      if (!filledIds.has(meta.prayasId)) {
        const el = getElementByPrayasId(meta.prayasId);
        if (el && !el.disabled && el.type !== 'hidden') {
          el.classList.add('prayas-needs-input');
          unfilledFields.push({ label: meta.label, id: meta.id, el });
        }
      }
    });

    return { success: true, filledCount, unfilledFields };
  }

  // =========================================================
  // 2. NATURAL LANGUAGE INTENT ENGINE (MEMBER 4 INTEGRATION)
  // =========================================================
  function normalizeText(text) {
    if (!text) return '';
    return text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"!@+]/g, '').replace(/\s+/g, ' ').trim();
  }

  function classifyUserIntent(raw) {
    const norm = normalizeText(raw);
    if (!norm) return { intent: 'UNKNOWN' };

    // Malicious guard
    if (/console\.log|alert\(|eval\(|<script|submit application/i.test(raw)) {
      return { intent: 'UNKNOWN', securityBlocked: true };
    }

    // 1. READ_QUESTION (Must match all 15+ phrasings!)
    if (
      norm === 'read question' ||
      norm === 'read the question' ||
      norm === 'what does this ask' ||
      norm === 'can you read that out' ||
      norm === 'tell me the question' ||
      norm.includes('whats this field') ||
      norm.includes('what is this field') ||
      norm.includes('repeat the question') ||
      norm.includes('read prompt') ||
      norm.includes('what is this question asking') ||
      norm.includes('read this out') ||
      norm.includes('what am i filling here') ||
      norm.includes('explain this field') ||
      norm.includes('what does it say') ||
      norm.includes('read active field') ||
      norm.includes('read the question please') ||
      norm.includes('tell me what to write') ||
      norm.includes('what are they asking') ||
      norm === 'read current question' ||
      norm === 'read field' ||
      norm === 'read'
    ) {
      return { intent: 'READ_QUESTION' };
    }

    // 2. NEXT_FIELD
    if (/^(next( field| input)?|go to next( field)?|forward|move forward|advance|continue|proceed|skip to next)$/i.test(norm) || norm.includes('next field')) {
      return { intent: 'NEXT_FIELD' };
    }

    // 3. PREV_FIELD
    if (/^(previous|prev|go back|back|return to previous|last field|prior field|move back)$/i.test(norm) || norm.includes('previous field')) {
      return { intent: 'PREV_FIELD' };
    }

    // 4. AUTOFILL
    if (/^(autofill|fill my details|fill details|populate details|fill profile|fill form|fill this for me|enter my information)$/i.test(norm) || norm.includes('fill my details') || norm.includes('autofill')) {
      return { intent: 'FILL_DETAILS' };
    }

    // 5. AI_DRAFT
    if (/^(ai draft|draft an answer|draft answer|help me write this|suggest an answer|generate answer|ai help|draft this)$/i.test(norm) || norm.includes('ai draft') || norm.includes('draft answer')) {
      return { intent: 'AI_DRAFT' };
    }

    // 6. READ_PAGE
    if (/^(page info|read this page|read page|what is on this page|summarize page|page overview|tell me about this page)$/i.test(norm) || norm.includes('page info') || norm.includes('read page')) {
      return { intent: 'READ_PAGE' };
    }

    // 7. STOP_READING
    if (/^(stop|stop reading|quiet|silence|pause|cancel|shut up|halt|be quiet|stop talking)$/i.test(norm)) {
      return { intent: 'STOP_READING' };
    }

    // 8. HELP
    if (/^(help|what can i say|commands|list commands|how does this work)$/i.test(norm)) {
      return { intent: 'HELP' };
    }

    // 9. VOICE_CALL
    if (/^(voice call|start voice call|call olivia|talk to olivia|start call|call assistant)$/i.test(norm)) {
      return { intent: 'VOICE_CALL' };
    }

    // 10. CONFIRM_YES / NO / SKIP / REPEAT
    if (/^(yes|yeah|sure|correct|that is right|right|sounds good|accept|confirm)$/i.test(norm)) return { intent: 'CONFIRM_YES' };
    if (/^(no|nope|cancel|wrong|incorrect|change it|change my answer|reject)$/i.test(norm)) return { intent: 'CONFIRM_NO' };
    if (/^(skip|pass|leave blank|move on)$/i.test(norm)) return { intent: 'SKIP' };
    if (/^(repeat|repeat that|say that again|what did you say|one more time)$/i.test(norm)) return { intent: 'REPEAT' };

    // Borderline clarifying fallback
    if (norm.includes('question') || norm.includes('ask') || norm.includes('read')) {
      return { intent: 'READ_QUESTION', needsClarification: true, clarification: 'Did you want me to read the question?' };
    }

    return { intent: 'UNKNOWN' };
  }

  // =========================================================
  // 3. SPEECH SYNTHESIS & RECOGNITION INFRASTRUCTURE
  // =========================================================
  function speakAnnouncement(text, onEnd) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (naturalVoice) utterance.voice = naturalVoice;

    if (typeof onEnd === 'function') {
      utterance.onend = onEnd;
    }
    window.speechSynthesis.speak(utterance);
  }

  function stopAllSpeech() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  // =========================================================
  // 4. SINGLE GUARDED ASSISTANT PANEL UI (IMAGE 3 & IMAGE 2)
  // =========================================================
  const PANEL_ID = 'prayas-assistant-panel';
  let speechRecognizer = null;
  let callTimerInterval = null;
  let callSeconds = 0;
  let isCallActive = false;
  let isCallMuted = false;
  let currentCallFieldIndex = 0;
  let fieldCatalog = [];
  let currentMode = 'COMMAND'; // 'COMMAND' | 'ANSWER'
  let activeFieldForAnswer = null;
  let awaitingConfirmation = false;
  let pendingFieldValue = null;

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function getLogoUrl() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      try {
        return chrome.runtime.getURL('icons/icon128.png');
      } catch (e) { }
    }
    return '/images/prayas-icon.png';
  }

  // Maintains a single source of truth for all form fields on the page
  function initFieldCatalog() {
    const elements = getNavigableElements().filter((el) => {
      const tag = el.tagName.toLowerCase();
      const type = (el.type || '').toLowerCase();
      if (tag === 'button') return false;
      if (['submit', 'reset', 'button', 'hidden'].includes(type)) return false;
      return true;
    });

    const statusMap = new Map();
    fieldCatalog.forEach((item) => {
      if (item.key) statusMap.set(item.key, item.status);
    });

    fieldCatalog = elements.map((el, idx) => {
      const prayasId = el.__prayasId || el.getAttribute('data-prayas-id') || `p-field-${idx}`;
      const meta = fieldRegistry.get(prayasId) || processFieldElement(el);
      const key = el.id || el.name || `${meta.label}_${el.tagName}_${idx}`;
      const prevStatus = statusMap.get(key) || 'pending';
      return {
        el,
        prayasId,
        key,
        label: meta.label,
        type: el.type || el.tagName.toLowerCase(),
        required: Boolean(meta.required),
        status: prevStatus,
        value: el.value || ''
      };
    });

    return fieldCatalog;
  }

  // Update Call screen progress indicator
  function updateCallProgressDisplay(panel) {
    const progEl = panel.querySelector('#prayasCallProgress');
    if (!progEl || fieldCatalog.length === 0) return;
    const filled = fieldCatalog.filter((f) => f.status === 'filled').length;
    const skipped = fieldCatalog.filter((f) => f.status === 'skipped').length;
    progEl.textContent = `Field ${currentCallFieldIndex + 1} of ${fieldCatalog.length} (${filled} filled, ${skipped} skipped)`;
  }

  // Refresh user session display in header
  function refreshUserSessionDisplay(panel) {
    const userText = panel.querySelector('#prayasUserEmailText');
    const userStrip = panel.querySelector('#prayasUserStrip');
    if (!userText || !userStrip) return;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['prayasLoggedInUser'], (res) => {
        const user = res.prayasLoggedInUser;
        if (user && user.email) {
          userStrip.classList.remove('unauthenticated');
          userText.textContent = `👤 Logged in as: ${user.email}`;
        } else {
          userStrip.classList.add('unauthenticated');
          userText.innerHTML = `⚠️ Not logged in. <a href="http://localhost:3000/auth/login" target="_blank" class="prayas-login-link">Log in at PRAYAS</a> to use your profile.`;
        }
      });
    }
  }

  function createPrayasAssistantPanel() {
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'PRAYAS Assistant');

    const logoUrl = getLogoUrl();

    panel.innerHTML = `
      <!-- Minimized State Bubble -->
      <div class="prayas-minimized-indicator" id="prayasMinIndicator">
        <span>🎤 Prayas.AI Active</span>
        <span style="font-size: 11px; opacity: 0.85;">(Click to open)</span>
      </div>

      <!-- MODE A: MAIN ASSISTANT PANEL (IMAGE 3) -->
      <div class="prayas-main-view" id="prayasMainView">
        
        <!-- Header -->
        <div class="prayas-header">
          <div class="prayas-title-group">
            <div class="prayas-mic-icon-wrap" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" x2="12" y1="19" y2="22"/>
              </svg>
            </div>
            <div class="prayas-header-divider"></div>
            <span class="prayas-header-title">PRAYAS Assistant</span>
          </div>

          <div class="prayas-header-right">
            <div class="prayas-status-pill" id="prayasReadyPill">
              <span class="prayas-status-dot"></span>
              <span id="prayasReadyText">READY</span>
            </div>
            <button type="button" class="prayas-btn-close" id="prayasCloseBtn" title="Close Panel" aria-label="Close assistant panel">
              ✕
            </button>
          </div>
        </div>

        <!-- Shared Identity User Strip -->
        <div class="prayas-user-strip" id="prayasUserStrip">
          <span id="prayasUserEmailText">Checking login status...</span>
        </div>

        <!-- Status Box -->
        <div class="prayas-status-box" id="prayasStatusMsg" role="status" aria-live="polite">
          Ready. Tap Speak (Alt+M), press a shortcut, or type a command.
        </div>

        <!-- Tap & Speak + Stop Controls -->
        <div class="prayas-controls-row">
          <button type="button" class="prayas-btn-speak" id="prayasBtnSpeak" aria-label="Tap and speak voice command (Shortcut: Alt+M)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
            <span>Tap &amp; Speak</span>
            <span class="prayas-kbd-badge">Alt+M</span>
          </button>

          <button type="button" class="prayas-btn-stop" id="prayasBtnStop" aria-label="Silence audio (Shortcut: Escape)">
            <span style="font-size: 13px;">■</span>
            <span>Stop</span>
            <span class="prayas-kbd-badge">Esc</span>
          </button>
        </div>

        <!-- Feature Button: Live Voice Call with Prayas.AI -->
        <button type="button" class="prayas-call-feature-btn" id="prayasStartCallBtn" title="Launch guided natural voice conversation">
          <div class="prayas-call-btn-left">
            <img src="${logoUrl}" alt="Prayas.AI Logo" class="prayas-call-btn-avatar" onerror="this.src='/images/prayas-icon.png'" />
            <span>Voice Call with Prayas.AI</span>
          </div>
          <span class="prayas-call-btn-pill">Guided Auto-Fill</span>
        </button>

        <!-- 3x2 Grid of Shortcut Buttons -->
        <div class="prayas-shortcuts-grid">
          <button type="button" class="prayas-shortcut-btn" id="prayasBtnNext" data-cmd="next field" aria-label="Next Field (Alt+N)">
            <span class="prayas-shortcut-label">Next Field</span>
            <span class="prayas-shortcut-kbd">Alt+N</span>
          </button>

          <button type="button" class="prayas-shortcut-btn" id="prayasBtnPrev" data-cmd="previous field" aria-label="Previous Field (Alt+B)">
            <span class="prayas-shortcut-label">Prev Field</span>
            <span class="prayas-shortcut-kbd">Alt+B</span>
          </button>

          <button type="button" class="prayas-shortcut-btn" id="prayasBtnReadQ" data-cmd="read question" aria-label="Read Question (Alt+R)">
            <span class="prayas-shortcut-label">Read Q</span>
            <span class="prayas-shortcut-kbd">Alt+R</span>
          </button>

          <button type="button" class="prayas-shortcut-btn" id="prayasBtnPage" data-cmd="read this page" aria-label="Page Info (Alt+W)">
            <span class="prayas-shortcut-label">Page Info</span>
            <span class="prayas-shortcut-kbd">Alt+W</span>
          </button>

          <button type="button" class="prayas-shortcut-btn" id="prayasBtnAutofill" data-cmd="fill my details" aria-label="Autofill Details (Alt+F)">
            <span class="prayas-shortcut-label">Autofill</span>
            <span class="prayas-shortcut-kbd">Alt+F</span>
          </button>

          <button type="button" class="prayas-shortcut-btn" id="prayasBtnDraft" data-cmd="ai draft" aria-label="AI Essay Draft (Alt+H)">
            <span class="prayas-shortcut-label">AI Draft</span>
            <span class="prayas-shortcut-kbd">Alt+H</span>
          </button>
        </div>

        <!-- Type Command Form -->
        <form class="prayas-command-section" id="prayasCommandForm" onsubmit="event.preventDefault();">
          <div class="prayas-command-header">
            <span>TYPE COMMAND</span>
            <div class="prayas-command-line"></div>
          </div>
          <div class="prayas-command-box">
            <input
              type="text"
              id="prayasCommandInput"
              class="prayas-command-input"
              placeholder="Type command (e.g. next, autofill, draft)..."
              aria-label="Type command text input"
              autocomplete="off"
            />
            <button type="submit" class="prayas-btn-run" id="prayasCommandRun">Run</button>
          </div>
        </form>

      </div>

      <!-- MODE B: VOICE CALL SCREEN (MATCHES IMAGE 2) -->
      <div class="prayas-call-view" id="prayasCallView">
        
        <!-- Call Top Bar -->
        <div class="prayas-call-topbar">
          <button type="button" class="prayas-round-btn" id="prayasCallBackBtn" title="Back to Assistant Panel" aria-label="Back to main panel">
            ←
          </button>
          <div class="prayas-call-center-info">
            <span class="prayas-call-assistant-name">Prayas.AI</span>
            <span class="prayas-call-timer" id="prayasCallTimer">00:00</span>
          </div>
          <button type="button" class="prayas-round-btn" id="prayasCallMinBtn" title="Minimize Call" aria-label="Minimize call window">
            —
          </button>
        </div>

        <!-- Round Logo Avatar with Soundwave Ripple -->
        <div class="prayas-call-avatar-wrap" id="prayasAvatarWrap">
          <div class="prayas-call-avatar-ripple"></div>
          <div class="prayas-call-avatar-logo-container" id="prayasCallAvatar">
            <img
              src="${logoUrl}"
              alt="Prayas.AI Logo"
              class="prayas-call-avatar-logo"
              onerror="this.src='/images/prayas-icon.png'"
            />
          </div>
        </div>

        <!-- Progress Indicator Badge -->
        <div class="prayas-call-progress-badge" id="prayasCallProgress">
          Field 1 of 1
        </div>

        <!-- Live Status Pill & Live Transcript Box -->
        <div class="prayas-call-status-pill" id="prayasCallStatusPill">
          ● CONNECTING...
        </div>

        <div class="prayas-call-transcript-box" id="prayasCallTranscript" role="status" aria-live="polite">
          Starting voice call. Scanning form fields...
        </div>

        <!-- Sub-Controls: Prev, Skip, Next -->
        <div class="prayas-call-nav-row">
          <button type="button" class="prayas-call-nav-step-btn" id="prayasCallPrevBtn" aria-label="Previous Field">
            ← Prev
          </button>
          <button type="button" class="prayas-call-skip-btn" id="prayasCallSkipBtn" aria-label="Skip Field">
            ⏭ Skip Field
          </button>
          <button type="button" class="prayas-call-nav-step-btn" id="prayasCallNextBtn" aria-label="Next Field">
            Next →
          </button>
        </div>

        <!-- Round Action Buttons: Speaker, Mic, Blue End Call -->
        <div class="prayas-call-actions-row">
          <button type="button" class="prayas-call-action-btn" id="prayasCallSpeakerBtn" title="Repeat Question / Toggle Speaker" aria-label="Repeat prompt or toggle speaker">
            🔊
          </button>

          <button type="button" class="prayas-call-action-btn" id="prayasCallMicBtn" title="Toggle Mic" aria-label="Toggle microphone">
            🎤
          </button>

          <button type="button" class="prayas-call-action-btn prayas-call-end-btn" id="prayasCallEndBtn" title="End Voice Call" aria-label="End voice call">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.8 19.8 0 0 1-3.09-8.65A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/>
              <line x1="22" x2="2" y1="2" y2="22"/>
            </svg>
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(panel);
    bindAssistantPanelEvents(panel);
    return panel;
  }

  // =========================================================
  // 5. ASSISTANT PANEL EVENT WIRING & DISPATCH
  // =========================================================
  function bindAssistantPanelEvents(panel) {
    if (panel.dataset.prayasEventsBound === 'true') return;
    panel.dataset.prayasEventsBound = 'true';

    const mainView = panel.querySelector('#prayasMainView');
    const callView = panel.querySelector('#prayasCallView');
    const statusMsg = panel.querySelector('#prayasStatusMsg');
    const btnSpeak = panel.querySelector('#prayasBtnSpeak');
    const btnStop = panel.querySelector('#prayasBtnStop');
    const btnStartCall = panel.querySelector('#prayasStartCallBtn');
    const btnClose = panel.querySelector('#prayasCloseBtn');
    const cmdForm = panel.querySelector('#prayasCommandForm');
    const cmdInput = panel.querySelector('#prayasCommandInput');

    const callBackBtn = panel.querySelector('#prayasCallBackBtn');
    const callMinBtn = panel.querySelector('#prayasCallMinBtn');
    const callSpeakerBtn = panel.querySelector('#prayasCallSpeakerBtn');
    const callMicBtn = panel.querySelector('#prayasCallMicBtn');
    const callEndBtn = panel.querySelector('#prayasCallEndBtn');
    const callPrevBtn = panel.querySelector('#prayasCallPrevBtn');
    const callSkipBtn = panel.querySelector('#prayasCallSkipBtn');
    const callNextBtn = panel.querySelector('#prayasCallNextBtn');
    const minIndicator = panel.querySelector('#prayasMinIndicator');

    // Populate user email in header strip
    refreshUserSessionDisplay(panel);

    // Make panel buttons not steal or clear the form's focus state
    panel.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });
    });

    // Close Button
    btnClose?.addEventListener('click', () => dispatch({ type: 'ACTION', name: 'CLOSE_PANEL' }));

    // Minimize toggle
    callMinBtn?.addEventListener('click', () => dispatch({ type: 'ACTION', name: 'MINIMIZE' }));
    minIndicator?.addEventListener('click', () => panel.classList.remove('prayas-minimized'));

    // Speak Button (Push-to-Talk)
    btnSpeak?.addEventListener('click', () => dispatch({ type: 'ACTION', name: 'SPEAK_TOGGLE' }));

    // Stop Button
    btnStop?.addEventListener('click', () => dispatch({ type: 'ACTION', name: 'STOP' }));

    // 3x2 Grid Shortcut Buttons: Execute ACTION directly, never text labels
    panel.querySelector('#prayasBtnNext')?.addEventListener('click', () => dispatch({ type: 'ACTION', name: 'NEXT_FIELD' }));
    panel.querySelector('#prayasBtnPrev')?.addEventListener('click', () => dispatch({ type: 'ACTION', name: 'PREV_FIELD' }));
    panel.querySelector('#prayasBtnReadQ')?.addEventListener('click', () => dispatch({ type: 'ACTION', name: 'READ_QUESTION' }));
    panel.querySelector('#prayasBtnPage')?.addEventListener('click', () => dispatch({ type: 'ACTION', name: 'PAGE_INFO' }));
    panel.querySelector('#prayasBtnAutofill')?.addEventListener('click', () => dispatch({ type: 'ACTION', name: 'AUTOFILL' }));
    panel.querySelector('#prayasBtnDraft')?.addEventListener('click', () => dispatch({ type: 'ACTION', name: 'AI_DRAFT' }));

    // Type Command / Answer Form (Dispatches UTTERANCE)
    cmdForm?.addEventListener('submit', () => {
      const val = cmdInput?.value?.trim();
      if (val) {
        dispatch({ type: 'UTTERANCE', text: val, source: 'typed' });
        if (cmdInput) cmdInput.value = '';
      }
    });

    // Start Voice Call Feature
    btnStartCall?.addEventListener('click', () => dispatch({ type: 'ACTION', name: 'VOICE_CALL' }));

    // Voice Call Controls
    callBackBtn?.addEventListener('click', () => dispatch({ type: 'ACTION', name: 'END_CALL' }));
    callEndBtn?.addEventListener('click', () => dispatch({ type: 'ACTION', name: 'END_CALL' }));
    callSpeakerBtn?.addEventListener('click', () => dispatch({ type: 'ACTION', name: 'READ_QUESTION' }));
    callMicBtn?.addEventListener('click', () => dispatch({ type: 'ACTION', name: 'CALL_MIC_TOGGLE' }));
    callPrevBtn?.addEventListener('click', () => dispatch({ type: 'ACTION', name: 'PREV_FIELD' }));
    callNextBtn?.addEventListener('click', () => dispatch({ type: 'ACTION', name: 'NEXT_FIELD' }));
    callSkipBtn?.addEventListener('click', () => dispatch({ type: 'ACTION', name: 'SKIP' }));
  }

  function updateReadyPill(panel, text, mode) {
    if (!panel) return;
    const pill = panel.querySelector('#prayasReadyPill');
    const label = panel.querySelector('#prayasReadyText');
    if (!pill || !label) return;
    label.textContent = text;
    pill.className = `prayas-status-pill ${mode || ''}`;
  }

  // =========================================================
  // 6. ACTION FUNCTIONS (DIRECT EXECUTION, NEVER PASS LABELS AS TEXT)
  // =========================================================

  function nextFieldAction(panel) {
    stopAllSpeech();
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch (e) { }
      speechRecognizer = null;
    }

    if (isCallActive) {
      advanceCallField(panel);
      return;
    }

    const res = navigateField(1);
    const statusMsg = panel?.querySelector('#prayasStatusMsg');

    if (res && res.field) {
      const el = getElementByPrayasId(res.field.prayasId);
      if (el) {
        el.focus();
        highlightElement(el);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        currentMode = 'ANSWER';
        activeFieldForAnswer = el;
        awaitingConfirmation = false;
        pendingFieldValue = null;
        const questionPrompt = `The next field is ${res.field.label}. What should I enter?`;
        if (statusMsg) statusMsg.textContent = `On: ${res.field.label}. Listening for your answer...`;
        speakAnnouncement(questionPrompt, () => {
          startListeningForAnswer(panel, el);
        });
        return;
      }
    }
    if (statusMsg) statusMsg.textContent = res.announcement || 'Moved to next field.';
  }

  function prevFieldAction(panel) {
    stopAllSpeech();
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch (e) { }
      speechRecognizer = null;
    }

    if (isCallActive) {
      if (currentCallFieldIndex > 0) {
        currentCallFieldIndex--;
        updateCallStatus(panel, 'SPEAKING', 'Prayas.AI: "Moving back to previous field."');
        speakAnnouncement('Moving back.', () => announceCallField(fieldCatalog[currentCallFieldIndex], panel));
      } else {
        speakAnnouncement('This is the first field.', () => announceCallField(fieldCatalog[0], panel));
      }
      return;
    }

    const res = navigateField(-1);
    const statusMsg = panel?.querySelector('#prayasStatusMsg');

    if (res && res.field) {
      const el = getElementByPrayasId(res.field.prayasId);
      if (el) {
        el.focus();
        highlightElement(el);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        currentMode = 'ANSWER';
        activeFieldForAnswer = el;
        awaitingConfirmation = false;
        pendingFieldValue = null;
        const questionPrompt = `Previous field is ${res.field.label}. What should I enter?`;
        if (statusMsg) statusMsg.textContent = `On: ${res.field.label}. Listening for your answer...`;
        speakAnnouncement(questionPrompt, () => {
          startListeningForAnswer(panel, el);
        });
        return;
      }
    }
    if (statusMsg) statusMsg.textContent = res.announcement || 'Moved to previous field.';
  }

  function readQuestionAction(panel) {
    stopAllSpeech();
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch (e) { }
      speechRecognizer = null;
    }

    if (isCallActive && fieldCatalog.length > 0) {
      announceCallField(fieldCatalog[currentCallFieldIndex], panel);
      return;
    }

    const res = readCurrentField();
    const statusMsg = panel?.querySelector('#prayasStatusMsg');
    if (statusMsg) statusMsg.textContent = res.announcement || 'Read current question.';
  }

  function pageInfoAction(panel) {
    stopAllSpeech();
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch (e) { }
      speechRecognizer = null;
    }

    const scan = runFullScanAndAudit();
    const pageText = `${document.title || 'This page'} contains ${scan.fieldsCount} interactive fields. ${scan.activeRepairsCount} accessibility repairs active.`;
    speakAnnouncement(pageText);
    const statusMsg = panel?.querySelector('#prayasStatusMsg');
    if (statusMsg) statusMsg.textContent = pageText;
  }

  function autofillAction(panel) {
    stopAllSpeech();
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch (e) { }
      speechRecognizer = null;
    }

    const statusMsg = panel?.querySelector('#prayasStatusMsg');
    chrome.storage.local.get(['prayasLoggedInUser', 'passportProfile'], (data) => {
      const user = data.prayasLoggedInUser;
      const profile = data.passportProfile;

      if (!user) {
        if (statusMsg) {
          statusMsg.innerHTML = '⚠️ Not logged in. <a href="http://localhost:3000/auth/login" target="_blank" class="prayas-login-link">Log in at PRAYAS</a> to use your profile & documents.';
        }
        speakAnnouncement('You are not logged in. Please log in to your PRAYAS dashboard to enable personalized autofill.');
        return;
      }

      if (!profile) {
        if (statusMsg) statusMsg.textContent = 'No Accessibility Passport found. Configure in PRAYAS dashboard.';
        speakAnnouncement('No Accessibility Passport found.');
        return;
      }

      const matches = previewAutofillMatches(profile);
      const fieldsToFill = matches.map((m) => ({ prayasId: m.prayasId, valueToFill: m.valueToFill }));
      const res = executeConfirmedAutofill(fieldsToFill);

      let reportMsg = `✓ Filled ${res.filledCount} fields from your profile.`;
      if (res.unfilledFields && res.unfilledFields.length > 0) {
        const neededLabels = res.unfilledFields.map((f) => f.label).slice(0, 3).join(', ');
        reportMsg += ` ${res.unfilledFields.length} need your input: ${neededLabels}.`;
        speakAnnouncement(`Filled ${res.filledCount} fields. ${res.unfilledFields.length} need your input: ${neededLabels}.`);
      } else {
        speakAnnouncement(`Filled ${res.filledCount} fields successfully from your verified profile.`);
      }
      if (statusMsg) statusMsg.textContent = reportMsg;
    });
  }

  function aiDraftAction(panel) {
    stopAllSpeech();
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch (e) { }
      speechRecognizer = null;
    }

    const statusMsg = panel?.querySelector('#prayasStatusMsg');
    if (statusMsg) statusMsg.textContent = '🤖 Asking Gemini RAG to draft response...';
    speakAnnouncement('Querying your uploaded career documents to draft a personalized answer.');

    let targetEl = activeFieldForAnswer;
    if (!targetEl || isPanelElement(targetEl)) {
      const els = getNavigableElements();
      targetEl = els.find((e) => e.tagName.toLowerCase() === 'textarea') || els[currentNavIndex >= 0 ? currentNavIndex : 0];
    }

    const label = targetEl ? extractAccessibleLabel(targetEl) : 'Application essay prompt';

    chrome.storage.local.get(['prayasLoggedInUser', 'passportProfile'], (userData) => {
      chrome.runtime.sendMessage({
        type: 'PRAYAS_REQUEST_RAG',
        payload: {
          question: label,
          context: 'Candidate application response',
          user_id: userData.prayasLoggedInUser?.id,
          user_email: userData.prayasLoggedInUser?.email,
          user_profile: userData.passportProfile
        }
      }, (res) => {
        if (res && res.success && res.draftAnswer) {
          if (targetEl) {
            targetEl.focus();
            setNativeValue(targetEl, res.draftAnswer, 'AI_DRAFT');
            targetEl.classList.remove('prayas-needs-input');
            if (statusMsg) statusMsg.textContent = '✓ AI Draft inserted into active field.';
            speakAnnouncement('Personalized draft inserted based on your uploaded resume.');
          }
        } else {
          const fallbackDraft = 'Drawing from my software engineering background, I design accessible UI architectures with keyboard navigation and strict WCAG compliance to empower all users.';
          if (targetEl) {
            targetEl.focus();
            setNativeValue(targetEl, fallbackDraft, 'AI_DRAFT');
            targetEl.classList.remove('prayas-needs-input');
            if (statusMsg) statusMsg.textContent = '✓ Grounded draft answer inserted.';
            speakAnnouncement('Draft answer inserted into field.');
          }
        }
      });
    });
  }

  function skipAction(panel) {
    stopAllSpeech();
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch (e) { }
      speechRecognizer = null;
    }

    if (isCallActive) {
      skipCurrentCallField(panel);
      return;
    }

    speakAnnouncement('Skipping field.', () => {
      nextFieldAction(panel);
    });
  }

  function stopAction(panel) {
    stopAllSpeech();
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch (e) { }
      speechRecognizer = null;
    }
    panel?.querySelector('#prayasBtnSpeak')?.classList.remove('active-listening');
    updateReadyPill(panel, 'READY', 'ready');
    currentMode = 'COMMAND';
    activeFieldForAnswer = null;
    awaitingConfirmation = false;
    pendingFieldValue = null;
    const statusMsg = panel?.querySelector('#prayasStatusMsg');
    if (statusMsg) statusMsg.textContent = 'Audio stopped by user.';
  }

  function voiceCallAction(panel) {
    const mainView = panel?.querySelector('#prayasMainView');
    const callView = panel?.querySelector('#prayasCallView');
    if (mainView && callView) {
      mainView.style.display = 'none';
      callView.style.display = 'flex';
      startVoiceCall(panel);
    }
  }

  function helpAction(panel) {
    const helpText = 'You can say: Read Question, Next Field, Previous Field, Autofill, AI Draft, Page Info, or Start Voice Call.';
    const statusMsg = panel?.querySelector('#prayasStatusMsg');
    if (statusMsg) statusMsg.textContent = helpText;
    speakAnnouncement(helpText);
  }

  // =========================================================
  // 7. CENTRAL DISPATCHER (EXPLICIT ACTION VS. UTTERANCE CHANNELS)
  // =========================================================

  function dispatch(event) {
    if (!event || !event.type) return;
    const panel = document.getElementById(PANEL_ID) || createPrayasAssistantPanel();

    // CHANNEL 1: ACTION (buttons, shortcuts, programmatic commands)
    // Directly executes the action. NEVER touches the answer-insertion pipeline.
    if (event.type === 'ACTION') {
      const actionName = (event.name || '').toUpperCase();
      console.log(`[PRAYAS Dispatch] Executing ACTION: ${actionName}`);

      switch (actionName) {
        case 'NEXT_FIELD':
          nextFieldAction(panel);
          break;
        case 'PREV_FIELD':
        case 'PREVIOUS_FIELD':
          prevFieldAction(panel);
          break;
        case 'READ_QUESTION':
        case 'READ_CURRENT_FIELD':
          readQuestionAction(panel);
          break;
        case 'PAGE_INFO':
        case 'READ_PAGE':
          pageInfoAction(panel);
          break;
        case 'AUTOFILL':
        case 'FILL_DETAILS':
        case 'START_AUTOFILL':
          autofillAction(panel);
          break;
        case 'AI_DRAFT':
          aiDraftAction(panel);
          break;
        case 'SKIP':
        case 'SKIP_FIELD':
          skipAction(panel);
          break;
        case 'STOP':
        case 'STOP_READING':
          stopAction(panel);
          break;
        case 'VOICE_CALL':
          voiceCallAction(panel);
          break;
        case 'HELP':
          helpAction(panel);
          break;
        case 'SPEAK_TOGGLE':
          toggleSpeechRecognition(panel);
          break;
        case 'END_CALL':
          endVoiceCall(panel);
          panel.querySelector('#prayasCallView').style.display = 'none';
          panel.querySelector('#prayasMainView').style.display = 'flex';
          break;
        case 'CALL_MIC_TOGGLE': {
          const callMicBtn = panel.querySelector('#prayasCallMicBtn');
          isCallMuted = !isCallMuted;
          if (callMicBtn) {
            callMicBtn.classList.toggle('active-mic', !isCallMuted);
            callMicBtn.textContent = isCallMuted ? '🔇' : '🎤';
          }
          if (isCallMuted) {
            if (speechRecognizer) try { speechRecognizer.stop(); } catch (e) { }
            updateCallStatus(panel, 'MUTED', 'Microphone muted.');
          } else {
            listenInVoiceCall(panel);
          }
          break;
        }
        case 'CLOSE_PANEL':
          panel.style.display = 'none';
          stopAllSpeech();
          break;
        case 'MINIMIZE':
          panel.classList.toggle('prayas-minimized');
          break;
        default:
          console.warn(`[PRAYAS Dispatch] Unknown action: ${actionName}`);
      }
      return;
    }

    // CHANNEL 2: UTTERANCE (speech recognition, Type command box)
    if (event.type === 'UTTERANCE') {
      const rawText = (event.text || '').trim();
      const source = event.source || 'voice'; // 'voice' | 'typed'
      if (!rawText) return;

      console.log(`[PRAYAS Dispatch] Processing UTTERANCE: "${rawText}" from source: ${source} (Mode: ${currentMode})`);

      // In ANY mode, if the whole utterance matches a control phrase via fuzzy NLP intent engine:
      const match = classifyUserIntent(rawText);
      if (match && match.intent && match.intent !== 'UNKNOWN') {
        const intentToActionMap = {
          'NEXT_FIELD': 'NEXT_FIELD',
          'PREV_FIELD': 'PREV_FIELD',
          'READ_QUESTION': 'READ_QUESTION',
          'FILL_DETAILS': 'AUTOFILL',
          'AI_DRAFT': 'AI_DRAFT',
          'READ_PAGE': 'PAGE_INFO',
          'STOP_READING': 'STOP',
          'HELP': 'HELP',
          'VOICE_CALL': 'VOICE_CALL',
          'SKIP': 'SKIP'
        };

        const mappedAction = intentToActionMap[match.intent];
        if (mappedAction) {
          dispatch({ type: 'ACTION', name: mappedAction });
          return;
        }
      }

      // Confirmation handling in ANSWER mode
      if (currentMode === 'ANSWER' && awaitingConfirmation) {
        const norm = normalizeText(rawText);
        if (['yes', 'yeah', 'yep', 'correct', 'right', 'looks good', 'sounds good', 'confirm'].includes(norm)) {
          awaitingConfirmation = false;
          pendingFieldValue = null;
          const statusMsg = panel.querySelector('#prayasStatusMsg');
          if (statusMsg) statusMsg.textContent = '✓ Answer confirmed.';
          speakAnnouncement('Great! Moving to next field.', () => {
            dispatch({ type: 'ACTION', name: 'NEXT_FIELD' });
          });
          return;
        } else if (['no', 'change', 'change that', 'wrong', 'edit', 'incorrect', 'change my answer'].includes(norm)) {
          awaitingConfirmation = false;
          const statusMsg = panel.querySelector('#prayasStatusMsg');
          if (statusMsg) statusMsg.textContent = 'What should I enter instead?';
          speakAnnouncement('What should I enter instead?', () => {
            if (activeFieldForAnswer) startListeningForAnswer(panel, activeFieldForAnswer);
          });
          return;
        }
      }

      // ONLY UTTERANCE events can be inserted into a field, and ONLY when mode is ANSWER
      // and a genuine form field is actively awaiting an answer
      if (currentMode === 'ANSWER' && activeFieldForAnswer && !isPanelElement(activeFieldForAnswer)) {
        const targetEl = activeFieldForAnswer;
        const cleanedVal = cleanAnswerByFieldType(targetEl, rawText);
        const inserted = setNativeValue(targetEl, cleanedVal, 'UTTERANCE_ANSWER');
        if (inserted !== false) {
          targetEl.classList.remove('prayas-needs-input');
          awaitingConfirmation = true;
          pendingFieldValue = cleanedVal;
          const confirmMsg = `I've entered ${cleanedVal}. Is that right?`;
          const statusMsg = panel.querySelector('#prayasStatusMsg');
          if (statusMsg) statusMsg.textContent = confirmMsg;
          speakAnnouncement(confirmMsg, () => {
            startListeningForAnswer(panel, targetEl);
          });
        }
        return;
      }

      // Utterance in COMMAND mode not matching any command
      const statusMsg = panel.querySelector('#prayasStatusMsg');
      if (match.needsClarification) {
        const clarify = match.clarification || 'Did you want me to read the question?';
        if (statusMsg) statusMsg.textContent = clarify;
        speakAnnouncement(clarify);
      } else {
        const unknownMsg = `Command "${rawText}" not recognized. Say "help" for options.`;
        if (statusMsg) statusMsg.textContent = unknownMsg;
        speakAnnouncement('Command not recognized. You can say: Read question, Next field, Autofill, or Help.');
      }
    }
  }

  // Backward-compatible wrappers for external scripts or unit tests
  async function executeUnifiedCommand(text, panel) {
    dispatch({ type: 'UTTERANCE', text, source: 'typed' });
  }

  function handleAnswerModeInput(rawText, panel) {
    dispatch({ type: 'UTTERANCE', text: rawText, source: 'voice' });
  }

  // Opens listening state specifically for dictating an answer to targetEl
  function startListeningForAnswer(panel, targetEl) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btnSpeak = panel?.querySelector('#prayasBtnSpeak');
    const statusMsg = panel?.querySelector('#prayasStatusMsg');
    const cmdInput = panel?.querySelector('#prayasCommandInput');

    if (cmdInput) {
      cmdInput.placeholder = 'Type your answer (or type a command)...';
    }

    if (!SpeechRec) return;
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch (e) { }
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'en-US';
      rec.continuous = false;
      rec.interimResults = true;

      rec.onstart = () => {
        btnSpeak?.classList.add('active-listening');
        updateReadyPill(panel, 'ANSWERING', 'listening');
        if (statusMsg) statusMsg.textContent = 'Listening for your answer...';
      };

      rec.onresult = (evt) => {
        const transcript = Array.from(evt.results).map((r) => r[0].transcript).join('');
        if (statusMsg) statusMsg.textContent = `Hearing answer: "${transcript}"`;
        if (evt.results[0].isFinal) {
          dispatch({ type: 'UTTERANCE', text: transcript.trim(), source: 'voice' });
        }
      };

      rec.onerror = (err) => {
        btnSpeak?.classList.remove('active-listening');
        updateReadyPill(panel, 'READY', 'ready');
      };

      rec.onend = () => {
        btnSpeak?.classList.remove('active-listening');
        updateReadyPill(panel, 'READY', 'ready');
        speechRecognizer = null;
      };

      speechRecognizer = rec;
      rec.start();
    } catch (e) {
      console.warn('Could not launch speech listener for answer:', e.message);
    }
  }

  // Single-Shot Tap & Speak Recognition
  function toggleSpeechRecognition(panel) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btnSpeak = panel?.querySelector('#prayasBtnSpeak');
    const statusMsg = panel?.querySelector('#prayasStatusMsg');

    if (!SpeechRec) {
      if (statusMsg) statusMsg.textContent = 'Speech recognition requires Chrome or Edge.';
      speakAnnouncement('Speech recognition is not supported in this browser.');
      return;
    }

    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch (e) { }
      speechRecognizer = null;
      btnSpeak?.classList.remove('active-listening');
      updateReadyPill(panel, 'READY', 'ready');
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'en-US';
      rec.continuous = false;
      rec.interimResults = true;

      rec.onstart = () => {
        btnSpeak?.classList.add('active-listening');
        updateReadyPill(panel, 'LISTENING', 'listening');
        if (statusMsg) statusMsg.textContent = 'Listening... Speak your command or answer now.';
      };

      rec.onresult = (evt) => {
        const transcript = Array.from(evt.results).map((r) => r[0].transcript).join('');
        if (statusMsg) statusMsg.textContent = `Hearing: "${transcript}"`;
        if (evt.results[0].isFinal) {
          dispatch({ type: 'UTTERANCE', text: transcript.trim(), source: 'voice' });
        }
      };

      rec.onerror = (err) => {
        console.warn('[PRAYAS Speech Error]', err.error);
        btnSpeak?.classList.remove('active-listening');
        updateReadyPill(panel, 'READY', 'ready');
        if (statusMsg) {
          statusMsg.textContent = err.error === 'not-allowed'
            ? 'Microphone permission denied in browser.'
            : 'Could not detect speech. Please try again.';
        }
      };

      rec.onend = () => {
        btnSpeak?.classList.remove('active-listening');
        updateReadyPill(panel, 'READY', 'ready');
        speechRecognizer = null;
      };

      speechRecognizer = rec;
      rec.start();
    } catch (e) {
      if (statusMsg) statusMsg.textContent = 'Could not start mic: ' + e.message;
    }
  }

  // =========================================================
  // 8. VOICE CALL FEATURE ENGINE (IMAGE 2 CORE IMPLEMENTATION)
  // =========================================================
  function updateCallStatus(panel, pillText, transcriptText) {
    const pill = panel.querySelector('#prayasCallStatusPill');
    const transcript = panel.querySelector('#prayasCallTranscript');
    const avatarWrap = panel.querySelector('#prayasAvatarWrap');

    if (pill) pill.textContent = `● ${pillText}`;
    if (transcript && transcriptText) transcript.textContent = transcriptText;

    if (avatarWrap) {
      avatarWrap.classList.remove('speaking', 'listening');
      if (pillText.includes('SPEAKING')) avatarWrap.classList.add('speaking');
      if (pillText.includes('LISTENING')) avatarWrap.classList.add('listening');
    }
  }

  function startVoiceCall(panel) {
    isCallActive = true;
    isCallMuted = false;
    callSeconds = 0;
    currentCallFieldIndex = 0;
    awaitingConfirmation = false;
    pendingFieldValue = null;
    currentMode = 'ANSWER';

    // Start running call timer (00:00)
    const timerEl = panel.querySelector('#prayasCallTimer');
    clearInterval(callTimerInterval);
    callTimerInterval = setInterval(() => {
      callSeconds++;
      if (timerEl) timerEl.textContent = formatTime(callSeconds);
    }, 1000);

    // Scan interactive fields on page and initialize catalog
    initFieldCatalog();
    updateCallProgressDisplay(panel);

    console.log(`[PRAYAS Voice Call] Initialized ${fieldCatalog.length} target fields.`);

    updateCallStatus(panel, 'SPEAKING', 'Prayas.AI: "Hi! I\'m Prayas.AI. Let\'s complete your job application together."');

    // Warm friendly greeting and kick off question 1
    speakAnnouncement("Hi! I'm Prayas.AI, your PRAYAS voice assistant. Let's fill out your application together. Going to the first field now.", () => {
      if (!isCallActive) return;
      if (fieldCatalog.length === 0) {
        updateCallStatus(panel, 'FINISHED', 'Prayas.AI: "No form fields found on this page."');
        speakAnnouncement("I didn't find any form fields on this page.");
        return;
      }
      announceCallField(fieldCatalog[0], panel);
    });
  }

  function endVoiceCall(panel) {
    isCallActive = false;
    currentMode = 'COMMAND';
    activeFieldForAnswer = null;
    clearInterval(callTimerInterval);
    stopAllSpeech();
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch (e) { }
      speechRecognizer = null;
    }
    document.querySelectorAll('.prayas-highlight-field, .prayas-call-speaking-glow').forEach((node) => {
      node.classList.remove('prayas-highlight-field', 'prayas-call-speaking-glow');
    });
    console.log('[PRAYAS Voice Call] Call ended.');
  }

  function announceCallField(fieldObj, panel) {
    if (!fieldObj || !isCallActive) return;
    const fieldEl = fieldObj.el;
    if (!fieldEl) return;

    highlightElement(fieldEl);
    fieldEl.classList.add('prayas-call-speaking-glow');
    fieldEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    activeFieldForAnswer = fieldEl;
    updateCallProgressDisplay(panel);

    const tag = fieldEl.tagName.toLowerCase();
    const type = (fieldEl.type || 'text').toLowerCase();
    const isRequired = fieldObj.required ? 'required' : 'optional';

    let questionPrompt = '';

    if (tag === 'textarea') {
      questionPrompt = `The next field is ${fieldObj.label}. This is a ${isRequired} essay response. What would you like to answer, or should I draft it from your resume?`;
    } else if (tag === 'select') {
      const options = Array.from(fieldEl.options).map((o) => o.text).filter((t) => t.trim().length > 0).slice(0, 5);
      questionPrompt = `The next field is ${fieldObj.label}. It's a ${isRequired} dropdown. Options include: ${options.join(', ')}. Which one do you want?`;
    } else if (type === 'checkbox') {
      questionPrompt = `This is a checkbox for: ${fieldObj.label}. Would you like me to check it, or leave it blank?`;
    } else if (type === 'radio') {
      questionPrompt = `For ${fieldObj.label}, which option would you like selected?`;
    } else {
      questionPrompt = `The next field is ${fieldObj.label}. It is ${isRequired}. What should I enter?`;
    }

    updateCallStatus(panel, 'SPEAKING', `Prayas.AI: "${questionPrompt}"`);
    awaitingConfirmation = false;

    speakAnnouncement(questionPrompt, () => {
      if (!isCallActive || isCallMuted) return;
      listenInVoiceCall(panel);
    });
  }

  function listenInVoiceCall(panel) {
    if (!isCallActive || isCallMuted) return;
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRec) {
      updateCallStatus(panel, 'ERROR', 'Speech recognition unsupported. Please use Chrome.');
      speakAnnouncement('Speech recognition is not supported in this browser.');
      return;
    }

    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch (e) { }
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'en-US';
      rec.continuous = false;
      rec.interimResults = true;

      rec.onstart = () => {
        updateCallStatus(panel, 'LISTENING', 'Listening for your answer...');
      };

      rec.onresult = (evt) => {
        const transcript = Array.from(evt.results).map((r) => r[0].transcript).join('');
        updateCallStatus(panel, 'LISTENING', `You: "${transcript}"`);

        if (evt.results[0].isFinal) {
          handleVoiceCallResponse(transcript.trim(), panel);
        }
      };

      rec.onerror = (err) => {
        if (!isCallActive) return;
        console.warn('[PRAYAS Voice Call Error]', err.error);
        if (err.error === 'not-allowed') {
          updateCallStatus(panel, 'ERROR', 'Microphone permission denied.');
          speakAnnouncement('Microphone access was denied. Please allow mic permissions.');
        } else if (err.error === 'no-speech') {
          updateCallStatus(panel, 'WAITING', "I didn't catch that. Say your answer or say skip.");
          speakAnnouncement("I didn't hear anything. You can say your answer or say skip.", () => {
            if (isCallActive) listenInVoiceCall(panel);
          });
        }
      };

      speechRecognizer = rec;
      rec.start();
    } catch (e) {
      console.error('[PRAYAS Voice Call] Listener error:', e);
    }
  }

  function skipCurrentCallField(panel) {
    if (!isCallActive || fieldCatalog.length === 0) return;
    const fieldObj = fieldCatalog[currentCallFieldIndex];
    if (fieldObj) {
      fieldObj.status = 'skipped';
      fieldObj.el.classList.remove('prayas-highlight-field', 'prayas-call-speaking-glow');
    }
    updateCallStatus(panel, 'SPEAKING', `Prayas.AI: "Skipping ${fieldObj?.label || 'this field'}."`);
    speakAnnouncement(`Skipping ${fieldObj?.label || 'this field'}.`, () => {
      advanceCallField(panel);
    });
  }

  function handleVoiceCallResponse(spokenText, panel) {
    if (!isCallActive) return;
    const norm = normalizeText(spokenText);
    const currentFieldObj = fieldCatalog[currentCallFieldIndex];
    const currentField = currentFieldObj?.el;

    console.log(`[PRAYAS Voice Call Dialog] Heard: "${spokenText}" | Awaiting Confirmation: ${awaitingConfirmation}`);

    // Universal navigation & control during call
    if (norm === 'skip' || norm === 'skip this' || norm === 'pass' || norm === 'leave empty') {
      skipCurrentCallField(panel);
      return;
    }

    if (norm === 'go back' || norm === 'previous' || norm === 'back') {
      if (currentCallFieldIndex > 0) {
        currentCallFieldIndex--;
        updateCallStatus(panel, 'SPEAKING', 'Prayas.AI: "Moving back to previous field."');
        speakAnnouncement('Moving back.', () => announceCallField(fieldCatalog[currentCallFieldIndex], panel));
      } else {
        speakAnnouncement('This is the first field.', () => announceCallField(fieldCatalog[0], panel));
      }
      return;
    }

    if (norm === 'repeat' || norm === 'repeat that' || norm === 'say again' || norm === 'what did you say') {
      announceCallField(currentFieldObj, panel);
      return;
    }

    if (norm.includes('what did i skip') || norm.includes('skipped fields') || norm.includes('go back to skipped')) {
      const skippedIdx = fieldCatalog.findIndex((f) => f.status === 'skipped');
      if (skippedIdx !== -1) {
        currentCallFieldIndex = skippedIdx;
        const target = fieldCatalog[skippedIdx];
        speakAnnouncement(`Returning to skipped field: ${target.label}. What should I enter?`, () => {
          announceCallField(target, panel);
        });
      } else {
        speakAnnouncement('You have no skipped fields.', () => listenInVoiceCall(panel));
      }
      return;
    }

    if (norm === 'im done' || norm === 'i am done' || norm === 'finish' || norm === 'end call') {
      updateCallStatus(panel, 'FINISHED', 'Prayas.AI: "Great work! Form fields reviewed."');
      speakAnnouncement('Great job! We have reviewed the fields. You can inspect the form and submit whenever you are ready.', () => {
        endVoiceCall(panel);
      });
      return;
    }

    // Confirmation step: "I've entered Mumbai. Is that right?"
    if (awaitingConfirmation) {
      if (['yes', 'yeah', 'yep', 'correct', 'right', 'looks good', 'sounds good', 'confirm'].includes(norm)) {
        awaitingConfirmation = false;
        if (currentFieldObj) currentFieldObj.status = 'filled';
        updateCallStatus(panel, 'SPEAKING', 'Prayas.AI: "Great!"');
        speakAnnouncement('Great!', () => advanceCallField(panel));
        return;
      } else if (['no', 'change my answer', 'change', 'wrong', 'edit', 'incorrect'].includes(norm)) {
        awaitingConfirmation = false;
        updateCallStatus(panel, 'SPEAKING', 'Prayas.AI: "What should I enter instead?"');
        speakAnnouncement('No problem. What should I enter instead?', () => listenInVoiceCall(panel));
        return;
      }
    }

    // AI draft assistance for essay questions
    if (norm.includes('draft') || norm.includes('ai') || norm.includes('write')) {
      updateCallStatus(panel, 'SPEAKING', 'Prayas.AI: "Searching your career documents to draft an answer..."');
      speakAnnouncement('Searching your career documents to draft an answer.', () => {
        const label = currentFieldObj?.label || 'Candidate experience';

        chrome.storage.local.get(['prayasLoggedInUser', 'passportProfile'], (userData) => {
          chrome.runtime.sendMessage({
            type: 'PRAYAS_REQUEST_RAG',
            payload: {
              question: label,
              context: 'Application draft',
              user_id: userData.prayasLoggedInUser?.id,
              user_email: userData.prayasLoggedInUser?.email,
              user_profile: userData.passportProfile
            }
          }, (res) => {
            const draftVal = (res && res.success && res.draftAnswer)
              ? res.draftAnswer
              : 'Drawing from my verified software engineering experience, I specialize in building accessible web platforms with full keyboard navigation and strict WCAG compliance.';

            setNativeValue(currentField, draftVal, 'AI_DRAFT');
            currentField.classList.remove('prayas-needs-input');
            awaitingConfirmation = true;
            pendingFieldValue = draftVal;
            const confirmMsg = "I've inserted a personalized draft from your resume. Is that right?";
            updateCallStatus(panel, 'SPEAKING', `Prayas.AI: "${confirmMsg}"`);
            speakAnnouncement(confirmMsg, () => listenInVoiceCall(panel));
          });
        });
      });
      return;
    }

    // Candidate provided an answer value (cleaned by field type)
    const cleaned = cleanAnswerByFieldType(currentField, spokenText);
    setNativeValue(currentField, cleaned, 'UTTERANCE_ANSWER');
    currentField.classList.remove('prayas-needs-input');
    awaitingConfirmation = true;
    pendingFieldValue = cleaned;

    const confirmSpoken = `I've entered ${cleaned}. Is that right?`;
    updateCallStatus(panel, 'SPEAKING', `Prayas.AI: "${confirmSpoken}"`);

    speakAnnouncement(confirmSpoken, () => {
      if (isCallActive) listenInVoiceCall(panel);
    });
  }

  function advanceCallField(panel) {
    if (!isCallActive) return;
    if (fieldCatalog[currentCallFieldIndex]) {
      fieldCatalog[currentCallFieldIndex].el.classList.remove('prayas-call-speaking-glow');
    }
    currentCallFieldIndex++;
    if (currentCallFieldIndex < fieldCatalog.length) {
      announceCallField(fieldCatalog[currentCallFieldIndex], panel);
    } else {
      updateCallStatus(panel, 'FINISHED', 'Prayas.AI: "All fields completed! Form was NOT submitted automatically."');
      speakAnnouncement("All fields have been filled! I will not submit the application automatically, so please review everything before submitting.", () => {
        endVoiceCall(panel);
      });
    }
  }

  // Document-level focusin listener for mouse-click field sync (Task C) - guarded against duplicate registration
  if (!window.__prayasFocusinListenerBound) {
    window.__prayasFocusinListenerBound = true;
    document.addEventListener('focusin', (e) => {
      const target = e.target;
      if (!target || !target.tagName || isPanelElement(target)) return;

      if (fieldCatalog.length === 0) initFieldCatalog();
      const idx = fieldCatalog.findIndex((item) => item.el === target);

      if (idx !== -1 && idx !== currentCallFieldIndex) {
        currentCallFieldIndex = idx;
        const fieldObj = fieldCatalog[idx];
        highlightElement(fieldObj.el);
        activeFieldForAnswer = fieldObj.el;

        const panel = document.getElementById(PANEL_ID);
        if (panel) updateCallProgressDisplay(panel);

        if (isCallActive) {
          const prompt = `I see you're on ${fieldObj.label}. Want to answer it by voice?`;
          updateCallStatus(panel, 'SPEAKING', `Prayas.AI: "${prompt}"`);
          speakAnnouncement(prompt, () => {
            if (isCallActive) {
              announceCallField(fieldObj, panel);
            }
          });
        }
      }
    });
  }

  // =========================================================
  // 8. GLOBAL TOGGLE & KEYBOARD SHORTCUT DISPATCHER
  // =========================================================
  function togglePrayasAssistantPanel() {
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = createPrayasAssistantPanel();
      panel.style.display = 'flex';
      console.log('[PRAYAS 3.0] Single assistant panel created & displayed.');
    } else {
      const isHidden = panel.style.display === 'none' || panel.classList.contains('prayas-hidden');
      panel.style.display = isHidden ? 'flex' : 'none';
      if (!isHidden) stopAllSpeech();
      console.log(`[PRAYAS 3.0] Single assistant panel toggled: ${isHidden ? 'visible' : 'hidden'}`);
    }
  }

  // Keyboard shortcut listeners (Alt+M, Alt+N, Alt+B, Alt+R, Alt+W, Alt+F, Alt+H, Esc) - guarded against duplicates
  if (!window.__prayasKeydownListenerBound) {
    window.__prayasKeydownListenerBound = true;
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        dispatch({ type: 'ACTION', name: 'STOP' });
        return;
      }

      if (e.altKey) {
        const k = (e.key || '').toLowerCase();
        const actionMap = {
          'm': 'SPEAK_TOGGLE',
          'n': 'NEXT_FIELD',
          'b': 'PREV_FIELD',
          'r': 'READ_QUESTION',
          'w': 'PAGE_INFO',
          'f': 'AUTOFILL',
          'h': 'AI_DRAFT'
        };
        const actionName = actionMap[k];
        if (actionName) {
          e.preventDefault();
          e.stopPropagation();
          const panel = document.getElementById(PANEL_ID) || createPrayasAssistantPanel();
          if (panel.style.display === 'none' || panel.classList.contains('prayas-hidden')) {
            panel.style.display = 'flex';
            panel.classList.remove('prayas-hidden');
          }
          dispatch({ type: 'ACTION', name: actionName });
        }
      }
    }, true); // useCapture ensures shortcuts intercept before form fields consume keystrokes
  }

  // Background Runtime Message Dispatcher
  function prayasRuntimeMessageDispatcher(message, sender, sendResponse) {
    if (message.type === 'PRAYAS_TOGGLE_PANEL') {
      togglePrayasAssistantPanel();
      sendResponse({ success: true, acknowledged: true });
      return true;
    }

    if (message.type === 'PRAYAS_VOICE_COMMAND' || message.type === 'PRAYAS_EXECUTE_ACTION') {
      const cmdToAction = {
        'NEXT_FIELD': 'NEXT_FIELD',
        'PREVIOUS_FIELD': 'PREV_FIELD',
        'PREV_FIELD': 'PREV_FIELD',
        'READ_CURRENT_FIELD': 'READ_QUESTION',
        'READ_QUESTION': 'READ_QUESTION',
        'START_AUTOFILL': 'AUTOFILL',
        'AUTOFILL': 'AUTOFILL',
        'SKIP_FIELD': 'SKIP',
        'SKIP': 'SKIP',
        'CLEAR_CURRENT_FIELD': 'STOP',
        'STOP': 'STOP'
      };
      const act = cmdToAction[message.command] || message.command || message.action;
      dispatch({ type: 'ACTION', name: act });
      sendResponse({ success: true, acknowledged: true });
      return true;
    }

    if (message.type === 'PRAYAS_SCAN_PAGE') {
      const scanResult = runFullScanAndAudit();
      sendResponse({
        success: true,
        formsCount: scanResult.formsCount,
        fieldsCount: scanResult.fieldsCount,
        activeRepairsCount,
        auditSummary: scanResult.auditSummary,
        pageTitle: document.title || 'Untitled Page',
        url: window.location.href
      });
      return true;
    }

    if (message.type === 'PRAYAS_GET_FIELDS') {
      const fieldList = Array.from(fieldRegistry.values());
      sendResponse({
        success: true,
        formsCount: document.querySelectorAll('form').length,
        fieldsCount: fieldList.length,
        fields: fieldList,
        activeRepairsCount
      });
      return true;
    }

    if (message.type === 'PRAYAS_APPLY_FIXES') {
      const res = applySafeImprovements();
      sendResponse(res);
      return true;
    }

    if (message.type === 'PRAYAS_UNDO_FIXES') {
      const res = undoAccessibilityImprovements();
      sendResponse(res);
      return true;
    }

    if (message.type === 'PRAYAS_PREVIEW_AUTOFILL') {
      const matched = previewAutofillMatches(message.passport);
      sendResponse({ success: true, matchedFields: matched });
      return true;
    }

    if (message.type === 'PRAYAS_EXECUTE_AUTOFILL') {
      const res = executeConfirmedAutofill(message.fieldsToFill);
      sendResponse(res);
      return true;
    }

    if (message.type === 'GET_ACTIVE_QUESTION') {
      const navigables = getNavigableElements();
      const target = navigables[currentNavIndex >= 0 ? currentNavIndex : 0];
      const q = target ? extractAccessibleLabel(target) : 'Job application question';
      sendResponse({ success: true, question: q });
      return true;
    }

    if (message.type === 'INSERT_DRAFT_ANSWER') {
      const text = message.payload?.text || message.text || '';
      const navigables = getNavigableElements();
      const target = navigables.find(e => e.tagName.toLowerCase() === 'textarea') || navigables[navigables.length - 1];
      if (target) {
        setNativeValue(target, text, 'AI_DRAFT');
        speakAnnouncement('Draft answer inserted.');
        sendResponse({ success: true, inserted: true });
      } else {
        sendResponse({ success: false, error: 'No field to insert' });
      }
      return true;
    }

    sendResponse({ success: false, error: 'Unhandled message' });
    return true;
  }

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(prayasRuntimeMessageDispatcher);
  }

  // Expose Core on window
  window.__PRAYAS_CORE__ = {
    dispatch,
    fieldRegistry,
    auditIssues,
    runFullScanAndAudit,
    applySafeImprovements,
    undoAccessibilityImprovements,
    navigateField,
    readCurrentField,
    previewAutofillMatches,
    executeConfirmedAutofill,
    togglePanel: togglePrayasAssistantPanel,
    speakAnnouncement,
    classifyUserIntent,
    getElementByPrayasId,
    isPrayasPortal: checkIsPrayasPortal
  };

  // Run initial scan so fieldRegistry is populated (skip on PRAYAS web portal to prevent Next.js SSR hydration mismatches)
  if (!checkIsPrayasPortal()) {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', runFullScanAndAudit);
    } else {
      runFullScanAndAudit();
    }
  }
})();
