# Simple Project Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a low-density project portal with separate GitLab and Ironforge areas and a select-project-before-action flow.

**Architecture:** Reuse the existing repository provider and upload/download routes. Refactor the project home into a two-tab portal and add a small project action route that forwards users into the existing guided workflows.

**Tech Stack:** React 19, React Router, TypeScript, Vitest, existing CSS variables and Lucide icons.

## Global Constraints

- Do not add dependencies.
- Do not read or store Ironforge cookies.
- Do not place upload/download buttons directly on project summary rows.
- Preserve public-release privacy auditing.

---

### Task 1: Simplify navigation

**Files:** Modify `src/components/AppShell.tsx`; test `src/app/App.test.tsx`.

- [ ] Update navigation to project portal and history only.
- [ ] Run `npm.cmd test -- --run src/app/App.test.tsx`.

### Task 2: Build the two-tab project portal

**Files:** Modify `src/features/tasks/TaskHomePage.tsx`, `src/features/tasks/projectCenter.css`, and `src/features/tasks/TaskHomePage.test.tsx`.

- [ ] Add GitLab/Ironforge tab state and accessible tab semantics.
- [ ] Make each GitLab project row one click target with summary-only content.
- [ ] Add an independent Ironforge login panel using the configured company URL.
- [ ] Test tab switching and project selection.

### Task 3: Add project action selection

**Files:** Create `src/features/tasks/ProjectActionsPage.tsx`; modify `src/app/routes.tsx`; add `src/features/tasks/ProjectActionsPage.test.tsx`.

- [ ] Show the selected project name and two plain choices.
- [ ] Route upload to `/workspace/upload/gitlab`.
- [ ] Route download to `/workspace/retrieve`.
- [ ] Test both destinations.

### Task 4: Reduce account-page density

**Files:** Modify `src/features/account/account.css`, `src/features/account/connectionWizard.css`, and account tests.

- [ ] Normalize spacing, headings, statuses, form columns, and primary actions.
- [ ] Keep detailed instructions in `FieldHelp`.
- [ ] Keep manual identity-key inputs inside “专业显示”.

### Task 5: Verify the release

**Files:** No product changes.

- [ ] Run `npm.cmd test -- --run`.
- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run audit:public-release`.
- [ ] Inspect desktop and responsive previews.
