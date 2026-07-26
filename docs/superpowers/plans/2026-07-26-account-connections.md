# Account And Connections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Goal:** Remove redundant global project selection and add a transparent account-connections page for GitLab and Ironforge.

**Architecture:** Keep secrets in component memory for the preview, link Ironforge authentication to the system browser, and reserve persistent credentials for the Windows secure-storage phase.

### Task 1: Simplify Sidebar

- Remove `RepositorySwitcher` and repository-source UI.
- Turn the user footer into a route link for `/account`.
- Keep task project selection inside the workflows.

### Task 2: Account Page

- Add `AccountPage` with GitLab URL, token, SSH-key path, visibility control, and memory-only validation.
- Add Ironforge SSO status explanation and browser login button.
- Add tests for secret visibility and Ironforge URL.

### Task 3: Verification

- Run all tests, lint, desktop build, and desktop/mobile visual checks.
