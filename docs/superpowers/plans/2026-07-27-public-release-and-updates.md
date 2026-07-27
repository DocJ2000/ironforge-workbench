# Public Release And Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an audited public-source Windows installer with explicit GitHub Releases updates and preserved local settings.

**Architecture:** A small Electron update coordinator owns updater state and IPC, while a backup service snapshots only application metadata before installation. The React account page consumes a narrow preload bridge. Release scripts audit tracked source and packaged artifacts before electron-builder emits NSIS and GitHub metadata.

**Tech Stack:** Electron 43, electron-updater, electron-builder NSIS, React 19, TypeScript 6, Vitest.

## Global Constraints

- Never read, modify, move, or back up engineering project contents during application updates.
- Never automatically download or install an update.
- Keep `appId` fixed as `com.ironforge.workbench`.
- Keep credentials encrypted with Windows `safeStorage`.
- Public source and artifacts must contain no organization, person, project, path, or credential markers.
- Do not publish unsigned builds beyond the initial controlled trial.

---

### Task 1: Public Source Audit

**Files:**
- Modify: `scripts/audit-public-release.mjs`
- Create: `scripts/audit-public-source.mjs`
- Modify: `package.json`
- Modify: public source files reported by the audit
- Test: `scripts/audit-public-source.test.mjs`

**Interfaces:**
- Produces: `npm run audit:public-source`, a zero-exit scan of tracked text files.

- [ ] Write a failing test that creates a tracked-file list containing a forbidden domain and expects a reported violation.
- [ ] Run `node --test scripts/audit-public-source.test.mjs` and verify the missing scanner failure.
- [ ] Implement a reusable scanner and a Git-tracked-source entry point that excludes only the scanner's own pattern declarations.
- [ ] Replace internal fixtures, documentation, environment examples, and development defaults with generic values.
- [ ] Run the source audit and commit the public-source cleanup.

### Task 2: Update Backup Service

**Files:**
- Create: `electron/updateBackup.ts`
- Test: `electron/updateBackup.test.ts`

**Interfaces:**
- Produces: `createUpdateBackup({ userDataPath, projectRegistryPath, now, retention }): Promise<string>`.

- [ ] Write failing tests proving encrypted credentials and project registry are copied, project folders are not traversed, and old backups are pruned.
- [ ] Run the focused test and verify failure because the service is missing.
- [ ] Implement atomic, dated metadata backups with five-backup retention.
- [ ] Run focused and full tests, then commit.

### Task 3: Explicit Desktop Update Coordinator

**Files:**
- Create: `electron/updateCoordinator.ts`
- Create: `electron/updateCoordinator.test.ts`
- Modify: `electron/main.ts`
- Modify: `electron/preload.cjs`
- Modify: `src/types/desktop.d.ts`
- Modify: `package.json`

**Interfaces:**
- Produces IPC commands `updates:status`, `updates:check`, `updates:download`, and `updates:install`.
- Consumes `createUpdateBackup` immediately before installation.

- [ ] Write failing state-transition tests for unavailable, checking, available, downloading, ready, and error states.
- [ ] Verify the tests fail because the coordinator is absent.
- [ ] Add `electron-updater` and implement the coordinator with no automatic download or installation.
- [ ] Register IPC and preload methods; disable network checks in development builds.
- [ ] Run focused and full tests, then commit.

### Task 4: Novice Update UI

**Files:**
- Create: `src/data/updateClient.ts`
- Create: `src/data/updateClient.test.ts`
- Create: `src/features/account/SoftwareUpdatePanel.tsx`
- Create: `src/features/account/SoftwareUpdatePanel.test.tsx`
- Modify: `src/features/account/AccountPage.tsx`

**Interfaces:**
- Consumes the preload update bridge.
- Produces an account-page panel with explicit check, download, and restart-install actions.

- [ ] Write failing component tests proving checking is harmless and install requires a separate click.
- [ ] Verify focused tests fail for the missing panel.
- [ ] Implement novice copy, status display, progress, retry, and explicit actions.
- [ ] Run focused tests, full tests, lint, and commit.

### Task 5: GitHub Release Packaging

**Files:**
- Create: `electron-builder.config.cjs`
- Create: `scripts/package-public-source.mjs`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Consumes `GH_OWNER`, `GH_REPO`, and release-time `GH_TOKEN`.
- Produces NSIS installer, block map, updater YAML, and audited source archive.

- [ ] Add a failing configuration test requiring GitHub owner/repository for release packaging.
- [ ] Verify the release configuration test fails.
- [ ] Move builder configuration into a dynamic config that injects GitHub publication metadata without storing credentials.
- [ ] Implement source archive generation from a clean audited commit.
- [ ] Build the installer locally without publishing and inspect the artifact list.
- [ ] Run the complete verification suite and commit.

### Task 6: Release Readiness Gate

**Files:**
- Modify: `scripts/audit-public-release.mjs`
- Modify: `README.md`

**Interfaces:**
- Produces: `npm run verify:release`.

- [ ] Compose source audit, tests, lint, desktop build, artifact audit, and installer build into one command.
- [ ] Run `npm run verify:release`.
- [ ] Inspect installer metadata and hashes, confirm the Git working tree is clean, and commit any final documentation correction.
