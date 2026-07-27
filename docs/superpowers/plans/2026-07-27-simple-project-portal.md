# Simple Project Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a low-density workspace with separate GitLab and Ironforge navigation and a select-project-before-action flow.

**Architecture:** Reuse the existing repository provider and upload/download routes. Give GitLab and Ironforge independent top-level routes, then forward a selected GitLab project into upload, download, or project history.

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

### Task 2: Build the GitLab project portal

**Files:** Modify `src/features/tasks/TaskHomePage.tsx`, `src/features/tasks/projectCenter.css`, and `src/features/tasks/TaskHomePage.test.tsx`.

- [ ] Make each GitLab project row one click target with summary-only content.
- [ ] Test project selection and navigation.

### Task 3: Add project action selection

**Files:** Create `src/features/tasks/ProjectActionsPage.tsx`; modify `src/app/routes.tsx`; add `src/features/tasks/ProjectActionsPage.test.tsx`.

- [ ] Show the selected project name and three plain choices.
- [ ] Route upload to `/workspace/upload/gitlab`.
- [ ] Route download to `/workspace/retrieve`.
- [ ] Route history to `/history`.
- [ ] Test all destinations.

### Task 4: Add the independent Ironforge page

**Files:** Create `src/features/tasks/IronforgePortalPage.tsx` and `src/features/tasks/ironforgePortal.css`; modify `src/app/routes.tsx`.

- [ ] Show software-window and browser choices using the configured company URL.
- [ ] Keep login wording independent from GitLab credentials.
- [ ] Test the missing-configuration state.

### Task 5: Reduce account-page density

**Files:** Modify `src/features/account/account.css`, `src/features/account/connectionWizard.css`, and account tests.

- [ ] Normalize spacing, headings, statuses, form columns, and primary actions.
- [ ] Keep detailed instructions in `FieldHelp`.
- [ ] Keep manual identity-key inputs inside “专业显示”.

### Task 6: Verify the release

**Files:** No product changes.

- [ ] Run `npm.cmd test -- --run`.
- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run audit:public-release`.
- [ ] Inspect desktop and responsive previews.
