# Test Suite Generator — Features

## Core Concept
AI-powered contextual test case generator. Upload app screenshots, provide context, and the system analyzes layouts, asks clarifying questions, and generates tailored test suites.

## Features

### Screenshot Management
- **Multi-upload** — upload multiple images at once
- **Mobile & Desktop sections** — separate upload areas for each device type
- **Labeling** — name each screen (e.g. "Login Page", "OTP Screen")
- **Reordering** — move screenshots up/down to define flow sequence
- **Delete** — remove individual screenshots with cross icon
- **Preview** — click any thumbnail to view full-size overlay

### AI Analysis Pipeline
- **Screenshot analysis** — detects screen types (auth, landing, forms, consent, etc.) and UI components (inputs, buttons, navigation)
- **Dynamic questioning** — generates contextual follow-up questions based on what it detects (not hardcoded)
- **Context-aware** — combines screenshot analysis with user-provided text context

### Dynamic Questions (contextual)
- **Testing types** — Functional, UI/Visual, Usability, Edge Cases, Security, E2E
- **Form validation** — only asked when form inputs are detected
- **Auth scenarios** — only asked when login/OTP screens are found
- **Responsive focus** — only asked when both mobile & desktop screenshots exist
- **Priority targeting** — critical path vs comprehensive coverage
- Questions can be answered or skipped

### Test Case Output
- **Structured format** — ID, name, preconditions, steps, expected result
- **Device badge** — shows Mobile/Desktop per test case
- **Type badge** — Functional, UI/Visual, Security, E2E, etc.
- **Priority badge** — Critical, High, Medium
- **Contextual steps** — test steps are tailored to the screen type and user answers
- **Auth-specific tests** — dedicated test cases for login, OTP, session expiry, etc.
- **E2E flow tests** — cross-screen flow validation when multiple screens exist

### Chat Interface
- **Conversational flow** — the entire process happens in a chat-style UI
- **Multi-line input** — Shift+Enter for new lines
- **Auto-scroll** — chat follows latest message
- **Clear chat** — reset the conversation
- **Typing indicator** — animated dots during AI processing

## Architecture
- `App.jsx` — UI layer, orchestrates Analyze → Ask → Generate flow
- `ai.js` — AI module with 3 async functions (`analyzeScreenshots`, `generateQuestions`, `generateTestCases`), designed as a drop-in swap point for a real vision/LLM API
