/**
 * PRAYAS 3.0 - Popup Controller (Stage 7: Accessibility Scorecard & Reporting)
 * Team ByteShastra | Member 3: Chrome Extension & DOM
 */

document.addEventListener('DOMContentLoaded', () => {
  // Context & Metrics
  const pageTitleEl = document.getElementById('pageTitle');
  const statusMessageEl = document.getElementById('statusMessage');
  const extensionStatusEl = document.getElementById('extensionStatus');
  const formCountEl = document.getElementById('formCount');
  const fieldCountEl = document.getElementById('fieldCount');
  const issueCountEl = document.getElementById('issueCount');
  
  // Backend Status Bar Elements
  const backendDot = document.getElementById('backendDot');
  const backendStatusText = document.getElementById('backendStatusText');
  const checkBackendBtn = document.getElementById('checkBackendBtn');
  const passportSourceTag = document.getElementById('passportSourceTag');
  const passportUserNameEl = document.getElementById('passportUserName');

  // Badges & Scorecard Elements (Stage 7)
  const definitiveBadgeEl = document.getElementById('definitiveBadge');
  const uncertainBadgeEl = document.getElementById('uncertainBadge');
  const repairedBadgeEl = document.getElementById('repairedBadge');

  const scorecardHealthPercent = document.getElementById('scorecardHealthPercent');
  const scorecardDetected = document.getElementById('scorecardDetected');
  const scorecardFixed = document.getElementById('scorecardFixed');
  const scorecardUnresolved = document.getElementById('scorecardUnresolved');
  const auditConsentCheckbox = document.getElementById('auditConsentCheckbox');
  const submitScorecardBtn = document.getElementById('submitScorecardBtn');
  const exportScorecardBtn = document.getElementById('exportScorecardBtn');

  // Tab Counts
  const autofillTabCountEl = document.getElementById('autofillTabCount');
  const auditTabCountEl = document.getElementById('auditTabCount');
  const fieldsTabCountEl = document.getElementById('fieldsTabCount');
  const fieldsCatalogCountEl = document.getElementById('fieldsCatalogCount');
  const autofillSelectedCountEl = document.getElementById('autofillSelectedCount');

  // Lists & Containers
  const autofillListEl = document.getElementById('autofillList');
  const auditListEl = document.getElementById('auditList');
  const fieldsListEl = document.getElementById('fieldsList');

  // Action Buttons
  const confirmAutofillBtn = document.getElementById('confirmAutofillBtn');
  const applyFixesBtn = document.getElementById('applyFixesBtn');
  const undoFixesBtn = document.getElementById('undoFixesBtn');
  const scanBtn = document.getElementById('scanBtn');

  // Tab Buttons & Panels
  const tabAutofillBtn = document.getElementById('tabAutofillBtn');
  const tabVoiceBtn = document.getElementById('tabVoiceBtn');
  const tabAuditBtn = document.getElementById('tabAuditBtn');
  const tabFieldsBtn = document.getElementById('tabFieldsBtn');
  const autofillSection = document.getElementById('autofillSection');
  const voiceSection = document.getElementById('voiceSection');
  const auditSection = document.getElementById('auditSection');
  const fieldsSection = document.getElementById('fieldsSection');

  // Voice Navigation Elements (Stage 8)
  const voiceNextBtn = document.getElementById('voiceNextBtn');
  const voicePrevBtn = document.getElementById('voicePrevBtn');
  const voiceReadBtn = document.getElementById('voiceReadBtn');
  const voiceJumpInput = document.getElementById('voiceJumpInput');
  const voiceJumpBtn = document.getElementById('voiceJumpBtn');
  const voiceAnnouncementText = document.getElementById('voiceAnnouncementText');

  let activeTabId = null;
  let cachedPassport = null;
  let currentScorecard = null;
  let matchedPreviewFields = [];
  const selectedFieldsMap = new Map();

  function switchTab(activeBtn, activePanel) {
    [tabAutofillBtn, tabVoiceBtn, tabAuditBtn, tabFieldsBtn].forEach((btn) => {
      if (btn) btn.classList.remove('active');
    });
    [autofillSection, voiceSection, auditSection, fieldsSection].forEach((panel) => {
      if (panel) panel.classList.add('hidden');
    });

    if (activeBtn) activeBtn.classList.add('active');
    if (activePanel) activePanel.classList.remove('hidden');
  }

  if (tabAutofillBtn) tabAutofillBtn.addEventListener('click', () => switchTab(tabAutofillBtn, autofillSection));
  if (tabVoiceBtn) tabVoiceBtn.addEventListener('click', () => switchTab(tabVoiceBtn, voiceSection));
  if (tabAuditBtn) tabAuditBtn.addEventListener('click', () => switchTab(tabAuditBtn, auditSection));
  if (tabFieldsBtn) tabFieldsBtn.addEventListener('click', () => switchTab(tabFieldsBtn, fieldsSection));

  async function checkBackend() {
    backendDot.className = 'backend-dot status-dot-checking';
    backendStatusText.textContent = 'Backend: Checking connection...';

    try {
      const res = await chrome.runtime.sendMessage({ type: 'PRAYAS_CHECK_BACKEND' });

      if (res && res.connected) {
        backendDot.className = 'backend-dot status-dot-online';
        backendStatusText.textContent = `Backend: Online (${res.latencyMs}ms)`;
        backendStatusText.title = `Connected to FastAPI server at ${res.backendUrl}`;
      } else {
        backendDot.className = 'backend-dot status-dot-offline';
        backendStatusText.textContent = 'Backend: Standalone (Local Cache)';
        backendStatusText.title = 'FastAPI server not responding. Extension operating in offline fallback mode.';
      }
    } catch (e) {
      backendDot.className = 'backend-dot status-dot-offline';
      backendStatusText.textContent = 'Backend: Offline';
    }
  }

  /**
   * Updates the Scorecard Health card and breakdown metrics.
   */
  function renderScorecardData(scorecard) {
    if (!scorecard || !scorecard.summary) return;

    currentScorecard = scorecard;
    const { healthScore, totalIssuesDetected, fixedCount, unresolvedCount } = scorecard.summary;

    scorecardHealthPercent.textContent = `${healthScore}%`;
    scorecardDetected.textContent = totalIssuesDetected;
    scorecardFixed.textContent = fixedCount;
    scorecardUnresolved.textContent = unresolvedCount;

    if (healthScore >= 80) {
      scorecardHealthPercent.style.color = '#15803d';
    } else if (healthScore >= 50) {
      scorecardHealthPercent.style.color = '#b45309';
    } else {
      scorecardHealthPercent.style.color = '#b91c1c';
    }
  }

  function renderAutofillPreview(matches) {
    matchedPreviewFields = matches || [];
    selectedFieldsMap.clear();

    if (matchedPreviewFields.length === 0) {
      autofillListEl.innerHTML = '<p class="empty-state">No matching form fields found for your Passport details.</p>';
      autofillTabCountEl.textContent = '0';
      autofillSelectedCountEl.textContent = '0';
      confirmAutofillBtn.disabled = true;
      return;
    }

    autofillTabCountEl.textContent = matchedPreviewFields.length;
    autofillListEl.innerHTML = '';

    matchedPreviewFields.forEach((item) => {
      selectedFieldsMap.set(item.prayasId, item);

      const itemEl = document.createElement('div');
      itemEl.className = 'autofill-item';

      const headerEl = document.createElement('div');
      headerEl.className = 'autofill-header';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'autofill-checkbox';
      checkbox.checked = true;
      checkbox.id = `chk-${item.prayasId}`;
      checkbox.setAttribute('aria-label', `Autofill ${item.fieldLabel}`);

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          selectedFieldsMap.set(item.prayasId, item);
        } else {
          selectedFieldsMap.delete(item.prayasId);
        }
        updateConfirmButton();
      });

      const labelEl = document.createElement('label');
      labelEl.htmlFor = `chk-${item.prayasId}`;
      labelEl.className = 'autofill-field-name';
      labelEl.textContent = item.fieldLabel;

      const idBadge = document.createElement('span');
      idBadge.className = 'autofill-field-id';
      idBadge.textContent = item.fieldId ? `#${item.fieldId}` : (item.fieldName ? `[${item.fieldName}]` : item.prayasId);

      headerEl.appendChild(checkbox);
      headerEl.appendChild(labelEl);
      headerEl.appendChild(idBadge);

      const valPreview = document.createElement('div');
      valPreview.className = 'autofill-val-preview';
      
      let displayVal = item.valueToFill;
      if (typeof displayVal === 'boolean') {
        displayVal = displayVal ? '✓ Opt-in Selected' : '✗ Unchecked';
      } else if (String(displayVal).length > 60) {
        displayVal = String(displayVal).substring(0, 60) + '…';
      }

      valPreview.innerHTML = `<em>Value:</em> <strong>${escapeHtml(String(displayVal))}</strong>`;

      itemEl.appendChild(headerEl);
      itemEl.appendChild(valPreview);
      autofillListEl.appendChild(itemEl);
    });

    updateConfirmButton();
  }

  function updateConfirmButton() {
    const count = selectedFieldsMap.size;
    autofillSelectedCountEl.textContent = count;
    confirmAutofillBtn.disabled = count === 0;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderAuditIssues(auditSummary, activeRepairs) {
    const repairs = activeRepairs ?? 0;
    repairedBadgeEl.textContent = `${repairs} Repaired`;
    undoFixesBtn.disabled = repairs === 0;

    if (!auditSummary || !auditSummary.issues || auditSummary.issues.length === 0) {
      auditListEl.innerHTML = '<p class="empty-state">No active accessibility barriers detected!</p>';
      definitiveBadgeEl.textContent = '0 Definitive';
      uncertainBadgeEl.textContent = '0 Uncertain';
      auditTabCountEl.textContent = '0';
      issueCountEl.textContent = '0';
      applyFixesBtn.disabled = true;
      return;
    }

    const { totalIssues, definitiveCount, uncertainCount, issues } = auditSummary;

    issueCountEl.textContent = totalIssues;
    auditTabCountEl.textContent = totalIssues;
    definitiveBadgeEl.textContent = `${definitiveCount} Definitive`;
    uncertainBadgeEl.textContent = `${uncertainCount} Uncertain`;

    const unRepairedCandidates = issues.filter((i) => i.repairable && i.status !== 'REPAIRED');
    applyFixesBtn.disabled = unRepairedCandidates.length === 0;

    auditListEl.innerHTML = '';

    issues.forEach((issue) => {
      const card = document.createElement('div');
      const isRepaired = issue.status === 'REPAIRED';
      const isDefinitive = issue.confidence === 'DEFINITIVE';

      if (isRepaired) {
        card.className = 'issue-card card-repaired';
      } else {
        card.className = `issue-card ${isDefinitive ? 'card-definitive' : 'card-uncertain'}`;
      }

      const topRow = document.createElement('div');
      topRow.className = 'issue-top-row';

      const titleEl = document.createElement('span');
      titleEl.className = 'issue-title';
      titleEl.textContent = issue.title;

      const tagEl = document.createElement('span');
      if (isRepaired) {
        tagEl.className = 'issue-tag tag-rep';
        tagEl.textContent = 'Repaired';
      } else {
        tagEl.className = `issue-tag ${isDefinitive ? 'tag-def' : 'tag-unc'}`;
        tagEl.textContent = isDefinitive ? 'Problem' : 'Warning';
      }

      topRow.appendChild(titleEl);
      topRow.appendChild(tagEl);

      const targetEl = document.createElement('div');
      targetEl.className = 'issue-target';
      targetEl.textContent = `Target: <${issue.tagName}> ${issue.elementId ? '#' + issue.elementId : (issue.elementName ? '[' + issue.elementName + ']' : issue.prayasId)}`;

      const descEl = document.createElement('p');
      descEl.className = 'issue-desc';
      descEl.textContent = issue.description;

      card.appendChild(topRow);
      card.appendChild(targetEl);
      card.appendChild(descEl);

      if (isRepaired) {
        const fixedInfo = document.createElement('div');
        fixedInfo.className = 'issue-fixed-info';
        fixedInfo.textContent = `\u2713 ${issue.appliedFix || 'Safely repaired with accessible ARIA label'}`;
        card.appendChild(fixedInfo);
      } else {
        const recEl = document.createElement('div');
        recEl.className = 'issue-rec';
        recEl.textContent = `Suggested Fix: ${issue.recommendation}`;
        card.appendChild(recEl);
      }

      auditListEl.appendChild(card);
    });
  }

  function renderFieldsList(fields) {
    if (!fields || fields.length === 0) {
      fieldsListEl.innerHTML = '<p class="empty-state">No interactive fields detected on this page.</p>';
      fieldsCatalogCountEl.textContent = '0 items';
      fieldsTabCountEl.textContent = '0';
      return;
    }

    fieldsCatalogCountEl.textContent = `${fields.length} items`;
    fieldsTabCountEl.textContent = fields.length;
    fieldsListEl.innerHTML = '';

    fields.forEach((field) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'field-item';

      const topRow = document.createElement('div');
      topRow.className = 'field-item-top';

      const labelEl = document.createElement('span');
      labelEl.className = 'field-label';
      labelEl.textContent = field.label || '(Unnamed field)';
      labelEl.title = field.label || '';

      const tagsEl = document.createElement('div');
      tagsEl.className = 'field-tags';

      const typeTag = document.createElement('span');
      typeTag.className = 'tag tag-type';
      typeTag.textContent = field.type;
      tagsEl.appendChild(typeTag);

      if (field.required) {
        const reqTag = document.createElement('span');
        reqTag.className = 'tag tag-required';
        reqTag.textContent = 'Req';
        reqTag.title = 'Required field';
        tagsEl.appendChild(reqTag);
      }

      topRow.appendChild(labelEl);
      topRow.appendChild(tagsEl);

      const metaRow = document.createElement('div');
      metaRow.className = 'field-meta-row';

      const idBadge = document.createElement('span');
      idBadge.className = 'field-id';
      idBadge.textContent = field.id ? `#${field.id}` : (field.name ? `[${field.name}]` : field.prayasId);
      metaRow.appendChild(idBadge);

      if (field.placeholder) {
        const phSpan = document.createElement('span');
        phSpan.textContent = `hint: "${field.placeholder.substring(0, 20)}${field.placeholder.length > 20 ? '…' : ''}"`;
        metaRow.appendChild(phSpan);
      }

      itemEl.appendChild(topRow);
      itemEl.appendChild(metaRow);
      fieldsListEl.appendChild(itemEl);
    });
  }

  async function performScanAndAudit() {
    try {
      statusMessageEl.textContent = 'Scanning page and updating scorecard...';

      checkBackend();

      const passportRes = await chrome.runtime.sendMessage({ type: 'PRAYAS_GET_PASSPORT' });
      if (passportRes && passportRes.success && passportRes.passport) {
        cachedPassport = passportRes.passport;
        passportUserNameEl.textContent = cachedPassport.fullName || 'Candidate';
        passportSourceTag.textContent = passportRes.source === 'BACKEND_API' ? 'API Verified' : 'Local Cache';
      }

      // 1. Resolve active tab (handling regular popup, side panel, or pop-out window)
      let activeTab = null;
      const urlParams = new URLSearchParams(window.location.search);
      const paramTabId = urlParams.get('tabId');
      if (paramTabId) {
        try {
          activeTab = await chrome.tabs.get(parseInt(paramTabId, 10));
        } catch (_) {}
      }

      if (!activeTab) {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (tab && !tab.url.startsWith('chrome-extension://')) {
          activeTab = tab;
        }
      }

      if (!activeTab) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        activeTab = tab;
      }

      if (!activeTab || !activeTab.id) {
        statusMessageEl.textContent = 'No active browser tab found.';
        pageTitleEl.textContent = 'None';
        return;
      }

      activeTabId = activeTab.id;
      const url = activeTab.url || '';
      if (
        url.startsWith('chrome://') ||
        url.startsWith('chrome-extension://') ||
        url.startsWith('edge://') ||
        url.startsWith('about:')
      ) {
        pageTitleEl.textContent = 'Browser Internal Page';
        statusMessageEl.textContent = 'Extensions cannot run on internal browser pages.';
        extensionStatusEl.textContent = 'Restricted';
        extensionStatusEl.className = 'status-pill status-inactive';
        renderAuditIssues(null, 0);
        renderFieldsList([]);
        renderAutofillPreview([]);
        return;
      }

      pageTitleEl.textContent = activeTab.title || url;

      // Function to query page with automatic script-injection fallback
      function connectAndFetchFields(tabToScan, isRetry = false) {
        chrome.tabs.sendMessage(tabToScan.id, { type: 'PRAYAS_GET_FIELDS' }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('[PRAYAS Popup] Message failed:', chrome.runtime.lastError.message);

            // Auto-inject content script if this is the first attempt
            if (!isRetry && chrome.scripting) {
              statusMessageEl.textContent = 'Connecting assistant to page...';
              extensionStatusEl.textContent = 'Connecting...';
              extensionStatusEl.className = 'status-pill status-active';

              chrome.scripting.executeScript({
                target: { tabId: tabToScan.id },
                files: ['content/content-script.js']
              }, () => {
                if (chrome.runtime.lastError) {
                  console.warn('[PRAYAS Popup] Auto-inject failed:', chrome.runtime.lastError.message);
                  statusMessageEl.innerHTML = 'Please <strong>refresh page (F5)</strong> to connect.';
                  extensionStatusEl.textContent = 'Needs Refresh';
                  extensionStatusEl.className = 'status-pill status-inactive';
                  return;
                }

                chrome.scripting.insertCSS({
                  target: { tabId: tabToScan.id },
                  files: ['content/content.css']
                }, () => {
                  setTimeout(() => {
                    connectAndFetchFields(tabToScan, true);
                  }, 150);
                });
              });
              return;
            }

            statusMessageEl.innerHTML = 'Please <strong>refresh page (F5)</strong> to connect.';
            extensionStatusEl.textContent = 'Needs Refresh';
            extensionStatusEl.className = 'status-pill status-inactive';
            return;
          }

          if (response && response.success) {
            formCountEl.textContent = response.formsCount ?? 0;
            fieldCountEl.textContent = response.fieldsCount ?? 0;

            const audit = response.auditSummary;
            const repairs = response.activeRepairsCount ?? 0;

            if (audit) {
              renderAuditIssues(audit, repairs);
            }

            renderFieldsList(response.fields || []);
            extensionStatusEl.textContent = 'Ready';
            extensionStatusEl.className = 'status-pill status-active';

            // Request structured Scorecard
            chrome.tabs.sendMessage(tabToScan.id, { type: 'PRAYAS_GET_SCORECARD' }, (scRes) => {
              if (scRes && scRes.success && scRes.scorecard) {
                renderScorecardData(scRes.scorecard);
              }
            });

            // Request Autofill Preview
            if (cachedPassport) {
              chrome.tabs.sendMessage(
                tabToScan.id,
                { type: 'PRAYAS_PREVIEW_AUTOFILL', passport: cachedPassport },
                (prevRes) => {
                  if (prevRes && prevRes.success) {
                    renderAutofillPreview(prevRes.matchedFields || []);
                    const matchedCount = (prevRes.matchedFields || []).length;
                    statusMessageEl.textContent = `Ready! Found ${matchedCount} matching field(s) for your Passport.`;
                  }
                }
              );
            }
          }
        });
      }

      connectAndFetchFields(activeTab, false);
    } catch (error) {
      console.error('[PRAYAS Popup] Scan/audit error:', error);
      statusMessageEl.textContent = 'Error during page scan.';
    }
  }

  async function confirmAutofill() {
    if (!activeTabId || selectedFieldsMap.size === 0) return;

    try {
      confirmAutofillBtn.disabled = true;
      statusMessageEl.textContent = 'Autofilling selected fields...';

      const fieldsToFill = Array.from(selectedFieldsMap.values());

      chrome.tabs.sendMessage(
        activeTabId,
        { type: 'PRAYAS_EXECUTE_AUTOFILL', fieldsToFill },
        (res) => {
          if (chrome.runtime.lastError) {
            statusMessageEl.textContent = 'Autofill execution failed.';
            confirmAutofillBtn.disabled = false;
            return;
          }

          if (res && res.success) {
            statusMessageEl.textContent = `✓ Successfully autofilled ${res.filledCount} field(s)! Please review your application.`;
            confirmAutofillBtn.textContent = '✓ Fields Autofilled';
            setTimeout(() => {
              updateConfirmButton();
              confirmAutofillBtn.textContent = `✨ Confirm & Autofill Selected (${selectedFieldsMap.size})`;
            }, 3000);
          }
        }
      );
    } catch (e) {
      console.error('[PRAYAS Popup] Autofill error:', e);
      statusMessageEl.textContent = 'Error during autofill.';
    }
  }

  async function applySafeFixes() {
    if (!activeTabId) return;

    try {
      applyFixesBtn.disabled = true;
      statusMessageEl.textContent = 'Applying safe accessibility improvements...';

      chrome.tabs.sendMessage(activeTabId, { type: 'PRAYAS_APPLY_FIXES' }, (response) => {
        if (chrome.runtime.lastError) {
          statusMessageEl.textContent = 'Failed to apply improvements.';
          applyFixesBtn.disabled = false;
          return;
        }

        if (response && response.success) {
          statusMessageEl.textContent = `Successfully applied ${response.appliedCount} safe ARIA improvement(s)!`;
          performScanAndAudit();
        }
      });
    } catch (e) {
      console.error('[PRAYAS Popup] Apply fixes error:', e);
      statusMessageEl.textContent = 'Error applying improvements.';
    }
  }

  async function undoSafeFixes() {
    if (!activeTabId) return;

    try {
      undoFixesBtn.disabled = true;
      statusMessageEl.textContent = 'Reverting accessibility changes...';

      chrome.tabs.sendMessage(activeTabId, { type: 'PRAYAS_UNDO_FIXES' }, (response) => {
        if (chrome.runtime.lastError) {
          statusMessageEl.textContent = 'Failed to revert changes.';
          undoFixesBtn.disabled = false;
          return;
        }

        if (response && response.success) {
          statusMessageEl.textContent = `Reverted ${response.revertedCount} element(s) back to original state.`;
          performScanAndAudit();
        }
      });
    } catch (e) {
      console.error('[PRAYAS Popup] Undo fixes error:', e);
      statusMessageEl.textContent = 'Error reverting changes.';
    }
  }

  /**
   * Submits structured scorecard to FastAPI backend with explicit user consent.
   */
  async function submitScorecardToBackend() {
    if (!auditConsentCheckbox.checked) {
      statusMessageEl.textContent = 'Consent is required to submit report.';
      return;
    }

    if (!currentScorecard) {
      statusMessageEl.textContent = 'No scorecard data available to submit.';
      return;
    }

    try {
      submitScorecardBtn.disabled = true;
      statusMessageEl.textContent = 'Transmitting scorecard to backend...';

      const res = await chrome.runtime.sendMessage({
        type: 'PRAYAS_SUBMIT_AUDIT',
        report: currentScorecard
      });

      if (res && res.success) {
        if (res.source === 'BACKEND_API') {
          statusMessageEl.textContent = `✓ Scorecard uploaded to server (ID: ${res.reportId})!`;
        } else {
          statusMessageEl.textContent = '✓ Scorecard saved locally (Offline mode; will sync online).';
        }
        submitScorecardBtn.textContent = '✓ Sent';
        setTimeout(() => {
          submitScorecardBtn.disabled = false;
          submitScorecardBtn.textContent = '📤 Send to Server';
        }, 3000);
      } else {
        statusMessageEl.textContent = 'Failed to submit scorecard.';
        submitScorecardBtn.disabled = false;
      }
    } catch (e) {
      console.error('[PRAYAS Popup] Submit scorecard error:', e);
      statusMessageEl.textContent = 'Error submitting scorecard.';
      submitScorecardBtn.disabled = false;
    }
  }

  /**
   * Exports structured scorecard as a downloadable JSON document.
   */
  function exportScorecardJson() {
    if (!currentScorecard) {
      statusMessageEl.textContent = 'No scorecard to export.';
      return;
    }

    try {
      const jsonStr = JSON.stringify(currentScorecard, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prayas_a11y_scorecard_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      statusMessageEl.textContent = '✓ Scorecard exported as JSON!';
    } catch (e) {
      console.error('[PRAYAS Popup] Export error:', e);
      statusMessageEl.textContent = 'Error exporting scorecard.';
    }
  }

  // Voice Navigation Commands (Stage 8)
  async function sendVoiceCommand(command, target = null) {
    if (!activeTabId) {
      if (voiceAnnouncementText) voiceAnnouncementText.textContent = 'No active tab connected.';
      return;
    }
    if (voiceAnnouncementText) voiceAnnouncementText.textContent = `Processing voice command: ${command}...`;

    try {
      chrome.tabs.sendMessage(activeTabId, {
        type: 'PRAYAS_VOICE_COMMAND',
        command,
        target
      }, (response) => {
        if (chrome.runtime.lastError) {
          if (voiceAnnouncementText) voiceAnnouncementText.textContent = 'Error: Cannot communicate with active tab.';
          return;
        }
        if (response && response.success) {
          if (voiceAnnouncementText) {
            voiceAnnouncementText.textContent = response.announcement || `Command executed: ${command}`;
          }
          if (statusMessageEl) {
            statusMessageEl.textContent = `Voice: ${response.fieldLabel || response.target || 'Action complete'}`;
          }
        } else {
          if (voiceAnnouncementText) {
            voiceAnnouncementText.textContent = response?.error || 'Command rejected.';
          }
        }
      });
    } catch (e) {
      console.error('[PRAYAS Popup] Voice command error:', e);
      if (voiceAnnouncementText) voiceAnnouncementText.textContent = 'Exception dispatching voice command.';
    }
  }

  // Bind actions
  if (confirmAutofillBtn) confirmAutofillBtn.addEventListener('click', confirmAutofill);
  if (applyFixesBtn) applyFixesBtn.addEventListener('click', applySafeFixes);
  if (undoFixesBtn) undoFixesBtn.addEventListener('click', undoSafeFixes);
  if (scanBtn) scanBtn.addEventListener('click', performScanAndAudit);
  if (checkBackendBtn) checkBackendBtn.addEventListener('click', checkBackend);
  if (submitScorecardBtn) submitScorecardBtn.addEventListener('click', submitScorecardToBackend);
  if (exportScorecardBtn) exportScorecardBtn.addEventListener('click', exportScorecardJson);

  // Bind voice navigation
  if (voiceNextBtn) voiceNextBtn.addEventListener('click', () => sendVoiceCommand('NEXT_FIELD'));
  if (voicePrevBtn) voicePrevBtn.addEventListener('click', () => sendVoiceCommand('PREVIOUS_FIELD'));
  if (voiceReadBtn) voiceReadBtn.addEventListener('click', () => sendVoiceCommand('READ_CURRENT_FIELD'));
  if (voiceJumpBtn) {
    voiceJumpBtn.addEventListener('click', () => {
      const q = voiceJumpInput ? voiceJumpInput.value.trim() : '';
      if (q) sendVoiceCommand('FOCUS_FIELD', q);
    });
  }
  if (voiceJumpInput) {
    voiceJumpInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = voiceJumpInput.value.trim();
        if (q) sendVoiceCommand('FOCUS_FIELD', q);
      }
    });
  }

  if (auditConsentCheckbox) {
    auditConsentCheckbox.addEventListener('change', () => {
      submitScorecardBtn.disabled = !auditConsentCheckbox.checked;
    });
  }

  const popoutWindowBtn = document.getElementById('popoutWindowBtn');
  if (popoutWindowBtn) {
    if (window.location.search.includes('popout=true')) {
      popoutWindowBtn.style.display = 'none';
    } else {
      popoutWindowBtn.addEventListener('click', () => {
        const popoutUrl = chrome.runtime.getURL(`popup/popup.html?tabId=${activeTabId}&popout=true`);
        chrome.windows.create({
          url: popoutUrl,
          type: 'popup',
          width: 440,
          height: 750,
          top: 80,
          left: 80
        });
        window.close();
      });
    }
  }

  // Initial load
  performScanAndAudit();
});
