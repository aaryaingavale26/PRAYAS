/**
 * PRAYAS 3.0 - Background Service Worker (Stage 6: Backend Connection)
 * Team ByteShastra | Member 3: Chrome Extension & DOM
 * 
 * Responsibilities:
 * - Extension lifecycle management
 * - Secure communication broker to Member 2's FastAPI Backend (http://localhost:8000)
 * - Safe bearer token storage & authorization header injection
 * - Resilient offline fallback caching when backend is unavailable
 * - Handles /api/profile, /api/audit-report, /api/rag-answer, and /api/health
 */

console.log('[PRAYAS 3.0] Background Service Worker initialized.');

const DEFAULT_PASSPORT = {
  fullName: 'Priyanshu Sharma',
  email: 'priyanshu.sharma@example.com',
  phone: '+91 98765 43210',
  currentCity: 'Bengaluru, Karnataka',
  portfolioUrl: 'https://github.com/priyanshu-sharma',
  experienceLevel: 'senior',
  professionalSummary: 'Senior Frontend Engineer with 6+ years specializing in accessible web platforms, WCAG 2.2 AA compliance, and keyboard/screen-reader assistive tools.',
  accommodations: 'Screen reader compatible development tools (NVDA/JAWS), high-contrast display interfaces, and flexible pacing for technical assessments.',
  remotePreference: true
};

chrome.runtime.onInstalled.addListener((details) => {
  console.log(`[PRAYAS 3.0] Installed successfully (Reason: ${details.reason}).`);
  
  chrome.storage.local.get(['passportProfile', 'backendUrl', 'authToken'], (res) => {
    chrome.storage.local.set({
      passportProfile: res.passportProfile || DEFAULT_PASSPORT,
      backendUrl: res.backendUrl || 'http://localhost:8000',
      authToken: res.authToken || 'prayas_demo_bearer_token',
      prayasEnabled: true,
      auditConsent: true,
      lastAuditResult: null
    });
  });
});

/**
 * Robust fetch wrapper with configurable timeout using AbortController.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timer);
    return response;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

/**
 * Checks connection health with FastAPI backend.
 */
async function checkBackendHealth() {
  const config = await chrome.storage.local.get(['backendUrl']);
  const backendUrl = config.backendUrl || 'http://localhost:8000';
  const startTime = Date.now();

  try {
    const res = await fetchWithTimeout(`${backendUrl}/api/health`, { method: 'GET' }, 2000);
    const latencyMs = Date.now() - startTime;
    return {
      connected: res.ok,
      status: res.status,
      backendUrl,
      latencyMs
    };
  } catch (err) {
    return {
      connected: false,
      backendUrl,
      error: 'Backend unreachable (Offline / Standalone mode)'
    };
  }
}

/**
 * Retrieves the candidate's Accessibility Passport.
 * First attempts FastAPI GET /api/profile. Falls back gracefully to local cache if offline.
 */
async function getPassportProfile() {
  const config = await chrome.storage.local.get(['backendUrl', 'authToken', 'passportProfile']);
  const backendUrl = config.backendUrl || 'http://localhost:8000';
  const authToken = config.authToken;
  const cachedPassport = config.passportProfile || DEFAULT_PASSPORT;

  try {
    const response = await fetchWithTimeout(`${backendUrl}/api/profile`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    }, 3000);

    if (response.status === 200) {
      const data = await response.json();
      if (data && data.passport) {
        // Cache freshly retrieved passport
        await chrome.storage.local.set({ passportProfile: data.passport });
        return {
          success: true,
          source: 'BACKEND_API',
          passport: data.passport
        };
      }
    } else if (response.status === 401) {
      return {
        success: false,
        error: 'AUTH_REQUIRED',
        message: 'Authentication token is invalid or expired. Using local profile.',
        passport: cachedPassport
      };
    }
  } catch (netErr) {
    console.warn('[PRAYAS 3.0 Backend] Network fetch failed, falling back to local storage cache:', netErr.message);
  }

  // Graceful offline fallback
  return {
    success: true,
    source: 'OFFLINE_CACHE',
    warning: 'FastAPI backend is offline; using cached Accessibility Passport.',
    passport: cachedPassport
  };
}

/**
 * Sends an accessibility audit report to FastAPI backend POST /api/audit-report.
 * If backend is offline, queues the report locally in chrome.storage.local.
 */
async function postAuditReport(report) {
  const config = await chrome.storage.local.get(['backendUrl', 'authToken', 'pendingReports']);
  const backendUrl = config.backendUrl || 'http://localhost:8000';
  const authToken = config.authToken;

  try {
    const response = await fetchWithTimeout(`${backendUrl}/api/audit-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(report)
    }, 3500);

    if (response.ok) {
      const resJson = await response.json();
      return {
        success: true,
        source: 'BACKEND_API',
        reportId: resJson.reportId || 'ack_success'
      };
    }
  } catch (error) {
    console.warn('[PRAYAS 3.0 Backend] Failed to post audit report to server, storing locally:', error.message);
  }

  // Queue locally
  const pending = config.pendingReports || [];
  pending.push({ ...report, queuedAt: new Date().toISOString() });
  await chrome.storage.local.set({ pendingReports: pending });

  return {
    success: true,
    source: 'QUEUED_OFFLINE',
    message: 'Audit report saved locally. Will sync when backend is reachable.'
  };
}

/**
 * Requests draft answer assistance from backend RAG pipeline.
 */
async function requestRagAnswer(payload) {
  const config = await chrome.storage.local.get(['backendUrl', 'authToken']);
  const backendUrl = config.backendUrl || 'http://localhost:8000';
  const authToken = config.authToken;

  try {
    const response = await fetchWithTimeout(`${backendUrl}/api/rag-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    }, 5000);

    if (response.ok) {
      const data = await response.json();
      return { success: true, draftAnswer: data.draftAnswer, sourcesUsed: data.sourcesUsed };
    }
    return { success: false, error: `Server error: HTTP ${response.status}` };
  } catch (err) {
    return {
      success: false,
      error: 'BACKEND_OFFLINE',
      message: 'AI draft answers require an active FastAPI server connection.'
    };
  }
}

// Runtime message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PRAYAS_GET_PASSPORT') {
    getPassportProfile().then(sendResponse);
    return true;
  }

  if (message.type === 'PRAYAS_SAVE_PASSPORT') {
    if (message.passport) {
      chrome.storage.local.set({ passportProfile: message.passport }, () => {
        sendResponse({ success: true, passport: message.passport });
      });
      return true;
    }
  }

  if (message.type === 'PRAYAS_CHECK_BACKEND') {
    checkBackendHealth().then(sendResponse);
    return true;
  }

  if (message.type === 'PRAYAS_SUBMIT_AUDIT') {
    postAuditReport(message.report).then(sendResponse);
    return true;
  }

  if (message.type === 'PRAYAS_REQUEST_RAG') {
    requestRagAnswer(message.payload).then(sendResponse);
    return true;
  }
});
