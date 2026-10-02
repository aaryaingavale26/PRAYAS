# PRAYAS 3.0 — Voice Agent Integration Specification
**Team ByteShastra | Handshake Document: Member 3 (Chrome Extension) & Member 4 (Voice Agent)**

---

## 1. Overview
The PRAYAS Chrome Extension content script exposes a deterministic, secured message listener for voice and assistive navigation.
Member 4's voice layer (running via Web Speech API or voice assistant) can send high-level intent commands to the active tab to control navigation, read fields aloud, and trigger flows.

> [!IMPORTANT]
> **Security Safeguard:** The extension enforces a strict command whitelist (`ALLOWED_VOICE_COMMANDS`). Arbitrary JavaScript execution, selector injection, or DOM tampering is strictly rejected.

---

## 2. Chrome Runtime Message Interface

### Dispatch Format
From any extension script or popup:
```javascript
chrome.tabs.sendMessage(activeTabId, {
  type: 'PRAYAS_VOICE_COMMAND',
  command: '<COMMAND_NAME>',
  target: '<OPTIONAL_TARGET_QUERY>'
}, (response) => {
  console.log('Voice Command Result:', response);
});
```

---

## 3. Supported Commands Reference

| Command | Arguments | Description | Response Payload |
| :--- | :--- | :--- | :--- |
| `NEXT_FIELD` | None | Moves focus and high-contrast outline to next input in visual order. Reads field aloud. | `{ success: true, index: 1, total: 16, fieldLabel: "Email Address", announcement: "..." }` |
| `PREVIOUS_FIELD` | None | Moves focus to previous interactive input. | `{ success: true, index: 0, total: 16, fieldLabel: "Full Name", announcement: "..." }` |
| `READ_CURRENT_FIELD` | None | Speaks aloud current field's label, required status, and current value. | `{ success: true, fieldLabel: "Phone Number", announcement: "Phone Number. Required tel field. Current value: +91 98765 43210." }` |
| `FOCUS_FIELD` | `target: string` | Matches field by semantic name (e.g. `"email"`, `"phone"`, `"name"`) and shifts focus. | `{ success: true, target: "Email Address", announcement: "..." }` |
| `START_AUTOFILL` | None | Directs user to open PRAYAS to review & confirm Passport values. | `{ success: true, announcement: "Autofill requested via voice..." }` |
| `CLEAR_CURRENT_FIELD`| None | Safely clears the value of the active field without breaking form state. | `{ success: true, announcement: "Field cleared." }` |

---

## 4. Built-in Keyboard Shortcuts
For screen-reader and keyboard-only testing, the extension also provides default hardware shortcuts:
- **`Alt + ArrowRight`**: Next Field
- **`Alt + ArrowLeft`**: Previous Field
- **`Alt + Space`**: Read Current Field
- **`Alt + A`**: Prompt Autofill

---

## 5. Error Handling
If an unrecognized command is passed:
```json
{
  "success": false,
  "error": "Command \"DROP_DATABASE\" is not in the allowed command whitelist."
}
```
If no fields are present on the page:
```json
{
  "success": false,
  "error": "No navigable fields on page"
}
```
