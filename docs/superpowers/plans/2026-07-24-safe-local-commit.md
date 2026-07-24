# Safe Local Commit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow engineers to preview and explicitly confirm a local Git Commit without ever pushing automatically.

**Architecture:** A repository commit service validates selected paths against the live Git working tree and rejects pre-existing staged changes. The local API exposes separate preview and execute endpoints. The workspace UI requires a successful preview before showing the final confirmation action.

**Tech Stack:** Node.js `execFile`, Vite middleware, React 19, TypeScript, Vitest, Testing Library.

## Global Constraints

- Commit is local only; no Push or remote mutation.
- Selected paths must exactly match current working-tree changes.
- Deleted CAD paths require explicit confirmation.
- Existing staged changes block the operation.
- Empty or over-200-character commit messages are rejected.

### Task 1: Commit Domain Service

- [ ] Write failing temporary-repository tests for preview validation and local commit.
- [ ] Implement `previewRepositoryCommit` and `commitRepositoryChanges`.
- [ ] Verify selected-only commit behavior and clean failure recovery.

### Task 2: Commit API

- [ ] Write failing middleware tests for preview, execute, invalid JSON, and method handling.
- [ ] Add `POST /api/commit/preview` and `POST /api/commit`.
- [ ] Keep `GET /api/repository` behavior unchanged.

### Task 3: Confirmation UI

- [ ] Write failing workspace tests for preview and confirmation.
- [ ] Add the commit client, preview dialog, success/error feedback, and repository refresh.
- [ ] Verify all unit, build, lint, and browser tests.
