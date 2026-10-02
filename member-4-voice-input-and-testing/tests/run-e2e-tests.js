/**
 * PRAYAS 3.0 - End-to-End Automated Test Suite (Stage 7)
 * 
 * Verifies core engines, command routing, extension bridge messaging,
 * security whitelisting, and conversational agent logic.
 * 
 * Usage:
 *   node tests/run-e2e-tests.js
 */

import { matchCommandIntent, normalizeTranscript, IntentType } from '../src/commands/command-definitions.js';
import { CommandRouter } from '../src/commands/command-router.js';
import { ExtensionBridge, ConnectionStatus } from '../src/bridge/extension-bridge.js';
import { ConversationalAgent, AgentFlowStep } from '../src/agent/conversational-agent.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log(' PRAYAS 3.0 Voice & Testing Module — E2E Test Suite');
  console.log('======================================================\n');

  // TEST SUITE 1: Command Normalization & Whitelist Security
  console.log('--- 1. Testing Command Normalization & Security Whitelist ---');
  assert(normalizeTranscript('  Next FIELD!  ') === 'next field', 'Normalizes casing and trims punctuation');
  assert(matchCommandIntent('read this page').intent === IntentType.READ_PAGE, 'Matches "read this page"');
  assert(matchCommandIntent('READ CURRENT QUESTION').intent === IntentType.READ_QUESTION, 'Matches "read current question"');
  assert(matchCommandIntent('go to next field').intent === IntentType.NEXT_FIELD, 'Matches "go to next field"');
  assert(matchCommandIntent('previous field').intent === IntentType.PREV_FIELD, 'Matches "previous field"');
  assert(matchCommandIntent('stop reading').intent === IntentType.STOP_READING, 'Matches "stop reading"');
  assert(matchCommandIntent('fill my details').intent === IntentType.FILL_DETAILS, 'Matches "fill my details"');
  
  // Security Guard: Rejection of arbitrary spoken text / code
  const maliciousInput = 'console.log("hack"); alert(1); submit application';
  assert(matchCommandIntent(maliciousInput).intent === IntentType.UNKNOWN, 'Strictly rejects arbitrary text or unapproved actions');

  // TEST SUITE 2: Command Router & Audio Feedback
  console.log('\n--- 2. Testing Command Router Execution ---');
  let mockSpokenText = '';
  const mockSynth = {
    speak: (text) => { mockSpokenText = text; return Promise.resolve(); },
    stop: () => { mockSpokenText = 'STOPPED'; }
  };
  const router = new CommandRouter({ synthesizer: mockSynth });

  let actionTriggered = false;
  router.registerAction(IntentType.NEXT_FIELD, () => { actionTriggered = true; });

  const resNext = await router.execute('next field');
  assert(resNext.success === true && actionTriggered === true, 'Executes registered handler for NEXT_FIELD');

  await router.execute('stop reading');
  assert(mockSpokenText === 'STOPPED', 'Halts speech immediately upon "stop reading"');

  const resUnknown = await router.execute('random query');
  assert(resUnknown.success === false, 'Returns success: false for unrecognized phrases');

  // TEST SUITE 3: Extension Bridge & Fallback Simulator
  console.log('\n--- 3. Testing Extension Bridge Messaging Contract ---');
  const bridge = new ExtensionBridge({ allowFallback: true });
  await bridge.checkConnection();
  assert(bridge.status === ConnectionStatus.FALLBACK_MOCK, 'Activates fallback mock when running outside Chrome Extension');

  const navRes = await bridge.navigateNext();
  assert(navRes.success === true && navRes.action === 'NAVIGATE_NEXT', 'Bridge handles NAVIGATE_NEXT message');

  const fillRes = await bridge.fillProfileDetails();
  assert(fillRes.success === true && fillRes.fieldsUpdated.length > 0, 'Bridge handles FILL_PROFILE_DETAILS');

  const qRes = await bridge.getActiveQuestion();
  assert(qRes.success === true && typeof qRes.question === 'string', 'Bridge extracts active question text');

  // TEST SUITE 4: Conversational Agent 7-Step Dialog Flow
  console.log('\n--- 4. Testing Conversational Agent RAG Flow ---');
  const agent = new ConversationalAgent({
    synthesizer: mockSynth,
    bridge: bridge,
    useMockBackend: true
  });

  assert(agent.currentStep === AgentFlowStep.IDLE, 'Agent starts in IDLE state');

  await agent.startAssistanceFlow('Describe an accessibility challenge.');
  assert(agent.currentStep === AgentFlowStep.AWAITING_CONSENT, 'Step 1 & 2: Reads question and awaits user consent');

  // User consents to help
  await agent.handleConsentResponse(true);
  assert(agent.currentStep === AgentFlowStep.REVIEWING_DRAFT, 'Step 3, 4, 5: Fetches draft and enters REVIEWING_DRAFT');
  assert(agent.currentDraft.length > 30, 'Generated personalized draft based on candidate resume');
  assert(agent.currentMetadata.confidence > 0.8, 'High confidence score attached to evidence-backed draft');

  // User accepts draft
  let insertedDraft = '';
  bridge.insertDraftAnswer = (text) => { insertedDraft = text; return Promise.resolve({ success: true }); };
  await agent.acceptDraft();
  assert(agent.currentStep === AgentFlowStep.INSERTED, 'Step 6 & 7: Enters INSERTED state on user acceptance');
  assert(insertedDraft === agent.currentDraft, 'Non-destructively inserted draft into form target');

  // TEST SUITE 5: Low-Evidence Clarification Loop (Anti-Hallucination Guard)
  console.log('\n--- 5. Testing Anti-Hallucination & Clarification Loop ---');
  const obscureQuestion = 'Describe your experience with quantum neural satellite encryption patents.';
  await agent.startAssistanceFlow(obscureQuestion);
  await agent.handleConsentResponse(true);

  assert(agent.currentStep === AgentFlowStep.AWAITING_CLARIFICATION, 'Enters AWAITING_CLARIFICATION when resume lacks topic evidence');

  // User provides spoken clarification note
  await agent.submitClarificationNotes('I studied cryptographic protocols and implemented secure access control.');
  assert(agent.currentStep === AgentFlowStep.REVIEWING_DRAFT, 'Resumes draft review once candidate provides verified notes');
  assert(agent.currentDraft.includes('cryptographic protocols'), 'Incorporates genuine candidate clarification into draft without hallucinating');

  console.log('\n======================================================');
  console.log(` Test Results: ${passedTests} / ${totalTests} Passed (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('======================================================\n');
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
