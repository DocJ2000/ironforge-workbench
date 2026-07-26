# Real Project Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Goal:** Make real local projects registrable and route all Git operations by validated project ID.

**Architecture:** Add a backend registry with atomic persistence and canonical Git-root validation. Inject project resolution into the existing middleware, then update frontend clients and provider to list and select real projects.

### Task 1: Registry Module

- Create `server/projectRegistry.ts` and temporary-repository tests.
- Validate Git roots, prevent duplicates, persist atomically, and resolve only known IDs.

### Task 2: Project API And Middleware Isolation

- Add list/add/remove endpoints.
- Resolve `projectId` before repository, delivery, commit, branch, tag, attachment, and MR work.
- Preserve dependency-injected compatibility tests while adding unknown-ID rejection tests.

### Task 3: Frontend Registry Client

- Add project-list/add/remove client methods.
- Replace the Aurora demonstration entry with backend records.
- Add local-folder registration UI without storing arbitrary paths in normal frontend configuration.

### Task 4: Verification

- Run temporary-repository end-to-end isolation tests.
- Run all tests, lint, desktop build, and visual checks.
