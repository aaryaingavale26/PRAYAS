/**
 * PRAYAS 3.0 - Test Flexible Natural Language Voice Commands (Member 4)
 * Verifies that at least 15 distinct phrasings of "read the question" and
 * other conversational commands are accurately classified.
 */

import { matchCommandIntent, IntentType } from '../src/commands/command-definitions.js';

console.log('======================================================');
console.log(' Testing Flexible Natural Language Voice Commands');
console.log('======================================================\n');

const readQuestionPhrasings = [
  'read question',
  'read the question',
  'what does this ask',
  'can you read that out',
  'tell me the question',
  "what's this field",
  'what is this field',
  'repeat the question',
  'read prompt',
  'what is this question asking',
  'read this out',
  'what am I filling here',
  'explain this field',
  'what does it say',
  'read active field',
  'can you read the question please',
  'tell me what to write',
  'what are they asking'
];

let readQPassed = 0;
console.log(`--- Testing ${readQuestionPhrasings.length} Phrasings of "Read Question" ---`);
for (const phrasing of readQuestionPhrasings) {
  const match = matchCommandIntent(phrasing);
  const pass = match.intent === IntentType.READ_QUESTION;
  if (pass) {
    readQPassed++;
    console.log(`  ✓ PASS: "${phrasing}" -> Intent: ${match.intent} (Conf: ${match.confidence.toFixed(2)})`);
  } else {
    console.error(`  ✗ FAIL: "${phrasing}" -> Intent: ${match.intent}`);
  }
}

console.log(`\nResult: ${readQPassed} / ${readQuestionPhrasings.length} "Read Question" phrasings matched successfully.`);

// Additional flexible commands test
const otherFlexibleCommands = [
  { text: 'go to next field please', expected: IntentType.NEXT_FIELD },
  { text: 'move forward to the next input', expected: IntentType.NEXT_FIELD },
  { text: 'go back one field', expected: IntentType.PREV_FIELD },
  { text: 'return to previous', expected: IntentType.PREV_FIELD },
  { text: 'can you fill my details please', expected: IntentType.FILL_DETAILS },
  { text: 'autofill this form', expected: IntentType.FILL_DETAILS },
  { text: 'help me draft an answer', expected: IntentType.AI_DRAFT },
  { text: 'what can i say', expected: IntentType.HELP },
  { text: 'call olivia', expected: IntentType.VOICE_CALL },
  { text: 'start voice call', expected: IntentType.VOICE_CALL }
];

let otherPassed = 0;
console.log(`\n--- Testing ${otherFlexibleCommands.length} Other Flexible Conversational Commands ---`);
for (const { text, expected } of otherFlexibleCommands) {
  const match = matchCommandIntent(text);
  const pass = match.intent === expected;
  if (pass) {
    otherPassed++;
    console.log(`  ✓ PASS: "${text}" -> Intent: ${match.intent}`);
  } else {
    console.error(`  ✗ FAIL: "${text}" -> Expected: ${expected}, Got: ${match.intent}`);
  }
}

if (readQPassed >= 15 && otherPassed === otherFlexibleCommands.length) {
  console.log('\n🎉 ALL FLEXIBLE COMMAND TESTS VERIFIED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error('\n❌ SOME COMMAND TESTS FAILED.');
  process.exit(1);
}
