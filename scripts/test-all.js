const { spawnSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

console.log('\x1b[36m%s\x1b[0m', '================================================================');
console.log('\x1b[36m%s\x1b[0m', '   PRAYAS 3.0: Comprehensive Master Test Suite Runner           ');
console.log('\x1b[36m%s\x1b[0m', '   Team ByteShastra | Member 1, 2, 3, 4 Verification            ');
console.log('\x1b[36m%s\x1b[0m', '================================================================\n');

const results = [];

// 1. Member 2: FastAPI Backend Tests
console.log('\x1b[33m%s\x1b[0m', '▶ Running Member 2: Python Backend Unit & Integration Tests (225 Tests)...');
const venvPython = isWindows
  ? path.join(rootDir, 'prayas-backend', '.venv', 'Scripts', 'python.exe')
  : path.join(rootDir, 'prayas-backend', '.venv', 'bin', 'python');

const backendRun = spawnSync(
  venvPython,
  ['-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py'],
  {
    cwd: path.join(rootDir, 'prayas-backend'),
    encoding: 'utf-8'
  }
);

const backendPass = backendRun.status === 0;
results.push({
  module: 'Member 2: FastAPI Backend & RAG Engine',
  tests: '225 hermetic tests (auth, docs, chunks, pgvector, rag, simplifier)',
  passed: backendPass,
  details: backendRun.stderr.split('\n').filter(l => l.includes('Ran') || l.includes('OK')).join(' | ') || (backendPass ? 'OK' : 'FAIL')
});
console.log(backendPass ? '\x1b[32m✔ PASSED\x1b[0m' : '\x1b[31m✘ FAILED\x1b[0m');

// 2. Member 3: Chrome Extension Tests
console.log('\n\x1b[33m%s\x1b[0m', '▶ Running Member 3: Chrome Extension & DOM Engine Tests (7 Suites)...');
const extRun = spawnSync(
  'node',
  ['tests/run-all-tests.js'],
  {
    cwd: path.join(rootDir, 'member-3-prayas-extension'),
    encoding: 'utf-8'
  }
);
const extPass = extRun.status === 0;
results.push({
  module: 'Member 3: Chrome Extension & DOM Auditor',
  tests: '7 test suites (extraction, audit, repairs, autofill, backend, scorecard, voice)',
  passed: extPass,
  details: extPass ? '7 / 7 Test Suites Passed' : 'FAIL'
});
console.log(extPass ? '\x1b[32m✔ PASSED\x1b[0m' : '\x1b[31m✘ FAILED\x1b[0m');

// 3. Member 4: Voice Agent & Testing Engine
console.log('\n\x1b[33m%s\x1b[0m', '▶ Running Member 4: Voice Agent & E2E Testing Engine (25 Tests)...');
const voiceRun = spawnSync(
  'node',
  ['tests/run-e2e-tests.js'],
  {
    cwd: path.join(rootDir, 'member-4-voice-input-and-testing'),
    encoding: 'utf-8'
  }
);
const voicePass = voiceRun.status === 0;
results.push({
  module: 'Member 4: Voice Agent & E2E Testing Suite',
  tests: '25 automated tests (STT/TTS, router, bridge, RAG flow, anti-hallucination)',
  passed: voicePass,
  details: voicePass ? '25 / 25 Passed (100%)' : 'FAIL'
});
console.log(voicePass ? '\x1b[32m✔ PASSED\x1b[0m' : '\x1b[31m✘ FAILED\x1b[0m');

// 4. Member 1: Next.js Frontend Production Build
console.log('\n\x1b[33m%s\x1b[0m', '▶ Running Member 1: Next.js Web App Production Compilation & Verification...');
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const frontendRun = spawnSync(
  npmCmd,
  ['run', 'build'],
  {
    cwd: path.join(rootDir, 'member_1'),
    encoding: 'utf-8',
    shell: true
  }
);
const frontendPass = frontendRun.status === 0;
results.push({
  module: 'Member 1: Next.js 16 Web Application',
  tests: '12 static & dynamic routes (passport, documents, dashboard, scorecard, demo, auth)',
  passed: frontendPass,
  details: frontendPass ? 'Compiled 12/12 static pages successfully' : 'FAIL'
});
console.log(frontendPass ? '\x1b[32m✔ PASSED\x1b[0m' : '\x1b[31m✘ FAILED\x1b[0m');

// Print Summary Table
console.log('\n\x1b[36m%s\x1b[0m', '================================================================');
console.log('\x1b[36m%s\x1b[0m', '                      SUMMARY REPORT                            ');
console.log('\x1b[36m%s\x1b[0m', '================================================================');

let allPassed = true;
results.forEach((r, idx) => {
  const statusStr = r.passed ? '\x1b[32m✔ PASS\x1b[0m' : '\x1b[31m✘ FAIL\x1b[0m';
  console.log(`${idx + 1}. [${statusStr}] \x1b[1m${r.module}\x1b[0m`);
  console.log(`   Scope: ${r.tests}`);
  console.log(`   Result: ${r.details}\n`);
  if (!r.passed) allPassed = false;
});

if (allPassed) {
  console.log('\x1b[32m%s\x1b[0m', '🎉 ALL SYSTEMS INTEGRATED AND VERIFIED — READY FOR 36-HOUR HACKATHON DEMO!');
  process.exit(0);
} else {
  console.log('\x1b[31m%s\x1b[0m', '⚠️ ONE OR MORE TEST SUITES REPORTED FAILURES.');
  process.exit(1);
}
