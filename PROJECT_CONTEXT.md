# Project Context — Drizz Clone

## What is Drizz?

Drizz is a Vision AI-powered mobile app testing platform that replaces Appium/Selenium. Instead of writing code with fragile CSS/XPath selectors, users write plain English commands like `Tap "Login"` or `Validate "Welcome" is visible`. A vision engine sees the screen like a human and executes actions — no element IDs needed.

**Core value prop:** 10x faster test authoring, self-healing tests, no code required.

---

## Drizz Architecture (4 pillars)

### 1. Commands
Tests are sequences of plain English commands:
- **Action commands:** `tap`, `type`, `scroll`, `scroll_until`
- **System commands:** `open_app`, `kill_app`, `clear_app`, `press_device_back_button`, `set_gps`
- **Validation:** `Validate "text" is visible`, `Validate URL contains "/checkout"`, math validation (`Validate total = sum of items`)
- **Memory:** Store values mid-test, reuse later (`Store price as X`, `Validate X equals Y`)
- **Conditional blocks:** `IF "element" is visible THEN ... ELSE ...`
- **Navigation:** `map_action tap`, `map_action drag` for maps/gestures

Each command = single user intent. Vision AI resolves targets by: exact text, icon recognition, positional context (first/last/upper/lower), container context, color-based context, computed selection (cheapest, highest rated).

### 2. Vision Engine
- Replaces XPath/CSS selectors with visual screen analysis
- Detects interactive components by looking at the screen
- Self-healing: if UI changes, AI re-detects elements visually
- Works across platforms (same test runs on iOS + Android)

### 3. Execution Pipeline
- Connects to real devices (local or cloud)
- Step-by-step execution with real-time visibility
- Each step: screenshot capture, action execution, status
- Auto-retry on flaky steps
- Test Plan healing (auto-fix broken steps)

### 4. Reporting
- Step-level screenshots and logs
- Execution timeline
- Failure summary with auto-triage
- Exportable reports

---

## Drizz Desktop App — Interface Structure

Three panels:

| Panel | Purpose |
|-------|---------|
| **Device Panel** | List available devices, show OS/model/state, select target device |
| **Editor Panel** | Write commands sequentially, edit/reorder/insert/delete steps, module insertion, conditional blocks |
| **Execution Panel / Logger** | Step-by-step results, detailed logs with reasoning for success/failure, timing, failure messages |

---

## Drizz Project Structure

- **Tests** — end-to-end flows, sequential commands, fully editable
- **Modules** — reusable logic blocks (login flow, setup, cleanup), insertable into any test
- **Folders** — organize by feature, sprint, team
- **Workspace modes** — Online (synced to cloud) + Local (drafts)

---

## Drizz Test Plan

- **Test Cases** — what to run
- **Execution Settings** — where to run (device, platform, OS version)
- **Reports & Logs** — auto-generated results

Supports: single test run, batch runs, parallel runs, CI/CD triggers via API.

---

## Drizz API / CI-CD

- Auth endpoint → get token
- Upload APK/IPA endpoint
- Trigger single or batch test plan runs
- Supports GitHub, Jenkins, other CI/CD platforms

---

## What We've Built vs What Drizz Has

### ✅ What We Have

| Feature | Our Implementation | Drizz Equivalent |
|---------|-------------------|------------------|
| Project management | Create/save/load projects, recent projects grid | Project structure with folders |
| Screenshot analysis | Upload screenshots, detect screen types, components | Vision Engine analyzing live device screen |
| Test generation | AI generates test cases from screenshots + context | User writes commands manually (we auto-generate) |
| Dynamic questions | Contextual questions based on detected features | N/A (Drizz doesn't have this — this is our differentiator) |
| Test runner | Step-by-step execution with live logs, pass/fail | Execution Panel with real device |
| Run/Stop controls | Run and stop mid-execution | Same |
| Reports | CSV + PDF export to project folder | Step-level screenshots, logs, reports |
| Edit answers | Re-run question flow, change selections | Edit/reorder commands |
| Save to disk | Auto-save to `projects/{name}/` folder | Cloud + local workspace |
| Toast notifications | Save confirmation | N/A |

### ❌ What We're Missing

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| **Plain English command input** | HIGH | Medium | Let users type `Tap "Login"`, `Type "hello" in search bar` — the core Drizz UX. Right now we only generate steps, users can't write them. |
| **Editable test steps** | HIGH | Small | Edit, add, delete, reorder steps in the runner. Drizz's editor panel allows this. |
| **Modules (reusable blocks)** | MEDIUM | Medium | Save a sequence of steps as a module (e.g., "Login flow") and insert into other tests. |
| **Device panel** | MEDIUM | Small | Show connected device info (even if simulated). Drizz has a device panel showing OS, model, state. |
| **Step-level screenshots** | MEDIUM | Small | Show a screenshot alongside each step during execution. We have the screenshots, just need to display them at relevant steps. |
| **Live device screen** | LOW | Large | Show actual device screen during execution. Requires real device/emulator integration. |
| **Conditional logic** | LOW | Medium | `IF visible THEN tap ELSE skip` blocks in test steps. |
| **Memory/variables** | LOW | Medium | Store values during execution, validate later. |
| **Real vision AI** | LOW | Large | Replace mock `ai.js` with actual vision model API calls. |
| **Cloud execution** | LOW | Large | Run on cloud device farm instead of simulated. |
| **CI/CD API** | LOW | Medium | Trigger test runs from GitHub/Jenkins. |
| **Multi-app testing** | LOW | Medium | Test flows that span multiple apps. |

### 🟡 Our Differentiators (things Drizz doesn't have)

1. **AI-generated test cases** — Drizz requires manual test writing. We analyze screenshots and auto-generate relevant test cases. This is a genuine advantage.
2. **Contextual question flow** — The dynamic questioning (Visual Regression? Cross-Browser? Accessibility?) tailors output. Drizz has no equivalent.
3. **Screenshot-first approach** — Upload designs/screenshots before the app is built. Test early in the development cycle. Drizz requires a running app.

---

## Recommended Next Steps (prioritized for interview impact)

### Must-do (highest impression)
1. **Editable test steps** — click a step to edit, add new steps, delete steps, drag to reorder
2. **Plain English command input** — text field in the runner to type new steps like `Tap "Sign In"`
3. **Step screenshots in runner** — show the relevant uploaded screenshot next to each step during execution

### Nice-to-have
4. Better branding — tagline "Vision AI-powered testing" on project screen
5. Device info indicator in runner header ("iPhone 14 Pro — iOS 17.2" even if mocked)
6. Test suite view — see all test cases for a project in one screen with run-all button

---

## How to Explain This in the Interview

> "I built the test authoring and orchestration layer of a Drizz-like platform. Unlike Drizz where users write tests manually, my system takes app screenshots, uses AI to analyze screen types and UI components, asks smart follow-up questions about testing scope, and auto-generates structured test cases. Users can review, edit, and execute tests with real-time logs and pass/fail tracking.
>
> The AI module is a clean async interface — swap the mock with a real vision model and you have production intelligence. The test runner is built to mirror real device execution with step-level logs, matching Drizz's execution panel format.
>
> My differentiator over Drizz: AI-generated tests from screenshots, not manual authoring. You could test before the app is even built — upload wireframes or designs and generate test cases from day one."
