# Ironforge Workbench UI Redesign and Code Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a safer, clearer project-led desktop workflow for engineers who do not understand Git terminology.

**Architecture:** Preserve the existing React, Electron IPC, local server, and repository-service boundaries. Introduce a shared page-layout vocabulary and focused project-status presentation, then tighten the existing upload, draft recovery, external-link, credential, and update boundaries identified by the review.

**Tech Stack:** React 19, TypeScript 6, React Router 7, Electron 43, Vitest, Testing Library, Playwright, CSS.

## Global Constraints

- Do not change user engineering projects during validation.
- Do not place personal, company, credential, or project data in source or release artifacts.
- Keep GitLab and Ironforge as the only primary navigation entries.
- Use plain Chinese labels by default and keep Git terms in help or “专业显示”.
- Keep `main` protected as an MR target, never a direct upload target.
- Preserve unfinished workflow drafts across navigation; clear only on an explicit workflow exit.
- Use no additional runtime dependencies.

---

### Task 1: Establish review findings and safety tests

**Files:**
- Create: `docs/reviews/2026-07-30-code-review.md`
- Modify: high-risk tests under `electron/`, `server/`, and `src/data/`

**Interfaces:**
- Consumes: existing IPC handlers, Git command wrappers, credential clients, workflow draft clients
- Produces: prioritized review findings and regression tests for accepted findings

- [ ] **Step 1: Run the existing full suite, lint, build, and public-release audit**

Run: `npm.cmd test -- --run`, `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run audit:public-release`

- [ ] **Step 2: Review correctness and security boundaries**

Inspect Git subprocess arguments, remote URL validation, IPC input validation, credential persistence, draft persistence, update timers, project refresh behavior, and MR targeting.

- [ ] **Step 3: Record only material findings**

For each accepted finding, record file/line, cause, risk, suggested improvement, and the positive pattern already present.

- [ ] **Step 4: Write a failing regression test for each finding selected for repair**

Tests must demonstrate the concrete boundary or failure mode before implementation changes.

- [ ] **Step 5: Commit the review and tests**

Run: `git commit -m "test: capture workbench review findings"`

### Task 2: Build the shared precision-workshop layout

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/global.css`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/app/App.test.tsx`

**Interfaces:**
- Consumes: current router and navigation structure
- Produces: stable sidebar, responsive content frame, buttons, fields, focus states, status colors

- [ ] **Step 1: Add tests for the two-item navigation and accessible account entry**
- [ ] **Step 2: Verify the tests fail against any missing semantics**
- [ ] **Step 3: Implement the precision-workshop tokens and shell**
- [ ] **Step 4: Run the shell tests and lint**
- [ ] **Step 5: Commit with `feat: establish precision workshop shell`**

### Task 3: Redesign the GitLab project register

**Files:**
- Modify: `src/features/tasks/TaskHomePage.tsx`
- Modify: `src/features/tasks/projectCenter.css`
- Modify: `src/features/tasks/projectEmpty.css`
- Modify: `src/features/tasks/TaskHomePage.test.tsx`
- Modify: `src/features/tasks/ProjectActionsPage.tsx`
- Modify: `src/features/tasks/projectActions.css`

**Interfaces:**
- Consumes: `RepositoryProvider` repository list and refresh operations
- Produces: project rows with status rail, empty state, page-header tools, project action page

- [ ] **Step 1: Add tests for empty, populated, refreshed, and project-open states**
- [ ] **Step 2: Verify the new expectations fail**
- [ ] **Step 3: Implement the row-based register and project detail actions**
- [ ] **Step 4: Run project page tests at desktop and narrow widths**
- [ ] **Step 5: Commit with `feat: redesign GitLab project register`**

### Task 4: Normalize guided workflows and recovery

**Files:**
- Modify: `src/features/tasks/ProjectUploadPage.tsx`
- Modify: `src/features/tasks/projectUpload.css`
- Modify: `src/features/tasks/GuidedWorkflow.tsx`
- Modify: `src/data/workflowDraftClient.ts`
- Modify: `src/features/tasks/ProjectUploadPage.test.tsx`
- Modify: `src/data/workflowDraftClient.test.ts`

**Interfaces:**
- Consumes: project context, output package tree, branch operations, upload receipts
- Produces: consistent wizard frame, preserved navigation drafts, explicit-exit clearing, retryable failed uploads

- [ ] **Step 1: Add failing tests for navigation retention, explicit-exit clearing, and failed-push recovery**
- [ ] **Step 2: Implement explicit draft lifecycle helpers**
- [ ] **Step 3: Apply a stable, full-height wizard layout**
- [ ] **Step 4: Run upload, delivery, and draft tests**
- [ ] **Step 5: Commit with `fix: make upload workflow recoverable`**

### Task 5: Simplify account, error, history, and update surfaces

**Files:**
- Modify: `src/features/account/AccountPage.tsx`
- Modify: `src/features/account/account.css`
- Modify: `src/features/account/SoftwareUpdatePanel.tsx`
- Modify: `src/features/history/HistoryPage.tsx`
- Modify: `src/features/history/history.css`
- Modify: `src/features/errors/FriendlyErrorNotice.tsx`
- Modify: related component tests

**Interfaces:**
- Consumes: durable settings, credential status, Git history, update coordinator status
- Produces: four-part account flow, branch-aware history, actionable error text, visible update progress

- [ ] **Step 1: Add tests for simplified sections and actionable states**
- [ ] **Step 2: Verify the tests fail where behavior is absent**
- [ ] **Step 3: Implement the simplified layouts without changing credential storage**
- [ ] **Step 4: Run account, history, error, and update tests**
- [ ] **Step 5: Commit with `feat: simplify account and status surfaces`**

### Task 6: Responsive and release verification

**Files:**
- Modify: `tests/e2e/workbench.spec.ts`
- Modify: CSS files only where screenshot review finds defects
- Modify: `CHANGELOG.md`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: completed UI and release audit scripts
- Produces: verified desktop and narrow-window build with documented release changes

- [ ] **Step 1: Add E2E checks for project register, project actions, upload wizard, and account page**
- [ ] **Step 2: Run screenshots at 1440×900, 1920×1080, and 760px**
- [ ] **Step 3: Correct overflow, overlap, focus, and wasted-space defects**
- [ ] **Step 4: Run full tests, lint, build, E2E, and public-release audit**
- [ ] **Step 5: Update the version and changelog only after verification**
- [ ] **Step 6: Commit with `release: prepare redesigned workbench`**

