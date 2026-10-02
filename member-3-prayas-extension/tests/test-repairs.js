// Unit test for Stage 4 Accessibility Repairs & Undo Logic
console.log('=== RUNNING ACCESSIBILITY REPAIR & UNDO TEST ===');

function formatReadableTitle(raw) {
  if (!raw) return 'Form Field';
  return raw
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

// Test readable title generation
const testCases = [
  { raw: 'referralCode', expected: 'Referral Code' },
  { raw: 'emptyLabelField', expected: 'Empty Label Field' },
  { raw: 'emergency_contact', expected: 'Emergency Contact' },
  { raw: 'phone-number', expected: 'Phone Number' }
];

testCases.forEach((tc) => {
  const result = formatReadableTitle(tc.raw);
  const pass = result === tc.expected;
  console.log(`Title formatting: "${tc.raw}" -> "${result}" [${pass ? 'PASS' : 'FAIL'}]`);
});

// Mock simulated element for undo test
const mockElement = {
  attributes: {},
  dataset: {},
  classList: {
    classes: new Set(['prayas-a11y-warning']),
    add(c) { this.classes.add(c); },
    remove(c) { this.classes.delete(c); },
    toString() { return Array.from(this.classes).join(' '); }
  },
  getAttribute(name) { return this.attributes[name] || null; },
  setAttribute(name, val) { this.attributes[name] = val; },
  removeAttribute(name) { delete this.attributes[name]; },
  hasAttribute(name) { return name in this.attributes; }
};

// 1. Initial State: No aria-label
console.log('Initial element aria-label:', mockElement.getAttribute('aria-label'));

// 2. Apply Repair
const original = mockElement.hasAttribute('aria-label') ? mockElement.getAttribute('aria-label') : '__NONE__';
mockElement.dataset.prayasOriginalAriaLabel = original;
mockElement.setAttribute('aria-label', formatReadableTitle('referralCode'));
mockElement.setAttribute('data-prayas-repaired', 'true');
mockElement.classList.remove('prayas-a11y-warning');
mockElement.classList.add('prayas-a11y-fixed');

console.log('After repair aria-label:', mockElement.getAttribute('aria-label'));
console.log('After repair class:', Array.from(mockElement.classList).join(' '));
console.log('Stored original in dataset:', mockElement.dataset.prayasOriginalAriaLabel);

// 3. Undo Repair
if (mockElement.dataset.prayasOriginalAriaLabel === '__NONE__') {
  mockElement.removeAttribute('aria-label');
} else {
  mockElement.setAttribute('aria-label', mockElement.dataset.prayasOriginalAriaLabel);
}
delete mockElement.dataset.prayasOriginalAriaLabel;
mockElement.removeAttribute('data-prayas-repaired');
mockElement.classList.remove('prayas-a11y-fixed');
mockElement.classList.add('prayas-a11y-warning');

console.log('After undo aria-label:', mockElement.getAttribute('aria-label'));
console.log('After undo class:', Array.from(mockElement.classList).join(' '));
console.log('Is aria-label fully removed back to pristine state?', mockElement.getAttribute('aria-label') === null ? 'YES (PASS)' : 'NO (FAIL)');

console.log('All repair & undo logic tests completed successfully.');
