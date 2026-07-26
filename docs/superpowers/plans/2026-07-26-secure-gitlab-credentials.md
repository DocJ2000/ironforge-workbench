# Secure GitLab Credentials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Goal:** Persist GitLab credentials with Windows-backed Electron encryption and expose only redacted status to the UI.

### Task 1: Encrypted Vault

- Create an injectable Electron credential vault.
- Test encrypted-at-rest storage, redacted status, validation, and clear.

### Task 2: Electron IPC

- Register save/status/clear handlers in the main process.
- Expose narrow preload methods.
- Permit the canonical Ironforge HTTP origin in external navigation.

### Task 3: Account UI

- Add a renderer credential client.
- Save and clear credentials only when the Electron bridge exists.
- Keep browser preview memory-only and label it accurately.

### Task 4: Verification

- Run vault tests, all tests, lint, desktop build, and account-page visual checks.
