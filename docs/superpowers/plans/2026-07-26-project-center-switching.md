# Project Center Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a project-center start page and safe global project selection without allowing demonstration projects to execute Git operations.

**Architecture:** Extend repository context with a small frontend project registry and selected project ID. Reuse the same registry in the start page and sidebar switcher. Keep the live backend repository as the sole operational project and mark preview entries unavailable for writes.

**Tech Stack:** React, TypeScript, React Router, Vitest, Testing Library.

## Global Constraints

- Do not write to the mechanical repository during development.
- Only the backend-provided live repository may execute workflows.
- Project switching must update every route through repository context.

### Task 1: Project Registry Context

**Files:**
- Modify: `src/data/repositoryContext.ts`
- Modify: `src/data/RepositoryProvider.tsx`
- Test: `src/data/RepositoryProvider.test.tsx`

- [ ] Add project entries, selected ID, selection callback, and operation-ready state.
- [ ] Verify selection changes the current snapshot and selecting the live entry restores it.

### Task 2: Project Center And Sidebar Switcher

**Files:**
- Modify: `src/features/tasks/TaskHomePage.tsx`
- Modify: `src/components/RepositorySwitcher.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/features/tasks/tasks.css`
- Test: `src/features/tasks/TaskHomePage.test.tsx`

- [ ] Replace task cards with project status rows and add/download commands.
- [ ] Make the sidebar project control open a selectable project menu.
- [ ] Verify current-project markings and route-independent switching.

### Task 3: Workflow Safety And Verification

**Files:**
- Modify: `src/app/routes.tsx`
- Create: `src/features/tasks/ProjectUnavailable.tsx`
- Modify: `src/features/tasks/ProjectUploadPage.tsx`

- [ ] Block operational workflows when the selected project is not connected.
- [ ] Show project name and path in workflow confirmation.
- [ ] Run full tests, lint, desktop build, and responsive visual checks.
