# Account Connection Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dense account settings page with a novice-friendly connection wizard and a compact completed-state summary.

**Architecture:** Keep `credentialClient`, `identityClient`, `organizationClient`, and update IPC contracts unchanged. Move page flow into a dedicated wizard component whose current screen is derived from saved organization, credential, and identity status; keep manual credentials in the existing collapsed advanced section.

**Tech Stack:** React 19, TypeScript, React Router, Vitest, Testing Library, Electron IPC, CSS.

## Global Constraints

- Do not automatically upload, submit, delete, or update anything.
- Do not expose saved Token or private-key password values.
- Keep software update controls in the normal completed page.
- Keep manual key selection and clearing credentials under “专业显示”.
- Do not require a public-key file path.
- Preserve existing desktop credential storage formats and IPC contracts.
- Do not commit or package without the user’s separate confirmation.

---

### Task 1: Define And Test Wizard Flow

**Files:**
- Create: `src/features/account/accountWizardFlow.ts`
- Create: `src/features/account/accountWizardFlow.test.ts`

**Interfaces:**
- Produces: `AccountWizardStep`, `AccountSetupStatus`, `firstIncompleteStep(status)`.

- [ ] **Step 1: Write failing tests for first incomplete step**

Cover missing organization, missing credentials, missing identity registration, failed connection check, and fully configured status.

- [ ] **Step 2: Run the focused test**

Run: `npm.cmd test -- --run src/features/account/accountWizardFlow.test.ts`

- [ ] **Step 3: Implement the pure flow model**

Use explicit step names: `welcome`, `organization`, `access-code`, `identity`, `registration`, `connection-check`, `complete`.

- [ ] **Step 4: Run the focused test and typecheck**

Run: `npm.cmd test -- --run src/features/account/accountWizardFlow.test.ts`

---

### Task 2: Build The Single-Screen Setup Wizard

**Files:**
- Modify: `src/features/account/ConnectionWizard.tsx`
- Modify: `src/features/account/ConnectionWizard.test.tsx`
- Modify: `src/features/account/connectionWizard.css`
- Consume: `src/features/account/accountWizardFlow.ts`

**Interfaces:**
- Consumes existing `credentialClient`, `identityClient`, `ConnectionCheckPanel`, and organization values supplied by `AccountPage`.
- Produces a wizard that calls `onConfigured` only after connection validation succeeds.

- [ ] **Step 1: Add failing tests for the seven-screen flow**

Verify one main screen at a time, progress copy, Back behavior, automatic identity creation, registration controls, and connection check placement.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npm.cmd test -- --run src/features/account/ConnectionWizard.test.tsx`

- [ ] **Step 3: Refactor the wizard**

Render a single screen per step, keep one primary action per screen, hide the optional key password behind a disclosure, and show saved access-code state without exposing its value.

- [ ] **Step 4: Add completion feedback**

After a successful `ConnectionCheckPanel` result, display “全部设置完成” and expose the completion callback.

- [ ] **Step 5: Run focused tests**

Run: `npm.cmd test -- --run src/features/account/ConnectionWizard.test.tsx src/features/account/ConnectionCheckPanel.test.tsx`

---

### Task 3: Recompose Account Page

**Files:**
- Modify: `src/features/account/AccountPage.tsx`
- Modify: `src/features/account/AccountPage.test.tsx`
- Modify: `src/features/account/account.css`
- Modify: `src/features/account/credentialFields.css`

**Interfaces:**
- Supplies organization state to `ConnectionWizard`.
- Displays completed status summary, normal update panel, restart setup control, and collapsed professional controls.

- [ ] **Step 1: Add failing layout and state tests**

Verify first-run users see the wizard, configured users see the summary, software update is outside professional display, and professional controls remain collapsed.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npm.cmd test -- --run src/features/account/AccountPage.test.tsx`

- [ ] **Step 3: Move company addresses into the wizard**

Pass current values and a save callback into the wizard instead of rendering a separate dense address card.

- [ ] **Step 4: Add the completed-state summary**

Show only connection status, company addresses, “重新设置连接”, the software update panel, and collapsed professional settings.

- [ ] **Step 5: Normalize layout styles**

Use a 720px single column, one unframed progress header, one active card, consistent status labels, and no nested cards.

- [ ] **Step 6: Run focused tests**

Run: `npm.cmd test -- --run src/features/account/AccountPage.test.tsx src/features/account/SoftwareUpdatePanel.test.tsx`

---

### Task 4: Regression And Desktop Verification

**Files:**
- Modify only files needed for defects discovered during verification.

**Interfaces:**
- Verifies browser preview and Electron desktop paths share the same visible flow while desktop-only actions remain guarded.

- [ ] **Step 1: Run all tests**

Run: `npm.cmd test -- --run`

- [ ] **Step 2: Build production assets**

Run: `npm.cmd run build`

- [ ] **Step 3: Inspect the account route**

Check desktop and narrow viewport layouts, keyboard focus order, help popovers, long URLs, button labels, and absence of overlapping content.

- [ ] **Step 4: Audit secrets and project data**

Verify no Token, private-key password, personal name, project path, or company URL was added to source defaults or build assets.

- [ ] **Step 5: Report without committing or packaging**

Summarize changed behavior, tests, build result, and any desktop-only item that still needs manual validation.
