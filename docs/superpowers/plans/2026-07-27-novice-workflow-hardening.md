# Novice Workflow Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make connection, project download, upload safety, project status, onboarding, and logout usable without Git knowledge.

**Architecture:** Electron and the local HTTP service own credentials, Git commands, connection checks, and risk checks. The renderer receives structured, redacted results and renders shared plain-language components. Existing project-level credentials remain a fallback behind the computer-wide credential.

**Tech Stack:** Electron IPC and safeStorage, Node HTTP middleware, bundled Git/OpenSSH, React 19, TypeScript, Vitest, Testing Library.

## Global Constraints

- Do not modify or validate the real mechanical repository; tests use temporary repositories and injected doubles.
- Do not expose tokens, passphrases, private-key contents, raw commands, or unredacted stderr to the renderer.
- All server-changing actions retain a final confirmation.
- Risk checks run before Git write commands.
- Normal UI copy does not require Git terminology.
- Do not build or replace the Windows installer in this plan.

---

### Task 1: Friendly error model and connection checks

**Files:**
- Create: `server/friendlyError.ts`
- Create: `server/friendlyError.test.ts`
- Create: `server/connectionCheck.ts`
- Create: `server/connectionCheck.test.ts`
- Modify: `server/gitlabClient.ts`
- Modify: `server/repositoryApiPlugin.ts`
- Modify: `src/data/deliveryClient.ts`
- Create: `src/features/account/ConnectionCheckPanel.tsx`
- Create: `src/features/account/ConnectionCheckPanel.test.tsx`
- Modify: `src/features/account/ConnectionWizard.tsx`

**Interfaces:**
- Produces `FriendlyError { code, title, detail, filesSafe, nextAction, technicalSummary? }`.
- Produces `checkConnection(projectPath, credentials, dependencies): Promise<ConnectionCheckResult>`.
- Produces `GET /api/connection/check?projectId=...`.
- Produces `DeliveryApi.checkConnection()`.

- [ ] **Step 1: Write failing friendly-error tests**

```ts
expect(toFriendlyError(new Error('Permission denied (publickey)'))).toMatchObject({
  code: 'identity_not_registered',
  filesSafe: true,
  nextAction: '打开账户与连接，复制电脑登记码并添加到 GitLab。',
})
expect(toFriendlyError(new Error('connect ETIMEDOUT'))).toMatchObject({
  code: 'company_network_unreachable',
  filesSafe: true,
})
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm.cmd test -- --run server/friendlyError.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement stable error classification**

Classify network, invalid token, missing identity, dirty pull, diverged history, missing branch, duplicate tag, permission, locked path, invalid path, and disk-full errors. Unknown errors return `unknown_error` and a redacted `technicalSummary` limited to one line and 240 characters.

- [ ] **Step 4: Write failing connection-check tests**

Use injected functions:

```ts
const result = await checkConnection('project', credentials, {
  probeServer: vi.fn().mockResolvedValue(undefined),
  probeApi: vi.fn().mockResolvedValue({ username: 'jiangcheng' }),
  probeSsh: vi.fn().mockResolvedValue(undefined),
})
expect(result.checks.map((item) => item.status)).toEqual(['passed', 'passed', 'passed'])
```

Also assert API failure skips SSH and returns a friendly next action.

- [ ] **Step 5: Implement read-only probes and endpoint**

`probeServer` uses a bounded HTTP request, `probeApi` calls `/api/v4/user`, and `probeSsh` runs `git ls-remote --heads origin` with stored credentials. The endpoint never accepts credentials in request JSON.

- [ ] **Step 6: Implement the renderer panel**

Render three rows: “公司网络”“软件访问码”“电脑身份钥匙”, one “检查连接” button, and `FriendlyErrorNotice` content for failures. Add it to the final wizard step.

- [ ] **Step 7: Run focused tests and commit**

Run:

```powershell
npm.cmd test -- --run server/friendlyError.test.ts server/connectionCheck.test.ts src/features/account
npm.cmd run build:desktop
git add server src electron
git commit -m "feat: add read-only connection checks"
```

---

### Task 2: Automatic computer identity for project downloads

**Files:**
- Modify: `server/repositoryApiPlugin.ts`
- Modify: `server/repositoryClone.ts`
- Modify: `server/repositoryClone.test.ts`
- Modify: `src/data/deliveryClient.ts`
- Modify: `src/features/tasks/RetrievePage.tsx`
- Modify: `src/features/tasks/RetrievePage.test.tsx`

**Interfaces:**
- Changes `DeliveryApi.clone` input to `{ remoteUrl, destination }`.
- Local middleware resolves computer-wide credentials and supplies `GitRemoteCredentials` internally.

- [ ] **Step 1: Write a failing middleware/download test**

Assert that `/api/gitlab/clone` calls the clone executor with credentials resolved from the vault while the request body contains no key path or passphrase.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm.cmd test -- --run server/repositoryApiPlugin.test.ts src/features/tasks/RetrievePage.test.tsx`

- [ ] **Step 3: Move identity resolution behind the endpoint**

Remove `sshKeyPath` and `sshPassphrase` from renderer input. Resolve them with `resolveCredentials(projectId || 'computer')` before calling `cloneRepository`.

- [ ] **Step 4: Simplify the download form**

Show only “管理员提供的项目下载地址” and “保存到这个文件夹”. Remove the advanced identity inputs from this workflow.

- [ ] **Step 5: Run tests and commit**

Run:

```powershell
npm.cmd test -- --run server/repositoryClone.test.ts server/repositoryApiPlugin.test.ts src/features/tasks/RetrievePage.test.tsx
git add server src
git commit -m "feat: use computer identity for project downloads"
```

---

### Task 3: Shared actionable error notices

**Files:**
- Create: `src/domain/friendlyError.ts`
- Create: `src/features/errors/FriendlyErrorNotice.tsx`
- Create: `src/features/errors/FriendlyErrorNotice.test.tsx`
- Modify: `src/data/deliveryClient.ts`
- Modify: `src/features/tasks/ProjectUploadPage.tsx`
- Modify: `src/features/tasks/IronforgeDeliveryPage.tsx`
- Modify: `src/features/tasks/RetrievePage.tsx`
- Modify: `src/features/account/ConnectionWizard.tsx`

**Interfaces:**
- `requestJson` throws `FriendlyOperationError` when the server returns a structured friendly error.
- `FriendlyErrorNotice` consumes `FriendlyError`.

- [ ] **Step 1: Write failing parsing and component tests**

Assert a JSON error payload preserves `code`, `filesSafe`, and `nextAction`. Assert the component displays “你的本地文件没有改变” when `filesSafe` is true and hides technical details by default.

- [ ] **Step 2: Implement the typed client error**

Parse `{ error: FriendlyError }` without converting it back to a plain message. Preserve legacy string errors as `unknown_error`.

- [ ] **Step 3: Implement and adopt the shared notice**

Replace plain red error strings in connection, upload, delivery, and retrieve workflows. The notice includes a collapsed “给技术同事看的信息” only when `technicalSummary` exists.

- [ ] **Step 4: Run tests and commit**

Run:

```powershell
npm.cmd test -- --run src/data/deliveryClient.test.ts src/features/errors src/features/tasks src/features/account
git add src
git commit -m "feat: explain operation failures with next actions"
```

---

### Task 4: Read-only upload risk checks

**Files:**
- Create: `server/projectRiskService.ts`
- Create: `server/projectRiskService.test.ts`
- Modify: `server/deliveryWorkflow.ts`
- Modify: `server/deliveryWorkflow.test.ts`
- Modify: `server/repositoryApiPlugin.ts`
- Modify: `src/domain/delivery.ts`
- Modify: `src/data/deliveryClient.ts`
- Create: `src/features/delivery/RiskCheckPanel.tsx`
- Create: `src/features/delivery/RiskCheckPanel.test.tsx`
- Modify: `src/features/tasks/ProjectUploadPage.tsx`
- Modify: `src/features/tasks/IronforgeDeliveryPage.tsx`

**Interfaces:**
- Produces `ProjectRiskResult { blocking: ProjectRisk[]; warnings: ProjectRisk[] }`.
- Produces `POST /api/gitlab/preflight`.
- Adds `DeliveryApi.preflight(draft)`.

- [ ] **Step 1: Write failing risk tests**

Cover unconfirmed deleted CAD, server-ahead state, unexpected current branch, duplicate tag, and empty change set. Assert each has a stable code and `blocking: true`.

- [ ] **Step 2: Implement injected read-only checks**

Use `git status`, `git fetch --dry-run` or `ls-remote`, local branch inspection, and tag availability checks without modifying the working tree. Deleted-file confirmation is derived from the draft.

- [ ] **Step 3: Enforce preflight inside write workflows**

Do not rely only on the UI endpoint. `syncGitLab` reruns risk checks immediately before checkout, commit, tag, or push and aborts on blocking risks.

- [ ] **Step 4: Add guided risk UI**

Insert a “安全检查” step before final confirmation. Display passed checks, blocking issues, and explicit deletion confirmations.

- [ ] **Step 5: Run tests and commit**

Run:

```powershell
npm.cmd test -- --run server/projectRiskService.test.ts server/deliveryWorkflow.test.ts src/features/delivery/RiskCheckPanel.test.tsx src/features/tasks
git add server src
git commit -m "feat: block unsafe uploads before writing"
```

---

### Task 5: Business-first project home status

**Files:**
- Create: `src/domain/projectStatus.ts`
- Create: `src/domain/projectStatus.test.ts`
- Create: `src/features/tasks/ProjectStatusSummary.tsx`
- Create: `src/features/tasks/ProjectStatusSummary.test.tsx`
- Modify: `src/features/tasks/TaskHomePage.tsx`
- Modify: `src/features/tasks/projectCenter.css`

**Interfaces:**
- Produces `summarizeProjectStatus(repository): ProjectBusinessStatus`.

- [ ] **Step 1: Write failing status-priority tests**

Priority order: server updates first, local upload second, waiting approval third, publication fourth, otherwise up to date. Each result includes one label, tone, and recommended route/action.

- [ ] **Step 2: Implement the pure status mapper**

Map repository `changes`, `behind`, merge-request state, and publish-job state to four visible facts and one recommendation.

- [ ] **Step 3: Replace dense project-row facts**

Show the four plain-language facts with icons. Keep the work-version name as secondary text. Add one action button based on the mapper.

- [ ] **Step 4: Run tests and commit**

Run:

```powershell
npm.cmd test -- --run src/domain/projectStatus.test.ts src/features/tasks/ProjectStatusSummary.test.tsx src/features/tasks/TaskHomePage.test.tsx
git add src
git commit -m "feat: show business-first project status"
```

---

### Task 6: First-run checklist

**Files:**
- Create: `electron/onboardingStore.ts`
- Create: `electron/onboardingStore.test.ts`
- Modify: `electron/main.ts`
- Modify: `electron/preload.cts`
- Modify: `src/types/desktop.d.ts`
- Create: `src/data/onboardingClient.ts`
- Create: `src/features/tasks/FirstRunChecklist.tsx`
- Create: `src/features/tasks/FirstRunChecklist.test.tsx`
- Modify: `src/features/tasks/TaskHomePage.tsx`

**Interfaces:**
- IPC returns `{ connected, projectAdded, firstUpload, dismissed }`.
- Renderer can update only `firstUpload` after a confirmed successful upload and `dismissed`; connection and project presence are derived.

- [ ] **Step 1: Write failing persistence tests**

Assert the store writes under application user data, never inside a project, survives reload, and tolerates missing/corrupt files.

- [ ] **Step 2: Implement narrow IPC**

Expose `onboarding.status()`, `onboarding.markFirstUpload()`, and `onboarding.setDismissed(value)`.

- [ ] **Step 3: Implement checklist component**

Render the three steps with real completion states. Auto-collapse when all complete; add a “查看首次使用步骤” action to reopen.

- [ ] **Step 4: Mark first upload only after success**

Call `markFirstUpload` from successful project upload and Ironforge upload flows, never on preview or failure.

- [ ] **Step 5: Run tests and commit**

Run:

```powershell
npm.cmd test -- --run electron/onboardingStore.test.ts src/features/tasks/FirstRunChecklist.test.tsx src/features/tasks
npm.cmd run build:desktop
git add electron src
git commit -m "feat: add a real first-use checklist"
```

---

### Task 7: Clear connection status and logout semantics

**Files:**
- Modify: `electron/credentialVault.ts`
- Modify: `electron/credentialVault.test.ts`
- Modify: `electron/identityKeyService.ts`
- Modify: `electron/identityKeyService.test.ts`
- Modify: `electron/main.ts`
- Modify: `electron/preload.cts`
- Modify: `src/types/desktop.d.ts`
- Modify: `src/features/account/AccountPage.tsx`
- Modify: `src/features/account/AccountPage.test.tsx`
- Create: `src/features/account/ClearConnectionDialog.tsx`
- Create: `src/features/account/ClearConnectionDialog.test.tsx`

**Interfaces:**
- `CredentialVault.clearComputerConnection()` removes encrypted credentials but not identity files.
- Advanced `IdentityKeyService.remove(projectId)` is a separate confirmed operation.

- [ ] **Step 1: Write failing clear-semantics tests**

Assert clearing credentials removes token and passphrase, leaves the private/public identity files, and does not touch any registered project.

- [ ] **Step 2: Implement explicit status cards**

Show company server status from the last connection check. Show Ironforge as “需要在浏览器登录” or “已打开登录页面”; do not claim the browser session is authenticated without evidence.

- [ ] **Step 3: Implement the clear-connection confirmation**

Explain exactly what is removed and retained. The primary action says “清除本机登录信息”. Identity deletion remains in advanced settings with a second, stronger confirmation.

- [ ] **Step 4: Run complete verification**

Run:

```powershell
npm.cmd test -- --run
npm.cmd run lint
npm.cmd run build:desktop
git diff --check
```

Expected: all pass, no installer is created, and the mechanical repository is unchanged.

- [ ] **Step 5: Visual review**

Review `/workspace`, `/workspace/retrieve`, `/workspace/upload`, and `/account` at desktop and narrow viewports. Verify no blocked technical terms, horizontal overflow, overlapping help panels, or ambiguous destructive actions.

- [ ] **Step 6: Commit**

```powershell
git add electron server src docs
git commit -m "feat: clarify connection status and logout"
```
