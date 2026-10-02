/**
 * PRAYAS 3.0 - Command Engine
 * Validated Command Definitions & Whitelist
 * 
 * Strict Intent Mapping:
 * - Read this page
 * - Read question
 * - Next field
 * - Previous field
 * - Stop reading
 * - Fill my details
 * 
 * Security Guard:
 * - Only pre-validated intents can trigger actions. Arbitrary spoken text is rejected.
 */

export const IntentType = Object.freeze({
  READ_PAGE: 'READ_PAGE',
  READ_QUESTION: 'READ_QUESTION',
  NEXT_FIELD: 'NEXT_FIELD',
  PREV_FIELD: 'PREV_FIELD',
  STOP_READING: 'STOP_READING',
  FILL_DETAILS: 'FILL_DETAILS',
  UNKNOWN: 'UNKNOWN'
});

/**
 * Whitelist patterns and phonetic aliases for the 6 core commands.
 */
export const COMMAND_DEFINITIONS = [
  {
    intent: IntentType.READ_PAGE,
    label: 'Read This Page',
    spokenFeedback: 'Reading page overview.',
    patterns: [
      /^read (this )?page$/i,
      /^summarize (this )?page$/i,
      /^what('s| is) on this page$/i,
      /^overview (of )?page$/i
    ]
  },
  {
    intent: IntentType.READ_QUESTION,
    label: 'Read Question',
    spokenFeedback: 'Reading current question.',
    patterns: [
      /^read (the |this )?(current )?question$/i,
      /^read (the |this )?(current )?field$/i,
      /^what('s| is) the (question|field)$/i,
      /^repeat question$/i
    ]
  },
  {
    intent: IntentType.NEXT_FIELD,
    label: 'Next Field',
    spokenFeedback: 'Moving to next field.',
    patterns: [
      /^next( field| input)?$/i,
      /^go to next( field)?$/i,
      /^forward$/i,
      /^skip to next$/i
    ]
  },
  {
    intent: IntentType.PREV_FIELD,
    label: 'Previous Field',
    spokenFeedback: 'Moving to previous field.',
    patterns: [
      /^(previous|prev)( field| input)?$/i,
      /^go back$/i,
      /^back( field)?$/i,
      /^prior field$/i
    ]
  },
  {
    intent: IntentType.STOP_READING,
    label: 'Stop Reading',
    spokenFeedback: 'Stopped.',
    patterns: [
      /^stop( reading| talking| speaking)?$/i,
      /^quiet$/i,
      /^silence$/i,
      /^pause( speech)?$/i,
      /^shut up$/i,
      /^cancel$/i
    ]
  },
  {
    intent: IntentType.FILL_DETAILS,
    label: 'Fill My Details',
    spokenFeedback: 'Filling your profile details.',
    patterns: [
      /^fill (my |the )?details$/i,
      /^fill (my |the )?profile$/i,
      /^autofill( details| profile)?$/i,
      /^populate (my )?details$/i,
      /^fill form$/i
    ]
  }
];

/**
 * Normalizes input speech string by trimming, lowercasing, and stripping punctuation.
 * @param {string} rawText 
 * @returns {string}
 */
export function normalizeTranscript(rawText) {
  if (!rawText) return '';
  return rawText
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Evaluates a spoken transcript against the validated command whitelist.
 * @param {string} rawTranscript 
 * @returns {{ intent: string, definition: Object|null, confidence: number }}
 */
export function matchCommandIntent(rawTranscript) {
  const normalized = normalizeTranscript(rawTranscript);

  if (!normalized) {
    return { intent: IntentType.UNKNOWN, definition: null, confidence: 0 };
  }

  for (const def of COMMAND_DEFINITIONS) {
    for (const pattern of def.patterns) {
      if (pattern.test(normalized)) {
        return {
          intent: def.intent,
          definition: def,
          confidence: 1.0
        };
      }
    }
  }

  return {
    intent: IntentType.UNKNOWN,
    definition: null,
    confidence: 0
  };
}
