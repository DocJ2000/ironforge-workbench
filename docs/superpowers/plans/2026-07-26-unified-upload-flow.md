# Unified Upload Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge GitLab upload and Ironforge delivery into one project-first upload workflow, and make retrieval project-first.

**Architecture:** Add an upload entry route that selects project and upload goal, then delegates to the existing focused wizards. Change the delivery wizard to synchronize all project changes in its first phase. Extend retrieval with project selection and add the canonical Ironforge URL.

**Tech Stack:** React, React Router, TypeScript, Vitest.

### Task 1: Upload Entry And Navigation

- Create `src/features/tasks/UploadEntryPage.tsx` and tests.
- Replace separate upload/delivery sidebar links with “上传项目”.
- Add routes `/workspace/upload`, `/workspace/upload/gitlab`, and `/workspace/upload/ironforge`.
- Redirect legacy task URLs.

### Task 2: Combined Ironforge Synchronization

- Remove the engineering-change guard from `IronforgeDeliveryPage`.
- Synchronize all repository changes plus selected packages and generated charge.
- Show project identity and link delivery success to `http://ironforge.holo.tp/projects`.
- Update tests to assert SOURCE and OUTPUT changes are sent together.

### Task 3: Project-First Retrieval

- Add project selection as the first retrieval step.
- Preserve selected project through action and destination steps.
- Link Ironforge drawing retrieval to the canonical site.
- Run all tests, lint, desktop build, and responsive visual checks.
