/**
 * PRAYAS 3.0 - Popup Controller (Member 3)
 * Provides interactive Image 3 controls & Image 2 Voice Call experience with Prayas.AI branding
 */

document.addEventListener('DOMContentLoaded', () => {
  const mainView = document.getElementById('mainPanelView');
  const callView = document.getElementById('callScreenView');
  const statusBox = document.getElementById('statusBox');
  const readyPill = document.getElementById('readyPill');
  const readyPillText = document.getElementById('readyPillText');
  const btnTapSpeak = document.getElementById('btnTapSpeak');
  const btnStopAudio = document.getElementById('btnStopAudio');
  const btnStartVoiceCall = document.getElementById('btnStartVoiceCall');
  const commandForm = document.getElementById('commandForm');
  const commandInput = document.getElementById('commandInput');

  // User Identity Strip
  const userIdentityStrip = document.getElementById('userIdentityStrip');
  const userEmailText = document.getElementById('userEmailText');
  const userLoginLink = document.getElementById('userLoginLink');

  // Voice Call Elements
  const callBackBtn = document.getElementById('callBackBtn');
  const callMinBtn = document.getElementById('callMinBtn');
  const callTimer = document.getElementById('callTimer');
  const callStatusPill = document.getElementById('callStatusPill');
  const callLiveTranscript = document.getElementById('callLiveTranscript');
  const callAvatarContainer = document.getElementById('callAvatarContainer');
  const callSpeakerBtn = document.getElementById('callSpeakerBtn');
  const callMicBtn = document.getElementById('callMicBtn');
  const callEndBtn = document.getElementById('callEndBtn');
  const callSkipBtn = document.getElementById('callSkipBtn');
  const callPrevBtn = document.getElementById('callPrevBtn');
  const callNextBtn = document.getElementById('callNextBtn');
  const callProgressBadge = document.getElementById('callProgressBadge');

  let activeTabId = null;
  let isCallActive = false;
  let callTimerInterval = null;
  let callSeconds = 0;
  let isCallMuted = false;
  let speechRecognizer = null;
  let currentUserSession = null;

  // Locate active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      activeTabId = tabs[0].id;
    }
  });

  // Refresh User Identity from chrome.storage
  function updateIdentityDisplay() {
    chrome.storage.local.get(['userSession', 'user_email', 'user_id', 'passportProfile'], (data) => {
      currentUserSession = data.userSession || (data.user_email ? { email: data.user_email, id: data.user_id } : null);
      if (currentUserSession && currentUserSession.email) {
        if (userEmailText) userEmailText.textContent = `Logged in: ${currentUserSession.email}`;
        if (userIdentityStrip) userIdentityStrip.classList.add('logged-in');
        if (userLoginLink) userLoginLink.style.display = 'none';
      } else {
        if (userEmailText) userEmailText.textContent = 'Not logged in to PRAYAS';
        if (userIdentityStrip) userIdentityStrip.classList.remove('logged-in');
        if (userLoginLink) userLoginLink.style.display = 'inline';
      }
    });
  }

  updateIdentityDisplay();
  if (chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(() => updateIdentityDisplay());
  }

  function sendToActiveTab(msg, callback) {
    if (!activeTabId) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          activeTabId = tabs[0].id;
          chrome.tabs.sendMessage(activeTabId, msg, callback || (() => {}));
        }
      });
      return;
    }
    chrome.tabs.sendMessage(activeTabId, msg, callback || (() => {}));
  }

  function speak(text, onEnd) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1.0;
    
    // Choose natural, clear voice
    const voices = window.speechSynthesis.getVoices() || [];
    const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (preferredVoice) u.voice = preferredVoice;

    if (typeof onEnd === 'function') u.onend = onEnd;
    window.speechSynthesis.speak(u);
  }

  function stopSpeech() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // --- SHORTCUT BUTTONS ---
  const commands = {
    'scNext': 'next field',
    'scPrev': 'previous field',
    'scReadQ': 'read question',
    'scPage': 'read this page',
    'scAutofill': 'fill my details',
    'scDraft': 'ai draft'
  };

  Object.entries(commands).forEach(([btnId, cmd]) => {
    const el = document.getElementById(btnId);
    if (el) {
      el.addEventListener('click', () => {
        statusBox.textContent = `Running: "${cmd}"...`;
        executeCommand(cmd);
      });
    }
  });

  // Type Command / Answer Form (Requirement B)
  commandForm.addEventListener('submit', () => {
    const val = commandInput.value.trim();
    if (val) {
      const lower = val.toLowerCase();
      // Check if it's an explicit navigation/action command
      const isExplicitCmd = ['next', 'prev', 'previous', 'skip', 'read', 'page', 'fill', 'autofill', 'draft', 'call'].some(c => lower.startsWith(c));
      
      if (isExplicitCmd) {
        statusBox.textContent = `Running command: "${val}"...`;
        executeCommand(val);
      } else {
        // Treat as answer input for currently active/focused field
        statusBox.textContent = `Entering text: "${val}"...`;
        sendToActiveTab({ type: 'INSERT_DRAFT_ANSWER', payload: { text: val } }, (res) => {
          if (res?.success) {
            statusBox.textContent = `✓ Entered "${val}" into field.`;
            speak(`Entered ${val}.`);
          } else {
            executeCommand(val);
          }
        });
      }
      commandInput.value = '';
    }
  });

  function executeCommand(text) {
    const lower = text.toLowerCase();
    if (lower.includes('next')) {
      sendToActiveTab({ type: 'PRAYAS_VOICE_COMMAND', command: 'NEXT_FIELD' }, (res) => {
        statusBox.textContent = res?.announcement || 'Moved to next field. Ready for answer.';
      });
    } else if (lower.includes('prev') || lower.includes('back')) {
      sendToActiveTab({ type: 'PRAYAS_VOICE_COMMAND', command: 'PREVIOUS_FIELD' }, (res) => {
        statusBox.textContent = res?.announcement || 'Moved to previous field.';
      });
    } else if (lower.includes('skip')) {
      sendToActiveTab({ type: 'PRAYAS_VOICE_COMMAND', command: 'SKIP_FIELD' }, (res) => {
        statusBox.textContent = res?.announcement || 'Skipped field.';
      });
    } else if (lower.includes('read') && (lower.includes('question') || lower.includes('field') || lower.includes('prompt') || lower.includes('what'))) {
      sendToActiveTab({ type: 'PRAYAS_VOICE_COMMAND', command: 'READ_CURRENT_FIELD' }, (res) => {
        statusBox.textContent = res?.announcement || 'Read current question.';
      });
    } else if (lower.includes('page') || lower.includes('info')) {
      sendToActiveTab({ type: 'PRAYAS_SCAN_PAGE' }, (res) => {
        const msg = `${res?.pageTitle || 'Page'} contains ${res?.fieldsCount || 0} fields.`;
        statusBox.textContent = msg;
        speak(msg);
      });
    } else if (lower.includes('fill') || lower.includes('autofill')) {
      chrome.storage.local.get(['passportProfile', 'userSession', 'user_email'], (data) => {
        const user = data.userSession || (data.user_email ? { email: data.user_email } : null);
        if (!user || !user.email) {
          const notLoggedInMsg = 'You are not logged in. Please log in on the PRAYAS website first.';
          statusBox.innerHTML = `⚠️ ${notLoggedInMsg} <a href="http://localhost:3000/auth/login" target="_blank" style="color:#1F75E8;font-weight:700;text-decoration:underline;">Log in</a>`;
          speak(notLoggedInMsg);
          return;
        }

        const passport = data.passportProfile;
        if (!passport) {
          statusBox.textContent = 'No Accessibility Passport found. Please fill your profile on the dashboard.';
          speak('No profile data found. Please complete your dashboard profile first.');
          return;
        }

        statusBox.textContent = 'Matching fields with your profile...';
        sendToActiveTab({ type: 'PRAYAS_PREVIEW_AUTOFILL', passport }, (previewRes) => {
          const matched = previewRes?.matchedFields || [];
          const toFill = matched.map(m => ({ prayasId: m.prayasId, valueToFill: m.valueToFill }));
          sendToActiveTab({ type: 'PRAYAS_EXECUTE_AUTOFILL', fieldsToFill: toFill }, (res) => {
            const filledCount = res?.filledCount || 0;
            const unfilled = res?.unfilledFields || [];
            let reportMsg = `Filled ${filledCount} fields from your profile.`;
            if (unfilled.length > 0) {
              reportMsg += ` ${unfilled.length} fields need your input.`;
            }
            statusBox.textContent = `✓ ${reportMsg}`;
            speak(reportMsg);
          });
        });
      });
    } else if (lower.includes('draft') || lower.includes('ai') || lower.includes('help')) {
      sendToActiveTab({ type: 'GET_ACTIVE_QUESTION' }, (qRes) => {
        const question = qRes?.question || 'Professional background and experience';
        statusBox.textContent = '🤖 Asking backend RAG to draft response...';
        speak('Drafting response from your documents.');
        chrome.runtime.sendMessage({
          type: 'PRAYAS_REQUEST_RAG',
          payload: { question, context: 'Application draft' }
        }, (ragRes) => {
          const draftText = ragRes?.draftAnswer || 'I bring proven experience with a strong commitment to quality and accessibility standards.';
          sendToActiveTab({ type: 'INSERT_DRAFT_ANSWER', payload: { text: draftText } }, () => {
            statusBox.textContent = '✓ Draft inserted into target field.';
            speak('Draft inserted into active field. You can review or edit it.');
          });
        });
      });
    } else if (lower.includes('call') || lower.includes('prayas')) {
      startCall();
    } else {
      // Default: forward message
      sendToActiveTab({ type: 'PRAYAS_VOICE_COMMAND', command: 'READ_CURRENT_FIELD' }, (res) => {
        statusBox.textContent = res?.announcement || `Processed command: "${text}"`;
      });
    }
  }

  // Tap & Speak Push-to-Talk
  btnTapSpeak.addEventListener('click', () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      statusBox.textContent = 'Speech recognition requires Chrome or Edge.';
      speak('Speech recognition is not supported in this browser.');
      return;
    }

    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch (e) {}
      speechRecognizer = null;
      btnTapSpeak.classList.remove('active-listening');
      readyPillText.textContent = 'READY';
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'en-US';
      rec.continuous = false;
      rec.interimResults = true;

      rec.onstart = () => {
        btnTapSpeak.classList.add('active-listening');
        readyPillText.textContent = 'LISTENING';
        statusBox.textContent = 'Listening... Speak your command now.';
      };

      rec.onresult = (evt) => {
        const transcript = Array.from(evt.results).map(r => r[0].transcript).join('');
        statusBox.textContent = `Hearing: "${transcript}"`;
        if (evt.results[0].isFinal) {
          executeCommand(transcript);
        }
      };

      rec.onend = () => {
        btnTapSpeak.classList.remove('active-listening');
        readyPillText.textContent = 'READY';
        speechRecognizer = null;
      };

      speechRecognizer = rec;
      rec.start();
    } catch (err) {
      statusBox.textContent = 'Mic error: ' + err.message;
    }
  });

  // Stop Button
  btnStopAudio.addEventListener('click', () => {
    stopSpeech();
    if (speechRecognizer) try { speechRecognizer.stop(); } catch (e) {}
    btnTapSpeak.classList.remove('active-listening');
    readyPillText.textContent = 'READY';
    statusBox.textContent = 'Audio stopped by user.';
  });

  // --- VOICE CALL WITH PRAYAS.AI (IMAGE 2) ---
  btnStartVoiceCall.addEventListener('click', () => {
    startCall();
  });

  callBackBtn.addEventListener('click', () => endCall());
  if (callMinBtn) callMinBtn.addEventListener('click', () => endCall());
  callEndBtn.addEventListener('click', () => endCall());

  // Call Nav & Skip Buttons
  if (callSkipBtn) {
    callSkipBtn.addEventListener('click', () => {
      sendToActiveTab({ type: 'PRAYAS_VOICE_COMMAND', command: 'SKIP_FIELD' }, (res) => {
        callLiveTranscript.textContent = 'Prayas.AI: "Skipped field. Moving to next."';
        updateCallFieldPrompt();
      });
    });
  }

  if (callPrevBtn) {
    callPrevBtn.addEventListener('click', () => {
      sendToActiveTab({ type: 'PRAYAS_VOICE_COMMAND', command: 'PREVIOUS_FIELD' }, (res) => {
        updateCallFieldPrompt();
      });
    });
  }

  if (callNextBtn) {
    callNextBtn.addEventListener('click', () => {
      sendToActiveTab({ type: 'PRAYAS_VOICE_COMMAND', command: 'NEXT_FIELD' }, (res) => {
        updateCallFieldPrompt();
      });
    });
  }

  function startCall() {
    mainView.style.display = 'none';
    callView.style.display = 'flex';
    isCallActive = true;
    isCallMuted = false;
    callSeconds = 0;

    clearInterval(callTimerInterval);
    callTimerInterval = setInterval(() => {
      callSeconds++;
      callTimer.textContent = formatTime(callSeconds);
    }, 1000);

    callStatusPill.textContent = '● SPEAKING...';
    callAvatarContainer.className = 'call-avatar-container speaking';
    const greet = "Hi! I'm Prayas.AI, your accessible application voice assistant. Let's fill out your form together.";
    callLiveTranscript.textContent = `Prayas.AI: "${greet}"`;

    speak(greet, () => {
      if (!isCallActive) return;
      updateCallFieldPrompt();
    });
  }

  function updateCallFieldPrompt() {
    if (!isCallActive) return;
    sendToActiveTab({ type: 'PRAYAS_VOICE_COMMAND', command: 'READ_CURRENT_FIELD' }, (res) => {
      const label = res?.field?.label || 'current field';
      const index = (res?.currentIndex !== undefined ? res.currentIndex + 1 : 1);
      const total = res?.totalFields || 1;
      
      if (callProgressBadge) {
        callProgressBadge.textContent = `Field ${index} of ${total}`;
      }

      const q = `The current field is ${label}. What should I enter?`;
      callStatusPill.textContent = '● SPEAKING...';
      callAvatarContainer.className = 'call-avatar-container speaking';
      callLiveTranscript.textContent = `Prayas.AI: "${q}"`;
      speak(q, () => {
        if (!isCallActive || isCallMuted) return;
        listenCall();
      });
    });
  }

  function listenCall() {
    if (!isCallActive || isCallMuted) return;
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    callStatusPill.textContent = '● LISTENING...';
    callAvatarContainer.className = 'call-avatar-container listening';
    callLiveTranscript.textContent = 'Listening for your answer...';

    const rec = new SpeechRec();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (evt) => {
      const transcript = Array.from(evt.results).map(r => r[0].transcript).join('');
      callLiveTranscript.textContent = `You: "${transcript}"`;
      if (evt.results[0].isFinal) {
        handleCallAnswer(transcript.trim());
      }
    };

    rec.onerror = () => {
      if (!isCallActive) return;
      callStatusPill.textContent = '● WAITING...';
      speak("I didn't catch that. Say your answer, or say next or skip.", () => {
        if (isCallActive) listenCall();
      });
    };

    rec.start();
  }

  function handleCallAnswer(answer) {
    const lower = answer.toLowerCase().trim();
    // Interruption commands only if the entire utterance matches
    const controlPhrases = ['skip', 'next', 'go back', 'previous', 'stop', 'cancel', "i'm done", 'im done', 'help'];
    if (controlPhrases.includes(lower)) {
      if (lower === 'skip') {
        sendToActiveTab({ type: 'PRAYAS_VOICE_COMMAND', command: 'SKIP_FIELD' }, () => {
          speak('Skipped field.', () => updateCallFieldPrompt());
        });
        return;
      }
      if (lower === 'next') {
        sendToActiveTab({ type: 'PRAYAS_VOICE_COMMAND', command: 'NEXT_FIELD' }, () => {
          speak('Moved to next field.', () => updateCallFieldPrompt());
        });
        return;
      }
      if (lower === 'go back' || lower === 'previous') {
        sendToActiveTab({ type: 'PRAYAS_VOICE_COMMAND', command: 'PREVIOUS_FIELD' }, () => {
          speak('Moved to previous field.', () => updateCallFieldPrompt());
        });
        return;
      }
      if (lower === 'stop' || lower === 'cancel' || lower.includes('done')) {
        endCall();
        return;
      }
    }

    // Treat as answer: insert into target field via content script
    sendToActiveTab({ type: 'PRAYAS_DICTATE_ANSWER', answer: answer }, (res) => {
      const filledText = res?.cleanedAnswer || answer;
      const confirm = `I've entered ${filledText}. Is that right?`;
      callStatusPill.textContent = '● CONFIRMING...';
      callAvatarContainer.className = 'call-avatar-container speaking';
      callLiveTranscript.textContent = `Prayas.AI: "${confirm}"`;
      speak(confirm, () => {
        if (!isCallActive) return;
        // Listen for confirmation (yes/no/change/next)
        listenCallConfirmation();
      });
    });
  }

  function listenCallConfirmation() {
    if (!isCallActive || isCallMuted) return;
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    callStatusPill.textContent = '● LISTENING (CONFIRM)...';
    callAvatarContainer.className = 'call-avatar-container listening';

    const rec = new SpeechRec();
    rec.lang = 'en-US';
    rec.continuous = false;

    rec.onresult = (evt) => {
      const transcript = evt.results[0][0].transcript.toLowerCase().trim();
      if (transcript.includes('yes') || transcript.includes('correct') || transcript.includes('right') || transcript.includes('sure') || transcript.includes('next')) {
        sendToActiveTab({ type: 'PRAYAS_VOICE_COMMAND', command: 'NEXT_FIELD' }, () => {
          speak('Great! Moving to the next field.', () => updateCallFieldPrompt());
        });
      } else if (transcript.includes('no') || transcript.includes('change') || transcript.includes('wrong')) {
        speak('Alright, what should I enter instead?', () => listenCall());
      } else {
        // If they spoke another value directly
        handleCallAnswer(transcript);
      }
    };

    rec.onerror = () => {
      if (isCallActive) {
        sendToActiveTab({ type: 'PRAYAS_VOICE_COMMAND', command: 'NEXT_FIELD' }, () => {
          updateCallFieldPrompt();
        });
      }
    };

    rec.start();
  }

  function endCall() {
    isCallActive = false;
    clearInterval(callTimerInterval);
    stopSpeech();
    callView.style.display = 'none';
    mainView.style.display = 'flex';
    statusBox.textContent = 'Voice call finished. You can review the form before submitting.';
  }

  callSpeakerBtn.addEventListener('click', () => {
    speak('Reading current question.', () => {
      sendToActiveTab({ type: 'PRAYAS_VOICE_COMMAND', command: 'READ_CURRENT_FIELD' });
    });
  });

  callMicBtn.addEventListener('click', () => {
    isCallMuted = !isCallMuted;
    callMicBtn.classList.toggle('active-mic', !isCallMuted);
    callMicBtn.textContent = isCallMuted ? '🔇' : '🎤';
    if (isCallMuted) {
      callStatusPill.textContent = '● MUTED';
      stopSpeech();
    } else {
      listenCall();
    }
  });
});
