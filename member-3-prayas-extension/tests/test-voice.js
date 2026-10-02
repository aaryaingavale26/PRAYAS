/**
 * PRAYAS 3.0 - Unit Test: Voice Command Engine & Security Whitelist (Stage 8)
 * Team ByteShastra | Member 3: Chrome Extension & DOM
 */

const assert = require('assert');

console.log('--- RUNNING TEST: Voice Command Engine & Security Whitelist ---');

const ALLOWED_VOICE_COMMANDS = [
  'NEXT_FIELD',
  'PREVIOUS_FIELD',
  'READ_CURRENT_FIELD',
  'FOCUS_FIELD',
  'START_AUTOFILL',
  'CLEAR_CURRENT_FIELD'
];

// Mock navigables
const mockFields = [
  { id: 'fullName', name: 'fullName', label: 'Full Legal Name', type: 'text', tagName: 'INPUT', required: true, value: 'Alex Morgan' },
  { id: 'email', name: 'email', label: 'Email Address', type: 'email', tagName: 'INPUT', required: true, value: '' },
  { id: 'phone', name: 'phone', label: 'Phone Number', type: 'tel', tagName: 'INPUT', required: false, value: '+1-555-0199' },
  { id: 'role', name: 'role', label: 'Target Position', type: 'select-one', tagName: 'SELECT', required: true, options: [{ text: 'Frontend' }, { text: 'Backend' }], selectedIndex: 1 }
];

let currentNavIndex = -1;

function buildFieldAnnouncement(el, index, total) {
  const label = el.label || 'Unlabeled field';
  const tag = el.tagName.toLowerCase();
  const type = el.type.toLowerCase();
  const reqStr = el.required ? 'Required' : 'Optional';

  let typeStr = 'input';
  if (tag === 'select') {
    typeStr = `dropdown list with ${el.options.length} options`;
  } else {
    typeStr = `${type} field`;
  }

  let valueStr = '';
  if (tag === 'select') {
    const sel = el.options[el.selectedIndex];
    valueStr = sel ? `Current selection: ${sel.text}.` : 'No option selected.';
  } else {
    valueStr = el.value ? `Current value: ${el.value}.` : 'Currently empty.';
  }

  const posStr = total ? `Field ${index} of ${total}. ` : '';
  return `${posStr}${label}. ${reqStr} ${typeStr}. ${valueStr}`.trim();
}

function handleVoiceCommand(message, navigables = mockFields) {
  if (!message || !message.command || !ALLOWED_VOICE_COMMANDS.includes(message.command)) {
    return {
      success: false,
      error: `Command "${message?.command}" is not in the allowed command whitelist.`
    };
  }

  switch (message.command) {
    case 'NEXT_FIELD': {
      if (!navigables.length) return { success: false, error: 'No navigable fields on page' };
      currentNavIndex = (currentNavIndex + 1) % navigables.length;
      const el = navigables[currentNavIndex];
      const announcement = buildFieldAnnouncement(el, currentNavIndex + 1, navigables.length);
      return {
        success: true,
        index: currentNavIndex,
        total: navigables.length,
        fieldLabel: el.label,
        announcement
      };
    }

    case 'PREVIOUS_FIELD': {
      if (!navigables.length) return { success: false, error: 'No navigable fields on page' };
      currentNavIndex = (currentNavIndex - 1 + navigables.length) % navigables.length;
      const el = navigables[currentNavIndex];
      const announcement = buildFieldAnnouncement(el, currentNavIndex + 1, navigables.length);
      return {
        success: true,
        index: currentNavIndex,
        total: navigables.length,
        fieldLabel: el.label,
        announcement
      };
    }

    case 'READ_CURRENT_FIELD': {
      if (!navigables.length) return { success: false, error: 'No navigable fields on page' };
      if (currentNavIndex < 0 || currentNavIndex >= navigables.length) currentNavIndex = 0;
      const el = navigables[currentNavIndex];
      const announcement = buildFieldAnnouncement(el, currentNavIndex + 1, navigables.length);
      return {
        success: true,
        index: currentNavIndex,
        total: navigables.length,
        fieldLabel: el.label,
        announcement
      };
    }

    case 'FOCUS_FIELD': {
      const query = (message.target || message.query || '').trim().toLowerCase();
      if (!query) return { success: false, error: 'Target query cannot be empty' };

      let matchedIdx = navigables.findIndex((el) =>
        (el.label || '').toLowerCase().includes(query) ||
        (el.id || '').toLowerCase().includes(query) ||
        (el.name || '').toLowerCase().includes(query)
      );

      if (matchedIdx === -1) {
        return { success: false, error: 'Field not found', announcement: `No matching field found for "${query}".` };
      }

      currentNavIndex = matchedIdx;
      const el = navigables[matchedIdx];
      const announcement = buildFieldAnnouncement(el, matchedIdx + 1, navigables.length);
      return {
        success: true,
        target: el.label,
        index: matchedIdx,
        total: navigables.length,
        announcement
      };
    }

    case 'CLEAR_CURRENT_FIELD': {
      if (currentNavIndex < 0 || currentNavIndex >= navigables.length) {
        return { success: false, error: 'No active field selected' };
      }
      const el = navigables[currentNavIndex];
      if (el.tagName === 'INPUT') {
        el.value = '';
        return { success: true, announcement: `Cleared value for ${el.label}.` };
      }
      return { success: false, error: 'Current element cannot be cleared' };
    }

    case 'START_AUTOFILL': {
      return {
        success: true,
        announcement: 'Autofill requested via voice. Please review and confirm your Accessibility Passport data in the PRAYAS extension.'
      };
    }

    default:
      return { success: false, error: 'Unsupported command' };
  }
}

// 1. Whitelist Security Tests
console.log('Testing security whitelist enforcement...');
const disallowedCommands = [
  'EXECUTE_SCRIPT',
  'SUBMIT_FORM',
  'CLICK_SUBMIT_BUTTON',
  'EVAL_CODE',
  'DROP_DATABASE',
  'STEAL_COOKIES'
];

disallowedCommands.forEach((cmd) => {
  const result = handleVoiceCommand({ command: cmd });
  assert.strictEqual(result.success, false, `Forbidden command "${cmd}" must be rejected`);
  assert(result.error.includes('whitelist'), `Error must mention whitelist for "${cmd}"`);
});
console.log('✓ All malicious/arbitrary commands strictly rejected by whitelist.');

// 2. Sequential Navigation Tests
console.log('Testing NEXT_FIELD and PREVIOUS_FIELD cycling...');
currentNavIndex = -1;

const res1 = handleVoiceCommand({ command: 'NEXT_FIELD' });
assert.strictEqual(res1.success, true);
assert.strictEqual(res1.index, 0);
assert.strictEqual(res1.fieldLabel, 'Full Legal Name');
assert(res1.announcement.includes('Alex Morgan'), 'Announcement must contain current value');

const res2 = handleVoiceCommand({ command: 'NEXT_FIELD' });
assert.strictEqual(res2.index, 1);
assert.strictEqual(res2.fieldLabel, 'Email Address');
assert(res2.announcement.includes('Currently empty'), 'Announcement must indicate empty field');

const resPrev = handleVoiceCommand({ command: 'PREVIOUS_FIELD' });
assert.strictEqual(resPrev.index, 0);
assert.strictEqual(resPrev.fieldLabel, 'Full Legal Name');

console.log('✓ Sequential navigation cycles correctly and builds descriptive speech announcements.');

// 3. Direct Focus Field by Semantic Target
console.log('Testing FOCUS_FIELD semantic matching...');
const resFocus = handleVoiceCommand({ command: 'FOCUS_FIELD', target: 'phone' });
assert.strictEqual(resFocus.success, true);
assert.strictEqual(resFocus.index, 2);
assert.strictEqual(resFocus.target, 'Phone Number');
assert(resFocus.announcement.includes('+1-555-0199'));

const resFocusNotFound = handleVoiceCommand({ command: 'FOCUS_FIELD', target: 'nonexistent' });
assert.strictEqual(resFocusNotFound.success, false);
assert.strictEqual(resFocusNotFound.error, 'Field not found');
console.log('✓ Semantic field targeting accurately locates inputs and handles unknown targets safely.');

// 4. Safe Value Clearing
console.log('Testing CLEAR_CURRENT_FIELD...');
currentNavIndex = 0; // Alex Morgan
const resClear = handleVoiceCommand({ command: 'CLEAR_CURRENT_FIELD' });
assert.strictEqual(resClear.success, true);
assert.strictEqual(mockFields[0].value, '');
console.log('✓ CLEAR_CURRENT_FIELD safely empties input value.');

// 5. START_AUTOFILL Voice Prompt
console.log('Testing START_AUTOFILL...');
const resAutofill = handleVoiceCommand({ command: 'START_AUTOFILL' });
assert.strictEqual(resAutofill.success, true);
assert(resAutofill.announcement.includes('Passport data'));
console.log('✓ START_AUTOFILL triggers safe confirmation readout.');

console.log('\n--- ALL STAGE 8 VOICE ENGINE TESTS PASSED! ---');
