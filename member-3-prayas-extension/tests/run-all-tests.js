/**
 * PRAYAS 3.0 - Unified Master Test Runner
 * Team ByteShastra | Member 3: Chrome Extension & DOM
 * Executes all 7 verification test suites and reports aggregate status.
 */

const { execSync } = require('child_process');
const path = require('path');

const testSuites = [
  { name: 'Field Extraction Engine (4-Tier)', file: 'test-extraction.js' },
  { name: 'Accessibility Audit Rules Engine', file: 'test-audit.js' },
  { name: 'Safe ARIA Repairs & Lossless Undo', file: 'test-repairs.js' },
  { name: 'Accessibility Passport Autofill Matching', file: 'test-autofill.js' },
  { name: 'Backend API Contracts & Offline Resilience', file: 'test-backend.js' },
  { name: 'WCAG 2.2 Scorecard & User Consent Gate', file: 'test-scorecard.js' },
  { name: 'Voice Command Engine & Security Whitelist', file: 'test-voice.js' }
];

console.log('================================================================');
console.log(' PRAYAS 3.0 — Chrome Extension Master Test Runner');
console.log(' Team ByteShastra | Member 3 Deliverable Verification');
console.log('================================================================\n');

let passedCount = 0;
const results = [];

for (const suite of testSuites) {
  const filePath = path.join(__dirname, suite.file);
  process.stdout.write(`• Running ${suite.name} (${suite.file})... `);
  try {
    const output = execSync(`node "${filePath}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    console.log('✔ PASSED');
    passedCount++;
    results.push({ name: suite.name, status: 'PASS', details: 'All assertions verified' });
  } catch (err) {
    console.log('✖ FAILED');
    results.push({ name: suite.name, status: 'FAIL', error: err.message });
  }
}

console.log('\n================================================================');
console.log(` SUMMARY: ${passedCount} / ${testSuites.length} Test Suites Passed`);
console.log('================================================================');

if (passedCount === testSuites.length) {
  console.log('✔ ALL SYSTEMS GO — READY FOR HACKATHON DEMO!');
  process.exit(0);
} else {
  console.error('✖ SOME TESTS FAILED — Check output above.');
  process.exit(1);
}
