/**
 * PRAYAS 3.0 - Content Script (Stage 8: Voice & Keyboard Navigation Integration)
 * Team ByteShastra | Member 3: Chrome Extension & DOM
 * 
 * Responsibilities:
 * - Form & dynamic field detection
 * - Accessibility audit & non-destructive safe repairs
 * - Smart multi-tier profile matching against Accessibility Passport
 * - Structured Accessibility Scorecard generation
 * - Whitelisted, secure Voice Navigation & DOM command dispatcher
 * - Voice readout via Web Speech API (speechSynthesis)
 * - Accessible keyboard shortcut integration (Alt + Arrows, Alt + Space, Alt + A)
 */

(function () {
  if (window.__prayasContentScriptLoaded) return;
  window.__prayasContentScriptLoaded = true;

  console.log('[PRAYAS 3.0] Content Script loaded on:', window.location.href);

  const fieldRegistry = new Map();
  const auditIssues = [];
  let fieldIdCounter = 1;
  let issueIdCounter = 1;
  let activeRepairsCount = 0;
  let currentNavIndex = -1;

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

  // Strictly validated command whitelist to prevent arbitrary execution
  const ALLOWED_VOICE_COMMANDS = new Set([
    'NEXT_FIELD',
    'PREVIOUS_FIELD',
    'READ_CURRENT_FIELD',
    'START_AUTOFILL',
    'FOCUS_FIELD',
    'CLEAR_CURRENT_FIELD'
  ]);

  function formatReadableTitle(raw) {
    if (!raw) return 'Form Field';
    return raw
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim();
  }

  function extractAccessibleLabel(el) {
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
      } catch (e) {}
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

    return el.name || el.id || '';
  }

  function cleanLabelText(text) {
    return text
      .replace(/[\*\:]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function auditElementAccessibility(el, meta) {
    const issues = [];
    const tagName = el.tagName.toLowerCase();
    const type = (el.type || '').toLowerCase();
    const isButton = tagName === 'button' || (tagName === 'input' && ['button', 'submit', 'reset'].includes(type));

    if (el.hasAttribute('data-prayas-repaired')) {
      return issues;
    }

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
          description: 'Button has no visible text, aria-label, or title. Screen readers cannot determine its action.',
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
        } catch (e) {}
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
          description: `A <label for="${el.id}"> tag exists in the DOM but contains zero text content.`,
          recommendation: 'Add meaningful descriptive text inside the <label> element.',
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
            description: `Field relies solely on placeholder ("${placeholder.trim()}"). It disappears on input and lacks sufficient contrast.`,
            recommendation: 'Provide a permanent visible <label> or aria-label attribute in addition to placeholder.',
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
            description: 'Field has no associated <label>, aria-label, or aria-labelledby. Completely inaccessible to screen readers.',
            recommendation: `Associate a <label for="${el.id || el.name}"> or provide an aria-label.`,
            repairable: true,
            status: 'DETECTED',
            wcagCriterion: WCAG_MAPPINGS['MISSING_LABEL']
          });
        }
      }
    }

    if (issues.length > 0) {
      el.classList.add('prayas-a11y-warning');
    } else {
      el.classList.remove('prayas-a11y-warning');
    }

    return issues;
  }

  function processFieldElement(el) {
    const existingId = el.getAttribute('data-prayas-id');
    if (existingId && fieldRegistry.has(existingId)) {
      return fieldRegistry.get(existingId);
    }

    const prayasId = existingId || `prayas-field-${fieldIdCounter++}`;
    if (!existingId) {
      el.setAttribute('data-prayas-id', prayasId);
    }

    const tagName = el.tagName.toLowerCase();
    let type = 'unknown';

    if (tagName === 'input') {
      type = (el.type || 'text').toLowerCase();
    } else if (tagName === 'textarea') {
      type = 'textarea';
    } else if (tagName === 'select') {
      type = 'select';
    } else if (tagName === 'button') {
      type = (el.type || 'button').toLowerCase();
    }

    const isRequired =
      el.hasAttribute('required') ||
      el.getAttribute('aria-required') === 'true';

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
      label: extractAccessibleLabel(el) || (el.id ? `#${el.id}` : 'Unlabeled field'),
      formId,
      isVisible: el.offsetParent !== null || el.getClientRects().length > 0
    };

    fieldRegistry.set(prayasId, metadata);

    const fieldIssues = auditElementAccessibility(el, metadata);
    if (fieldIssues.length > 0) {
      auditIssues.push(...fieldIssues);
    }

    return metadata;
  }

  function applySafeImprovements() {
    let appliedCount = 0;
    const repairedDetails = [];
    const candidates = auditIssues.filter((i) => i.repairable && i.status === 'DETECTED');

    for (const issue of candidates) {
      const el = document.querySelector(`[data-prayas-id="${issue.prayasId}"]`);
      if (!el) continue;

      const originalAriaLabel = el.hasAttribute('aria-label') ? el.getAttribute('aria-label') : '__NONE__';
      el.dataset.prayasOriginalAriaLabel = originalAriaLabel;

      let generatedLabel = '';

      if (issue.type === 'MISSING_BUTTON_NAME') {
        if (el.id && el.id.toLowerCase().includes('attach')) {
          generatedLabel = 'Attach document or file';
        } else if (el.id && el.id.toLowerCase().includes('upload')) {
          generatedLabel = 'Upload resume or document';
        } else {
          generatedLabel = 'Action button';
        }
      } else if (issue.type === 'MISSING_LABEL' || issue.type === 'EMPTY_LABEL') {
        const rawName = el.id || el.name || 'Application Field';
        generatedLabel = formatReadableTitle(rawName);
      }

      if (generatedLabel) {
        el.setAttribute('aria-label', generatedLabel);
        el.setAttribute('data-prayas-repaired', 'true');

        el.classList.remove('prayas-a11y-warning');
        el.classList.add('prayas-a11y-fixed');

        issue.status = 'REPAIRED';
        issue.appliedFix = `Added aria-label="${generatedLabel}"`;
        appliedCount++;

        repairedDetails.push({
          issueId: issue.id,
          elementId: issue.elementId,
          type: issue.type,
          appliedLabel: generatedLabel
        });
      }
    }

    activeRepairsCount += appliedCount;

    return {
      success: true,
      appliedCount,
      activeRepairsCount,
      repairedDetails
    };
  }

  function undoAccessibilityImprovements() {
    let revertedCount = 0;
    const repairedElements = document.querySelectorAll('[data-prayas-repaired="true"]');

    repairedElements.forEach((el) => {
      const originalAriaLabel = el.dataset.prayasOriginalAriaLabel;

      if (originalAriaLabel === '__NONE__') {
        el.removeAttribute('aria-label');
      } else if (originalAriaLabel) {
        el.setAttribute('aria-label', originalAriaLabel);
      }

      delete el.dataset.prayasOriginalAriaLabel;
      el.removeAttribute('data-prayas-repaired');
      el.classList.remove('prayas-a11y-fixed');

      revertedCount++;
    });

    activeRepairsCount = 0;
    const refreshed = runFullScanAndAudit();

    return {
      success: true,
      revertedCount,
      activeRepairsCount: 0,
      auditSummary: refreshed.auditSummary
    };
  }

  function generateAccessibilityScorecard() {
    const totalControls = fieldRegistry.size || 1;
    const fixedIssues = auditIssues.filter((i) => i.status === 'REPAIRED');
    const unresolvedIssues = auditIssues.filter((i) => i.status === 'DETECTED');
    const definitiveIssues = auditIssues.filter((i) => i.confidence === 'DEFINITIVE');
    const uncertainIssues = auditIssues.filter((i) => i.confidence === 'UNCERTAIN');

    const penaltyPerUnresolved = 18;
    const penaltyPerUncertain = 6;
    const totalDeduction = (unresolvedIssues.filter(i => i.confidence === 'DEFINITIVE').length * penaltyPerUnresolved) +
                           (uncertainIssues.length * penaltyPerUncertain);
    const healthScore = Math.max(10, Math.min(100, 100 - totalDeduction));

    const structuredIssues = auditIssues.map((issue) => ({
      id: issue.id,
      type: issue.type,
      title: issue.title,
      description: issue.description,
      confidence: issue.confidence,
      severity: issue.severity,
      targetElement: issue.elementId ? `#${issue.elementId}` : (issue.elementName ? `[name="${issue.elementName}"]` : `<${issue.tagName}>`),
      detectionStatus: 'DETECTED',
      repairStatus: issue.status === 'REPAIRED' ? 'FIXED' : 'UNRESOLVED',
      appliedFix: issue.appliedFix || null,
      wcagCriterion: issue.wcagCriterion || 'WCAG 2.2'
    }));

    return {
      metadata: {
        pageUrl: window.location.href,
        pageTitle: document.title || 'Job Application Page',
        auditedAt: new Date().toISOString(),
        extensionVersion: '1.0.0',
        totalFormControls: totalControls
      },
      summary: {
        healthScore,
        totalIssuesDetected: auditIssues.length,
        fixedCount: fixedIssues.length,
        unresolvedCount: unresolvedIssues.length,
        definitiveCount: definitiveIssues.length,
        uncertainCount: uncertainIssues.length
      },
      issues: structuredIssues
    };
  }

  function matchFieldToPassport(field, passport) {
    if (!passport) return null;
    if (field.tagName === 'button') return null;
    if (['submit', 'reset', 'button'].includes(field.type)) return null;

    const id = (field.id || '').toLowerCase();
    const name = (field.name || '').toLowerCase();
    const label = (field.label || '').toLowerCase();
    const auto = (field.autocomplete || '').toLowerCase();
    const type = field.type;

    if (
      auto === 'name' ||
      /^(full[_-]?name|candidate[_-]?name|legal[_-]?name)$/i.test(name) ||
      /^(full[_-]?name|candidate[_-]?name|legal[_-]?name)$/i.test(id) ||
      (label.includes('full name') || label.includes('candidate name') || (label.includes('name') && !label.includes('company') && !label.includes('ref')))
    ) {
      if (passport.fullName) {
        return { key: 'fullName', value: passport.fullName, label: 'Full Name' };
      }
    }

    if (
      auto === 'email' ||
      type === 'email' ||
      /^(email|e[_-]?mail[_-]?address)$/i.test(name) ||
      /^(email|e[_-]?mail[_-]?address)$/i.test(id) ||
      label.includes('email')
    ) {
      if (!id.includes('ref') && !name.includes('ref') && !label.includes('reference')) {
        if (passport.email) {
          return { key: 'email', value: passport.email, label: 'Email Address' };
        }
      }
    }

    if (
      auto === 'tel' ||
      type === 'tel' ||
      /^(phone|tel|mobile|phone[_-]?number)$/i.test(name) ||
      /^(phone|tel|mobile|phone[_-]?number)$/i.test(id) ||
      label.includes('phone') || label.includes('mobile')
    ) {
      if (passport.phone) {
        return { key: 'phone', value: passport.phone, label: 'Phone Number' };
      }
    }

    if (
      auto === 'address-level2' ||
      /^(city|current[_-]?city|location)$/i.test(name) ||
      /^(city|current[_-]?city|location)$/i.test(id) ||
      label.includes('current city') || label.includes('city')
    ) {
      if (passport.currentCity) {
        return { key: 'currentCity', value: passport.currentCity, label: 'Current City' };
      }
    }

    if (
      (type === 'url' || auto === 'url') ||
      /^(portfolio|github|linkedin|portfolio[_-]?url|website)$/i.test(name) ||
      /^(portfolio|github|linkedin|portfolio[_-]?url|website)$/i.test(id) ||
      label.includes('portfolio') || label.includes('linkedin') || label.includes('github')
    ) {
      if (passport.portfolioUrl) {
        return { key: 'portfolioUrl', value: passport.portfolioUrl, label: 'Portfolio URL' };
      }
    }

    if (
      field.tagName === 'select' &&
      (/experience/i.test(name) || /experience/i.test(id) || label.includes('experience'))
    ) {
      if (passport.experienceLevel) {
        return { key: 'experienceLevel', value: passport.experienceLevel, label: 'Experience Level' };
      }
    }

    if (
      field.tagName === 'textarea' &&
      (/summary/i.test(name) || /summary/i.test(id) || /cover/i.test(name) || label.includes('summary') || label.includes('interest'))
    ) {
      if (passport.professionalSummary) {
        return { key: 'professionalSummary', value: passport.professionalSummary, label: 'Professional Summary' };
      }
    }

    if (
      field.tagName === 'textarea' &&
      (/accommodation/i.test(name) || /accommodation/i.test(id) || label.includes('accommodation') || label.includes('accessibility'))
    ) {
      if (passport.accommodations) {
        return { key: 'accommodations', value: passport.accommodations, label: 'Workplace Accommodations' };
      }
    }

    if (
      type === 'checkbox' &&
      (/remote/i.test(name) || /remote/i.test(id) || label.includes('remote') || label.includes('hybrid'))
    ) {
      if (passport.remotePreference !== undefined) {
        return { key: 'remotePreference', value: passport.remotePreference, label: 'Remote Preference' };
      }
    }

    return null;
  }

  function previewAutofillMatches(passport) {
    const previewList = [];

    fieldRegistry.forEach((field) => {
      const match = matchFieldToPassport(field, passport);
      if (match) {
        const domEl = document.querySelector(`[data-prayas-id="${field.prayasId}"]`);
        let currentValue = '';
        if (domEl) {
          currentValue = field.type === 'checkbox' ? (domEl.checked ? 'Checked' : 'Unchecked') : (domEl.value || '');
        }

        previewList.push({
          prayasId: field.prayasId,
          fieldId: field.id || '',
          fieldName: field.name || '',
          fieldLabel: field.label,
          fieldType: field.type,
          tagName: field.tagName,
          passportKey: match.key,
          valueToFill: match.value,
          currentValue
        });
      }
    });

    return previewList;
  }

  function executeConfirmedAutofill(fieldsToFill) {
    if (!Array.isArray(fieldsToFill) || fieldsToFill.length === 0) {
      return { success: false, filledCount: 0, error: 'No fields provided' };
    }

    let filledCount = 0;

    fieldsToFill.forEach((item) => {
      const el = document.querySelector(`[data-prayas-id="${item.prayasId}"]`);
      if (!el) return;

      const tagName = el.tagName.toLowerCase();
      const type = (el.type || '').toLowerCase();
      const val = item.valueToFill;

      if (tagName === 'select') {
        let matchedOption = false;
        const targetVal = String(val).toLowerCase();

        for (const opt of el.options) {
          if (
            opt.value.toLowerCase() === targetVal ||
            opt.text.toLowerCase().includes(targetVal)
          ) {
            el.value = opt.value;
            opt.selected = true;
            matchedOption = true;
            break;
          }
        }

        if (matchedOption) {
          el.dispatchEvent(new Event('change', { bubbles: true }));
          highlightElement(el);
          filledCount++;
        }
      } else if (type === 'checkbox') {
        el.checked = Boolean(val);
        el.dispatchEvent(new Event('change', { bubbles: true }));
        highlightElement(el);
        filledCount++;
      } else {
        const prototype = tagName === 'textarea' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

        if (nativeSetter) {
          nativeSetter.call(el, String(val));
        } else {
          el.value = String(val);
        }

        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));

        highlightElement(el);
        filledCount++;
      }
    });

    return { success: true, filledCount };
  }

  function highlightElement(el) {
    el.classList.add('prayas-highlight-field');
    setTimeout(() => {
      el.classList.remove('prayas-highlight-field');
    }, 3000);
  }

  /**
   * ==========================================
   * STAGE 8: VOICE & KEYBOARD NAVIGATION CORE
   * ==========================================
   */

  /**
   * Returns array of ordered, visible interactive elements.
   */
  function getNavigableElements() {
    return Array.from(fieldRegistry.values())
      .map((meta) => document.querySelector(`[data-prayas-id="${meta.prayasId}"]`))
      .filter((el) => el && (el.offsetParent !== null || el.getClientRects().length > 0));
  }

  /**
   * Moves focus to next or previous form control with visual high-contrast highlight.
   * @param {number} direction +1 for next, -1 for previous
   * @returns {Object} Navigation result
   */
  function navigateField(direction) {
    const elements = getNavigableElements();
    if (elements.length === 0) {
      return { success: false, error: 'No navigable fields on page' };
    }

    currentNavIndex = (currentNavIndex + direction + elements.length) % elements.length;
    const targetEl = elements[currentNavIndex];

    targetEl.focus();
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    highlightElement(targetEl);

    const prayasId = targetEl.getAttribute('data-prayas-id');
    const meta = fieldRegistry.get(prayasId) || {};

    const announcement = generateFieldAnnouncement(targetEl, meta);
    speakAnnouncement(announcement);

    return {
      success: true,
      index: currentNavIndex,
      total: elements.length,
      fieldLabel: meta.label || targetEl.name || targetEl.id,
      fieldType: meta.type || targetEl.tagName.toLowerCase(),
      announcement
    };
  }

  /**
   * Reads aloud the currently focused field or active element.
   * @returns {Object} Readout result
   */
  function readCurrentField() {
    let targetEl = document.activeElement;
    if (!targetEl || !targetEl.hasAttribute('data-prayas-id')) {
      const elements = getNavigableElements();
      if (elements.length > 0) {
        currentNavIndex = currentNavIndex >= 0 ? currentNavIndex : 0;
        targetEl = elements[currentNavIndex];
      }
    }

    if (!targetEl || !targetEl.hasAttribute('data-prayas-id')) {
      const msg = 'No active form field selected.';
      speakAnnouncement(msg);
      return { success: false, announcement: msg };
    }

    const prayasId = targetEl.getAttribute('data-prayas-id');
    const meta = fieldRegistry.get(prayasId) || {};
    const announcement = generateFieldAnnouncement(targetEl, meta);

    highlightElement(targetEl);
    speakAnnouncement(announcement);

    return {
      success: true,
      fieldLabel: meta.label,
      fieldType: meta.type,
      announcement
    };
  }

  /**
   * Formats a clear, accessible speech announcement for a field.
   */
  function generateFieldAnnouncement(el, meta) {
    const label = meta.label || el.name || el.id || 'Field';
    const type = meta.type || el.tagName.toLowerCase();
    const reqText = meta.required ? 'Required.' : 'Optional.';
    
    let valueText = 'Currently empty.';
    if (type === 'checkbox') {
      valueText = el.checked ? 'Checked.' : 'Not checked.';
    } else if (type === 'select') {
      const selectedOption = el.options[el.selectedIndex];
      valueText = selectedOption && selectedOption.value ? `Selected: ${selectedOption.text}.` : 'None selected.';
    } else if (el.value && el.value.trim()) {
      valueText = `Current value: ${el.value.trim()}.`;
    }

    const helpText = meta.placeholder ? `Hint: ${meta.placeholder}.` : '';

    return `${label}. ${reqText} ${type} field. ${valueText} ${helpText}`.trim();
  }

  /**
   * Speaks announcement aloud using the browser's Web Speech API.
   * Fails gracefully if speech synthesis is blocked or unavailable.
   */
  function speakAnnouncement(text) {
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Cancel any ongoing utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[PRAYAS 3.0 Voice] Speech synthesis error:', e);
    }
  }

  /**
   * Focuses a field by semantic name (e.g. "email", "phone", "name").
   */
  function focusFieldByName(semanticQuery) {
    if (!semanticQuery) return { success: false, error: 'Empty query' };

    const query = semanticQuery.toLowerCase().trim();
    const elements = getNavigableElements();

    const targetEl = elements.find((el) => {
      const prayasId = el.getAttribute('data-prayas-id');
      const meta = fieldRegistry.get(prayasId) || {};
      const label = (meta.label || '').toLowerCase();
      const name = (meta.name || '').toLowerCase();
      const id = (meta.id || '').toLowerCase();

      return label.includes(query) || name.includes(query) || id.includes(query);
    });

    if (targetEl) {
      targetEl.focus();
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightElement(targetEl);

      const prayasId = targetEl.getAttribute('data-prayas-id');
      const meta = fieldRegistry.get(prayasId) || {};
      const announcement = generateFieldAnnouncement(targetEl, meta);
      speakAnnouncement(announcement);

      return { success: true, target: meta.label, announcement };
    }

    const failMsg = `Could not find any field matching "${semanticQuery}".`;
    speakAnnouncement(failMsg);
    return { success: false, error: failMsg };
  }

  /**
   * Dispatches a validated voice command.
   * Guarantees zero arbitrary code execution.
   */
  function handleVoiceCommand(commandObj) {
    const cmd = commandObj.command;

    if (!ALLOWED_VOICE_COMMANDS.has(cmd)) {
      console.warn('[PRAYAS 3.0 Voice] Rejected unauthorized command:', cmd);
      return { success: false, error: `Command "${cmd}" is not in the allowed command whitelist.` };
    }

    switch (cmd) {
      case 'NEXT_FIELD':
        return navigateField(1);
      case 'PREVIOUS_FIELD':
        return navigateField(-1);
      case 'READ_CURRENT_FIELD':
        return readCurrentField();
      case 'FOCUS_FIELD':
        return focusFieldByName(commandObj.target);
      case 'START_AUTOFILL': {
        const msg = 'Autofill requested via voice. Please open PRAYAS to review and confirm.';
        speakAnnouncement(msg);
        return { success: true, announcement: msg };
      }
      case 'CLEAR_CURRENT_FIELD': {
        if (document.activeElement && document.activeElement.hasAttribute('data-prayas-id')) {
          document.activeElement.value = '';
          document.activeElement.dispatchEvent(new Event('input', { bubbles: true }));
          document.activeElement.dispatchEvent(new Event('change', { bubbles: true }));
          const clearMsg = 'Field cleared.';
          speakAnnouncement(clearMsg);
          return { success: true, announcement: clearMsg };
        }
        return { success: false, error: 'No active field to clear.' };
      }
      default:
        return { success: false, error: 'Unknown command' };
    }
  }

  // Keyboard accessibility listeners (Alt + Right, Alt + Left, Alt + Space)
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      navigateField(1);
    } else if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateField(-1);
    } else if (e.altKey && e.code === 'Space') {
      e.preventDefault();
      readCurrentField();
    }
  });

  function runFullScanAndAudit() {
    auditIssues.length = 0;
    fieldRegistry.clear();
    fieldIdCounter = 1;
    issueIdCounter = 1;

    document.querySelectorAll('.prayas-a11y-warning').forEach((el) => {
      el.classList.remove('prayas-a11y-warning');
    });

    const elements = document.querySelectorAll(INTERACTIVE_SELECTOR);
    const scannedFields = [];

    elements.forEach((el) => {
      const fieldData = processFieldElement(el);
      scannedFields.push(fieldData);
    });

    const forms = document.querySelectorAll('form');
    const definitiveCount = auditIssues.filter((i) => i.confidence === 'DEFINITIVE').length;
    const uncertainCount = auditIssues.filter((i) => i.confidence === 'UNCERTAIN').length;

    console.log(
      `[PRAYAS 3.0 Audit] Complete. Found ${scannedFields.length} fields, ${auditIssues.length} a11y issues (${definitiveCount} definitive, ${uncertainCount} warnings). Active repairs: ${activeRepairsCount}.`
    );

    return {
      formsCount: forms.length,
      fieldsCount: scannedFields.length,
      fields: scannedFields,
      activeRepairsCount,
      auditSummary: {
        totalIssues: auditIssues.length,
        definitiveCount,
        uncertainCount,
        issues: auditIssues
      }
    };
  }

  function debounce(fn, delayMs) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delayMs);
    };
  }

  function setupMutationObserver() {
    const handleMutations = debounce((mutations) => {
      let newlyDetectedCount = 0;

      for (const mutation of mutations) {
        if (!mutation.addedNodes || mutation.addedNodes.length === 0) continue;

        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          if (node.matches && node.matches(INTERACTIVE_SELECTOR)) {
            if (!node.hasAttribute('data-prayas-id')) {
              processFieldElement(node);
              newlyDetectedCount++;
            }
          }

          if (node.querySelectorAll) {
            const nestedFields = node.querySelectorAll(INTERACTIVE_SELECTOR);
            nestedFields.forEach((nestedEl) => {
              if (!nestedEl.hasAttribute('data-prayas-id')) {
                processFieldElement(nestedEl);
                newlyDetectedCount++;
              }
            });
          }
        }
      }

      if (newlyDetectedCount > 0) {
        console.log(`[PRAYAS 3.0 Observer] Dynamically indexed & audited ${newlyDetectedCount} new field(s).`);
      }
    }, 150);

    const observer = new MutationObserver(handleMutations);
    observer.observe(document.body, { childList: true, subtree: true });
    console.log('[PRAYAS 3.0] MutationObserver active for dynamic forms & accessibility audit.');
  }

  function renderInPageFloatingDock() {
    if (typeof document === 'undefined' || !document.body) return;
    if (fieldRegistry.size === 0 && auditIssues.length === 0) return;

    let dock = document.getElementById('prayas-floating-dock');
    if (!dock) {
      dock = document.createElement('div');
      dock.id = 'prayas-floating-dock';
      dock.setAttribute('role', 'region');
      dock.setAttribute('aria-label', 'PRAYAS Accessibility Assistant');
      document.body.appendChild(dock);
    }

    const unRepaired = auditIssues.filter((i) => i.status === 'DETECTED');

    dock.innerHTML = `
      <div class="prayas-dock-header">
        <div class="prayas-dock-title-group">
          <div class="prayas-dock-logo">P</div>
          <span class="prayas-dock-title">PRAYAS 3.0</span>
        </div>
        <button type="button" class="prayas-dock-min-btn" id="prayasDockMinBtn" title="Minimize / Expand Dock">_</button>
      </div>

      <div class="prayas-dock-body">
        <div class="prayas-dock-stats">
          <div class="prayas-dock-stat-pill">
            <span class="prayas-dock-stat-val">${fieldRegistry.size}</span>
            <span class="prayas-dock-stat-lbl">Fields</span>
          </div>
          <div class="prayas-dock-stat-pill">
            <span class="prayas-dock-stat-val" style="color: ${unRepaired.length > 0 ? '#f59e0b' : '#10b981'};">${unRepaired.length}</span>
            <span class="prayas-dock-stat-lbl">Barriers</span>
          </div>
          <div class="prayas-dock-stat-pill">
            <span class="prayas-dock-stat-val" style="color: #10b981;">${activeRepairsCount}</span>
            <span class="prayas-dock-stat-lbl">Repaired</span>
          </div>
        </div>

        <div class="prayas-dock-actions">
          <button type="button" class="prayas-dock-btn prayas-dock-btn-success" id="prayasDockFixBtn" title="Apply safe ARIA improvements">
            ⚡ Safe Fixes
          </button>
          <button type="button" class="prayas-dock-btn prayas-dock-btn-secondary" id="prayasDockUndoBtn" ${activeRepairsCount === 0 ? 'disabled' : ''} title="Revert ARIA changes">
            ↩ Undo
          </button>
          <button type="button" class="prayas-dock-btn prayas-dock-btn-primary" id="prayasDockFillBtn" title="Autofill from Accessibility Passport">
            📋 Autofill
          </button>
          <button type="button" class="prayas-dock-btn prayas-dock-btn-violet" id="prayasDockReadBtn" title="Read active field aloud (Alt + Space)">
            🔊 Read (Alt+Space)
          </button>
        </div>

        <div class="prayas-dock-status-msg" id="prayasDockMsg">
          ${activeRepairsCount > 0 ? `✓ ${activeRepairsCount} safe ARIA fix(es) active` : 'Ready. Click Safe Fixes or use Alt+→'}
        </div>
      </div>
    `;

    // Bind dock actions
    const minBtn = dock.querySelector('#prayasDockMinBtn');
    if (minBtn) {
      minBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dock.classList.toggle('prayas-minimized');
        minBtn.textContent = dock.classList.contains('prayas-minimized') ? '🛡️' : '_';
      });
    }

    const fixBtn = dock.querySelector('#prayasDockFixBtn');
    if (fixBtn) {
      fixBtn.addEventListener('click', () => {
        const res = applySafeImprovements();
        const msgEl = dock.querySelector('#prayasDockMsg');
        if (msgEl) msgEl.textContent = `Applied ${res.appliedCount} safe ARIA improvements!`;
        renderInPageFloatingDock();
      });
    }

    const undoBtn = dock.querySelector('#prayasDockUndoBtn');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        const res = undoAccessibilityImprovements();
        const msgEl = dock.querySelector('#prayasDockMsg');
        if (msgEl) msgEl.textContent = `Reverted ${res.revertedCount} elements to original state.`;
        renderInPageFloatingDock();
      });
    }

    const fillBtn = dock.querySelector('#prayasDockFillBtn');
    if (fillBtn) {
      fillBtn.addEventListener('click', () => {
        chrome.storage.local.get(['prayasPassport'], (data) => {
          const passport = data.prayasPassport;
          if (!passport) {
            const msgEl = dock.querySelector('#prayasDockMsg');
            if (msgEl) msgEl.textContent = 'No Passport found in storage.';
            return;
          }
          const matches = previewAutofillMatches(passport);
          const fieldsToFill = matches.map((m) => ({ prayasId: m.prayasId, valueToFill: m.valueToFill }));
          const res = executeConfirmedAutofill(fieldsToFill);
          const msgEl = dock.querySelector('#prayasDockMsg');
          if (msgEl) msgEl.textContent = `✓ Filled ${res.filledCount} fields from Passport!`;
        });
      });
    }

    const readBtn = dock.querySelector('#prayasDockReadBtn');
    if (readBtn) {
      readBtn.addEventListener('click', () => {
        readCurrentField();
      });
    }
  }

  runFullScanAndAudit();

  if (document.body) {
    setupMutationObserver();
    renderInPageFloatingDock();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      setupMutationObserver();
      renderInPageFloatingDock();
    });
  }

  // Runtime messaging

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PRAYAS_PING') {
      sendResponse({ status: 'PRAYAS_ACTIVE', version: '1.0.0' });
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
      const forms = document.querySelectorAll('form');
      const definitiveCount = auditIssues.filter((i) => i.confidence === 'DEFINITIVE').length;
      const uncertainCount = auditIssues.filter((i) => i.confidence === 'UNCERTAIN').length;

      sendResponse({
        success: true,
        formsCount: forms.length,
        fieldsCount: fieldList.length,
        fields: fieldList,
        activeRepairsCount,
        auditSummary: {
          totalIssues: auditIssues.length,
          definitiveCount,
          uncertainCount,
          issues: auditIssues
        },
        pageTitle: document.title || 'Untitled Page',
        url: window.location.href
      });
      return true;
    }

    if (message.type === 'PRAYAS_GET_AUDIT') {
      const scanResult = runFullScanAndAudit();
      sendResponse({
        success: true,
        activeRepairsCount,
        auditSummary: scanResult.auditSummary,
        pageTitle: document.title || 'Untitled Page',
        url: window.location.href
      });
      return true;
    }

    if (message.type === 'PRAYAS_APPLY_FIXES') {
      const repairResult = applySafeImprovements();
      renderInPageFloatingDock();
      sendResponse(repairResult);
      return true;
    }

    if (message.type === 'PRAYAS_UNDO_FIXES') {
      const undoResult = undoAccessibilityImprovements();
      renderInPageFloatingDock();
      sendResponse(undoResult);
      return true;
    }

    if (message.type === 'PRAYAS_PREVIEW_AUTOFILL') {
      const matched = previewAutofillMatches(message.passport);
      sendResponse({
        success: true,
        matchedFields: matched
      });
      return true;
    }

    if (message.type === 'PRAYAS_EXECUTE_AUTOFILL') {
      const result = executeConfirmedAutofill(message.fieldsToFill);
      renderInPageFloatingDock();
      sendResponse(result);
      return true;
    }

    if (message.type === 'PRAYAS_GET_SCORECARD') {
      const scorecard = generateAccessibilityScorecard();
      sendResponse({
        success: true,
        scorecard
      });
      return true;
    }

    if (message.type === 'PRAYAS_VOICE_COMMAND') {
      const commandResult = handleVoiceCommand(message);
      sendResponse(commandResult);
      return true;
    }

    sendResponse({ success: false, error: 'Unknown message type' });
    return true;
  });
})();
