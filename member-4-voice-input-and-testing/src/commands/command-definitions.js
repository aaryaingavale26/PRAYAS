/**
 * PRAYAS 3.0 - Intelligent Command Engine & Intent Classifier (Member 4)
 * 
 * Upgraded with Natural Language Intent Detection:
 * - Robust synonym & phrasing intent mapping
 * - Filler word stripping, lowercase & punctuation normalization
 * - Fuzzy token similarity & Levenshtein matching for speech transcription errors
 * - Friendly clarifying fallback questions for borderline confidence
 * - Strict security guardrail against unapproved arbitrary code execution
 */

export const IntentType = Object.freeze({
  READ_PAGE: 'READ_PAGE',
  READ_QUESTION: 'READ_QUESTION',
  NEXT_FIELD: 'NEXT_FIELD',
  PREV_FIELD: 'PREV_FIELD',
  STOP_READING: 'STOP_READING',
  FILL_DETAILS: 'FILL_DETAILS',
  AI_DRAFT: 'AI_DRAFT',
  HELP: 'HELP',
  REPEAT: 'REPEAT',
  SKIP: 'SKIP',
  CONFIRM_YES: 'CONFIRM_YES',
  CONFIRM_NO: 'CONFIRM_NO',
  VOICE_CALL: 'VOICE_CALL',
  UNKNOWN: 'UNKNOWN'
});

/**
 * Common verbal filler phrases to strip out when matching intents.
 */
const FILLER_PHRASES = [
  /^(please|can you|could you|would you|will you)\s+/i,
  /^(hey|hello|hi|okay|ok)\s+(prayas|olivia|assistant)?\s*/i,
  /^(prayas|olivia)\s+/i,
  /^(i want to|i'd like to|i need to|help me to)\s+/i,
  /^(just|kindly|tell me|explain to me)\s+/i,
  /\s+(please|thank you|thanks)$/i
];

/**
 * Levenshtein distance between two strings.
 */
export function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Normalized string similarity (0.0 to 1.0).
 */
export function stringSimilarity(str1, str2) {
  const s1 = (str1 || '').trim().toLowerCase();
  const s2 = (str2 || '').trim().toLowerCase();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  const maxLen = Math.max(s1.length, s2.length);
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Token overlap (Jaccard similarity).
 */
export function tokenSimilarity(str1, str2) {
  const tokens1 = new Set(str1.toLowerCase().split(/\s+/).filter(Boolean));
  const tokens2 = new Set(str2.toLowerCase().split(/\s+/).filter(Boolean));
  if (tokens1.size === 0 || tokens2.size === 0) return 0;
  let intersection = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) intersection++;
  }
  const union = new Set([...tokens1, ...tokens2]).size;
  return intersection / union;
}

/**
 * Normalizes input speech string by trimming, lowercasing, and stripping punctuation.
 * @param {string} rawText 
 * @param {boolean} [stripFillers=false]
 * @returns {string}
 */
export function normalizeTranscript(rawText, stripFillers = false) {
  if (!rawText) return '';
  let cleaned = rawText
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"!@+]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (stripFillers) {
    for (const pattern of FILLER_PHRASES) {
      cleaned = cleaned.replace(pattern, '').trim();
    }
  }
  return cleaned;
}

/**
 * Comprehensive Intent Definitions with wide natural phrasing & synonyms.
 */
export const COMMAND_DEFINITIONS = [
  {
    intent: IntentType.READ_PAGE,
    label: 'Read This Page',
    spokenFeedback: 'Reading page overview.',
    clarification: 'Did you want me to read the page overview?',
    patterns: [
      /^read (this )?page$/i,
      /^summarize (this )?page$/i,
      /^what('s| is) on this page$/i,
      /^overview (of )?page$/i,
      /^page (info|information|overview|summary)$/i,
      /^tell me about this page$/i,
      /^how many fields( are on this page)?$/i,
      /^describe (this )?page$/i,
      /^read whole page$/i
    ],
    phrases: [
      'read page', 'read this page', 'summarize page', 'what is on this page',
      'page info', 'page overview', 'tell me about this page', 'page summary'
    ]
  },
  {
    intent: IntentType.READ_QUESTION,
    label: 'Read Question',
    spokenFeedback: 'Reading current question.',
    clarification: 'Did you want me to read the current question?',
    patterns: [
      /^read (the |this )?(current )?question$/i,
      /^read (the |this )?(current )?field$/i,
      /^what('s| is) (the |this )?(current )?(question|field)$/i,
      /^what does this ask$/i,
      /^can you read that out$/i,
      /^tell me the question$/i,
      /^what('s| is) this field$/i,
      /^read prompt$/i,
      /^read this out$/i,
      /^repeat (the )?question$/i,
      /^what am i filling here$/i,
      /^what is (this|the) question asking$/i,
      /^what is required here$/i,
      /^explain (the |this )?field$/i,
      /^what does it say$/i,
      /^read active field$/i,
      /^tell me what to write$/i,
      /^what are they asking$/i,
      /^question details$/i,
      /^read it( to me)?$/i,
      /^read current$/i,
      /^read$/i
    ],
    phrases: [
      'read question', 'read the question', 'what does this ask', 'can you read that out',
      'tell me the question', 'what is this field', 'what is the question', 'read this out',
      'repeat question', 'read prompt', 'what am i filling here', 'explain this field',
      'what does it say', 'read active field', 'tell me what to write', 'what are they asking',
      'question details', 'read field', 'read current question', 'read the prompt'
    ]
  },
  {
    intent: IntentType.NEXT_FIELD,
    label: 'Next Field',
    spokenFeedback: 'Moving to next field.',
    clarification: 'Did you mean move to the next field?',
    patterns: [
      /^next( field| input| question)?$/i,
      /^go to next( field| input)?$/i,
      /^move forward$/i,
      /^forward$/i,
      /^skip to next$/i,
      /^go next$/i,
      /^advance$/i,
      /^continue$/i,
      /^next one$/i,
      /^proceed$/i,
      /^next please$/i
    ],
    phrases: [
      'next field', 'go to next field', 'next', 'forward', 'move forward',
      'advance', 'continue', 'proceed', 'go next', 'next input', 'skip to next'
    ]
  },
  {
    intent: IntentType.PREV_FIELD,
    label: 'Previous Field',
    spokenFeedback: 'Moving to previous field.',
    clarification: 'Did you mean go back to the previous field?',
    patterns: [
      /^(previous|prev)( field| input| question)?$/i,
      /^go back( one field)?$/i,
      /^back( field| input)?$/i,
      /^prior (field|input)$/i,
      /^return to previous$/i,
      /^last field$/i,
      /^move back$/i,
      /^step back$/i
    ],
    phrases: [
      'previous field', 'prev field', 'go back', 'back', 'previous',
      'prior field', 'last field', 'return to previous', 'move back'
    ]
  },
  {
    intent: IntentType.STOP_READING,
    label: 'Stop Reading',
    spokenFeedback: 'Stopped.',
    clarification: 'Did you want me to stop audio?',
    patterns: [
      /^stop( reading| talking| speaking| audio)?$/i,
      /^quiet$/i,
      /^silence$/i,
      /^pause( speech)?$/i,
      /^shut up$/i,
      /^cancel$/i,
      /^halt$/i,
      /^be quiet$/i,
      /^mute$/i,
      /^stop now$/i
    ],
    phrases: [
      'stop reading', 'stop', 'quiet', 'silence', 'pause',
      'halt', 'cancel', 'be quiet', 'stop talking', 'mute'
    ]
  },
  {
    intent: IntentType.FILL_DETAILS,
    label: 'Fill My Details',
    spokenFeedback: 'Filling your profile details.',
    clarification: 'Did you want me to autofill your confirmed profile details?',
    patterns: [
      /^fill (my |the )?details$/i,
      /^fill (my |the )?profile$/i,
      /^autofill( details| profile| form)?$/i,
      /^populate (my )?details$/i,
      /^fill form$/i,
      /^fill this for me$/i,
      /^enter my information$/i,
      /^fill in my details$/i,
      /^fill it for me$/i,
      /^auto fill$/i
    ],
    phrases: [
      'fill my details', 'fill details', 'autofill', 'fill profile',
      'populate details', 'fill form', 'fill this for me', 'enter my information',
      'autofill form', 'fill it for me', 'fill in my details'
    ]
  },
  {
    intent: IntentType.AI_DRAFT,
    label: 'AI Draft Answer',
    spokenFeedback: 'Searching your resume to draft an answer.',
    clarification: 'Would you like me to draft an answer using your resume?',
    patterns: [
      /^ai (draft|help|assist)$/i,
      /^draft (an? )?(answer|response)$/i,
      /^help me (write|draft|answer)( this)?$/i,
      /^suggest an? answer$/i,
      /^generate (an? )?(answer|draft)$/i,
      /^write an? answer( for me)?$/i,
      /^can ai (write|draft) this$/i,
      /^draft this$/i
    ],
    phrases: [
      'ai draft', 'draft an answer', 'help me write this', 'suggest an answer',
      'generate answer', 'draft response', 'ai help', 'draft with ai'
    ]
  },
  {
    intent: IntentType.HELP,
    label: 'Help & Voice Commands',
    spokenFeedback: 'Here are the commands you can use.',
    clarification: 'Would you like to hear the list of voice commands?',
    patterns: [
      /^help( me)?$/i,
      /^what can i say$/i,
      /^what are (the )?commands$/i,
      /^list commands$/i,
      /^how does this work$/i,
      /^voice options$/i,
      /^commands$/i
    ],
    phrases: [
      'help', 'what can i say', 'commands', 'list commands', 'how does this work', 'voice commands'
    ]
  },
  {
    intent: IntentType.REPEAT,
    label: 'Repeat Question',
    spokenFeedback: 'Repeating the question.',
    clarification: 'Did you want me to repeat the last question?',
    patterns: [
      /^repeat( that| this| question)?$/i,
      /^say that again$/i,
      /^what did you say$/i,
      /^one more time$/i,
      /^pardon( me)?$/i,
      /^again please$/i
    ],
    phrases: [
      'repeat that', 'say that again', 'what did you say', 'repeat', 'one more time'
    ]
  },
  {
    intent: IntentType.SKIP,
    label: 'Skip Field',
    spokenFeedback: 'Skipping to next field.',
    clarification: 'Did you want to skip this field?',
    patterns: [
      /^skip( this| field| question)?$/i,
      /^pass$/i,
      /^leave (it )?(blank|empty)$/i,
      /^move on$/i
    ],
    phrases: [
      'skip', 'skip this', 'pass', 'leave blank', 'move on', 'skip question'
    ]
  },
  {
    intent: IntentType.CONFIRM_YES,
    label: 'Confirm Yes',
    spokenFeedback: 'Confirmed.',
    clarification: 'Did you say yes?',
    patterns: [
      /^(yes|yeah|yep|sure|correct|right|confirm|accept|insert|affirmative)$/i,
      /^(sounds good|looks good|that's right|go ahead|yes please)$/i
    ],
    phrases: [
      'yes', 'yeah', 'sure', 'correct', 'that is right', 'sounds good', 'confirm', 'accept'
    ]
  },
  {
    intent: IntentType.CONFIRM_NO,
    label: 'Confirm No',
    spokenFeedback: 'Declined.',
    clarification: 'Did you say no or cancel?',
    patterns: [
      /^(no|nope|cancel|reject|discard|incorrect|wrong|negative)$/i,
      /^(change it|don't|not right|never mind|change my answer)$/i
    ],
    phrases: [
      'no', 'nope', 'cancel', 'reject', 'change my answer', 'incorrect', 'not right', 'discard'
    ]
  },
  {
    intent: IntentType.VOICE_CALL,
    label: 'Voice Call',
    spokenFeedback: 'Connecting you to voice call with Olivia.',
    clarification: 'Would you like to start a voice call with Olivia?',
    patterns: [
      /^(start )?(voice )?call$/i,
      /^call (olivia|assistant)$/i,
      /^talk to (olivia|assistant|me)$/i,
      /^voice call mode$/i,
      /^interview mode$/i
    ],
    phrases: [
      'voice call', 'start voice call', 'call olivia', 'start call', 'talk to olivia'
    ]
  }
];

/**
 * Malicious / arbitrary code patterns to explicitly block.
 */
const SECURITY_DISALLOWED = [
  /console\s*\.\s*log/i,
  /alert\s*\(/i,
  /eval\s*\(/i,
  /document\s*\.\s*cookie/i,
  /window\s*\./i,
  /<script/i,
  /submit\s+(application|form)/i,
  /drop\s+table/i
];

/**
 * Evaluates a spoken transcript against the validated command engine using multi-tier NLP:
 * 1. Security rejection of arbitrary code / unsafe commands
 * 2. Exact regex pattern matching (Confidence 1.0)
 * 3. Stripped-filler regex matching (Confidence 0.95)
 * 4. Token & Levenshtein semantic fuzzy matching against synonym bank (Confidence 0.75 - 0.9)
 * 5. Borderline classification triggering a friendly clarifying question
 * 
 * @param {string} rawTranscript 
 * @returns {{ intent: string, definition: Object|null, confidence: number, clarification?: string, rawTranscript: string }}
 */
export function matchCommandIntent(rawTranscript) {
  if (!rawTranscript) {
    return { intent: IntentType.UNKNOWN, definition: null, confidence: 0, rawTranscript: '' };
  }

  // Security Guard: Check for code injection or unapproved destructive actions
  for (const dangerous of SECURITY_DISALLOWED) {
    if (dangerous.test(rawTranscript)) {
      return {
        intent: IntentType.UNKNOWN,
        definition: null,
        confidence: 0,
        rawTranscript,
        securityBlocked: true
      };
    }
  }

  const rawNormalized = normalizeTranscript(rawTranscript, false);
  const strippedNormalized = normalizeTranscript(rawTranscript, true);

  if (!rawNormalized && !strippedNormalized) {
    return { intent: IntentType.UNKNOWN, definition: null, confidence: 0, rawTranscript };
  }

  // Tier 1: Exact Pattern Matching
  for (const def of COMMAND_DEFINITIONS) {
    for (const pattern of def.patterns) {
      if (pattern.test(rawNormalized) || (strippedNormalized && pattern.test(strippedNormalized))) {
        return {
          intent: def.intent,
          definition: def,
          confidence: 1.0,
          rawTranscript
        };
      }
    }
  }

  // Tier 2: Synonym & Semantic Keyword Matching
  // e.g. "what does this ask", "can you read that out", "tell me the question", "what's this field"
  let bestMatch = null;
  let highestScore = 0;

  for (const def of COMMAND_DEFINITIONS) {
    if (!def.phrases) continue;

    for (const phrase of def.phrases) {
      // 1. Check substring inclusion
      if (rawNormalized.includes(phrase) || strippedNormalized.includes(phrase)) {
        const score = 0.92;
        if (score > highestScore) {
          highestScore = score;
          bestMatch = def;
        }
      }

      // 2. Token overlap similarity
      const tSim = tokenSimilarity(strippedNormalized || rawNormalized, phrase);
      if (tSim > 0.65 && tSim > highestScore) {
        highestScore = tSim;
        bestMatch = def;
      }

      // 3. String edit similarity (handles speech recognition typos like "red question")
      const sSim = stringSimilarity(strippedNormalized || rawNormalized, phrase);
      if (sSim > 0.78 && sSim > highestScore) {
        highestScore = sSim;
        bestMatch = def;
      }
    }
  }

  // High confidence fuzzy match
  if (bestMatch && highestScore >= 0.70) {
    return {
      intent: bestMatch.intent,
      definition: bestMatch,
      confidence: Math.min(0.95, highestScore),
      rawTranscript
    };
  }

  // Borderline match: suggest friendly clarification question
  if (bestMatch && highestScore >= 0.45) {
    return {
      intent: bestMatch.intent,
      definition: bestMatch,
      confidence: highestScore,
      needsClarification: true,
      clarification: bestMatch.clarification || `Did you mean ${bestMatch.label}?`,
      rawTranscript
    };
  }

  // Unknown command
  return {
    intent: IntentType.UNKNOWN,
    definition: null,
    confidence: 0,
    rawTranscript
  };
}
