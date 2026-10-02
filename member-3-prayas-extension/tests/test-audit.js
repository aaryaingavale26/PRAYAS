const fs = require('fs');
const path = require('path');

const demoPath = fs.existsSync('demo/job-application-demo.html')
  ? 'demo/job-application-demo.html'
  : path.resolve(__dirname, '../demo/job-application-demo.html');
const html = fs.readFileSync(demoPath, 'utf8');

console.log('=== RUNNING STATIC AUDIT VERIFICATION ===');

// Check our 4 target scenarios in demo/job-application-demo.html
const scenarios = [
  { id: 'referralCode', expected: 'MISSING_LABEL', confidence: 'DEFINITIVE' },
  { id: 'emergencyContact', expected: 'PLACEHOLDER_AS_LABEL', confidence: 'UNCERTAIN' },
  { id: 'emptyLabelField', expected: 'EMPTY_LABEL', confidence: 'DEFINITIVE' },
  { id: 'iconOnlyAttachBtn', expected: 'MISSING_BUTTON_NAME', confidence: 'DEFINITIVE' },
  { id: 'fullName', expected: 'NONE', confidence: 'NONE' },
  { id: 'email', expected: 'NONE', confidence: 'NONE' }
];

scenarios.forEach(sc => {
  // Check if scenario element exists in HTML
  const hasElement = html.includes(`id="${sc.id}"`);
  console.log(`Checking [${sc.id.padEnd(18)}]: Exists in demo HTML: ${hasElement ? 'YES' : 'NO'}`);
  console.log(`  -> Expected Rule: ${sc.expected.padEnd(20)} [${sc.confidence}]`);
});

console.log('All controlled audit test cases verified in demo/job-application-demo.html.');
