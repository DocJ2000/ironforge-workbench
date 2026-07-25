# Simple Delivery Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the multi-page engineer interface with one guided delivery page that scans all valid repository changes, generates `charge.json` from selected output packages, syncs a user-selected branch, and creates an MR with real GitLab reviewers only after a separate confirmation.

**Architecture:** Move the Vite local API modules behind an Electron main-process IPC boundary for production while retaining Vite middleware during development. Add focused modules for output scanning, charge generation, GitLab operations, and workflow orchestration; expose typed clients to one React delivery page. Package pinned PortableGit and Git LFS binaries with the application so the browser never receives credentials and the installed app has no external runtime dependencies.

**Tech Stack:** React 19, TypeScript 6, React Router 7, Vite, Electron, electron-builder, Vitest, Testing Library, Playwright, bundled PortableGit/Git LFS, GitLab REST API v4.

## Global Constraints

- GitLab synchronization includes all valid changes under `source`, `reference`, `output`, plus root project files such as `charge.json`.
- Ironforge publishes only selected non-empty output packages represented in `charge.json`.
- At least one GitLab reviewer is required before MR creation.
- “同步到 GitLab” and “提交 Ironforge 发布审核（创建 MR）” are separate actions.
- GitLab sync requires a selected branch and a comment, then performs only checkout, Commit, and push.
- Reviewer selection is required only when creating the MR; syncing never requires a reviewer.
- Creating the GitLab MR submits the Ironforge publication for administrator review; no second publication button or comment is required.
- GitLab MR merge is treated as successful Ironforge publication.
- Every `git commit`, `git push`, MR creation/reopen, and MR merge requires explicit user confirmation immediately before execution.
- `.superpowers`, logs, caches, editor files, and tool temporary directories must never be committed.
- Credentials remain in the local backend process or OS-managed storage and are never returned to the React client.
- The implementation must preserve the existing repository scanner and safe deleted-CAD confirmation behavior.
- The distributed Windows application must start without system Node.js, npm, Git, or Git LFS.
- Automated tests must never write to the real `lens-mechanics` repository; all write-path tests use temporary repositories.
- Real-repository integration remains read-only until the user is present for supervised verification.

---

## File Structure

- `src/domain/delivery.ts`: shared delivery workflow types and pure validation.
- `server/outputPackages.ts`: scan non-empty `output/<domain>/<package>` directories.
- `server/chargeGenerator.ts`: preview and atomically write `charge.json`.
- `server/gitlabClient.ts`: project members, push, MR creation, and MR status through GitLab.
- `server/deliveryWorkflow.ts`: preview/execute boundary and idempotent recovery state.
- `server/repositoryApiPlugin.ts`: HTTP routing only.
- `src/data/deliveryClient.ts`: typed browser client for the delivery endpoints.
- `src/features/delivery/DeliveryPage.tsx`: one-page workflow owner.
- `src/features/delivery/ChangeSummary.tsx`: read-only change detail drawer.
- `src/features/delivery/PackageSelector.tsx`: selectable package list and file drawer.
- `src/features/delivery/ReviewerSelector.tsx`: searchable real member list.
- `src/features/delivery/GitLabSyncDialog.tsx`: required GitLab sync comment and final Commit/push/MR confirmation.
- `src/features/delivery/delivery.css`: responsive layout and stable control dimensions.
- `src/app/routes.tsx`: make the delivery page the primary route.
- `src/components/AppShell.tsx`: reduce navigation to the single primary workflow and secondary history access.
- `electron/main.ts`: desktop lifecycle, secure window creation, and IPC registration.
- `electron/preload.ts`: narrow typed API exposed to the renderer.
- `server/gitExecutable.ts`: resolve only bundled Git and Git LFS in packaged builds.
- `tests/fixtures/repositoryFixture.ts`: disposable Git/LFS repository factory for all write-path tests.

### Task 1: Delivery Domain Model

**Files:**
- Create: `src/domain/delivery.ts`
- Create: `src/domain/delivery.test.ts`
- Modify: `src/domain/repository.ts`

**Interfaces:**
- Produces: `OutputPackageCandidate`, `GitLabReviewer`, `DeliveryDraft`, `DeliveryPreview`, `DeliveryExecutionResult`, `IronforgePublishDraft`.
- Produces: `validateDeliveryDraft(draft: DeliveryDraft): string[]`.
- Consumes: existing `WorkingTreeChange` and `DeliveryPackage` types.

- [ ] **Step 1: Write the failing domain tests**

```ts
import { describe, expect, it } from 'vitest'
import { validateDeliveryDraft } from './delivery'

describe('validateDeliveryDraft', () => {
  it('requires changes, a commit message, and at least one reviewer', () => {
    expect(validateDeliveryDraft({
      message: '',
      changePaths: [],
      confirmedDeletions: [],
      selectedPackageIds: [],
      reviewerIds: [],
      targetBranch: 'main',
      mrTitle: '',
    })).toEqual([
      '没有需要提交的文件',
      '请填写本次改动说明',
      '请填写 MR 标题',
      '至少选择一位审核人',
    ])
  })

  it('allows GitLab-only synchronization with no output package', () => {
    expect(validateDeliveryDraft({
      message: '更新结构设计',
      changePaths: ['source/part.prt'],
      confirmedDeletions: [],
      selectedPackageIds: [],
      reviewerIds: [23],
      targetBranch: 'main',
      mrTitle: '更新结构设计',
    })).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `npm test -- src/domain/delivery.test.ts --run`

Expected: FAIL because `./delivery` does not exist.

- [ ] **Step 3: Implement the types and validation**

```ts
export interface OutputPackageCandidate {
  id: string
  name: string
  path: string
  domain: string
  files: Array<{ name: string; path: string; type: string; size: string }>
}

export interface GitLabReviewer {
  id: number
  name: string
  username: string
  avatarUrl?: string
  role: 'Owner' | 'Maintainer' | 'Developer' | 'Reporter' | 'Guest'
  recommended: boolean
}

export interface DeliveryDraft {
  message: string
  changePaths: string[]
  confirmedDeletions: string[]
  selectedPackageIds: string[]
  reviewerIds: number[]
  targetBranch: string
  mrTitle: string
}

export interface DeliveryPreview {
  branch: string
  draft: DeliveryDraft
  chargeChanged: boolean
  chargeBefore: unknown
  chargeAfter: unknown
  selectedPackages: OutputPackageCandidate[]
}

export interface DeliveryExecutionResult {
  commit: string
  branch: string
  mergeRequestIid: number
  mergeRequestUrl: string
}

export interface IronforgePublishDraft {
  mergeRequestIid: number
  packageIds: string[]
  comment: string
}

export function validateDeliveryDraft(draft: DeliveryDraft) {
  const errors: string[] = []
  if (!draft.changePaths.length) errors.push('没有需要提交的文件')
  if (!draft.message.trim()) errors.push('请填写本次改动说明')
  if (!draft.mrTitle.trim()) errors.push('请填写 MR 标题')
  if (!draft.reviewerIds.length) errors.push('至少选择一位审核人')
  return errors
}
```

- [ ] **Step 4: Run domain tests**

Run: `npm test -- src/domain/delivery.test.ts --run`

Expected: PASS.

- [ ] **Step 5: Request confirmation, then commit**

```bash
git add src/domain/delivery.ts src/domain/delivery.test.ts src/domain/repository.ts
git commit -m "feat: define delivery workflow domain"
```

### Task 2: Output Scanner and Charge Preview

**Files:**
- Create: `server/outputPackages.ts`
- Create: `server/outputPackages.test.ts`
- Create: `server/chargeGenerator.ts`
- Create: `server/chargeGenerator.test.ts`
- Modify: `server/repositoryScanner.ts`

**Interfaces:**
- Produces: `scanOutputPackages(repositoryPath: string): Promise<OutputPackageCandidate[]>`.
- Produces: `previewCharge(repositoryPath: string, packages: OutputPackageCandidate[], selectedIds: string[]): Promise<ChargePreview>`.
- Produces: `writeChargeAtomically(repositoryPath: string, preview: ChargePreview): Promise<void>`.

- [ ] **Step 1: Add failing scanner tests using a temporary repository fixture**

```ts
it('returns only non-empty second-level output packages', async () => {
  await mkdir(join(root, 'output', 'mechanical', '五金件'), { recursive: true })
  await mkdir(join(root, 'output', 'mechanical', '空包'), { recursive: true })
  await writeFile(join(root, 'output', 'mechanical', '五金件', '导轴.pdf'), 'pdf')

  const packages = await scanOutputPackages(root)

  expect(packages.map(({ name, path }) => ({ name, path }))).toEqual([
    { name: '五金件', path: 'output/mechanical/五金件' },
  ])
})
```

- [ ] **Step 2: Run scanner tests**

Run: `npm test -- server/outputPackages.test.ts --run`

Expected: FAIL because `scanOutputPackages` does not exist.

- [ ] **Step 3: Implement recursive file collection with stable package IDs**

Use `readdir(..., { withFileTypes: true })`, treat the first two directories below `output` as domain and package, recursively collect files inside each package, and sort by normalized relative path. Set `id` to the normalized package path.

- [ ] **Step 4: Add failing charge preview tests**

```ts
it('preserves charge object shape and updates only selected package entries', async () => {
  await writeFile(chargePath, JSON.stringify({ version: 1, packages: [] }))
  const result = await previewCharge(root, candidates, ['output/mechanical/五金件'])
  expect(result.after).toEqual({
    version: 1,
    packages: [{ name: '五金件', path: 'output/mechanical/五金件' }],
  })
})
```

- [ ] **Step 5: Implement format-aware preview and atomic writing**

Read the existing JSON. If the root is an array, emit the selected `{ name, path }[]`; if it is an object with `packages`, preserve other keys and replace only `packages`. Write to `charge.json.tmp`, validate by parsing it, then rename it to `charge.json`.

- [ ] **Step 6: Run server tests**

Run: `npm test -- server/outputPackages.test.ts server/chargeGenerator.test.ts server/repositoryScanner.test.ts --run`

Expected: PASS, including existing scanner coverage.

- [ ] **Step 7: Request confirmation, then commit**

```bash
git add server/outputPackages.ts server/outputPackages.test.ts server/chargeGenerator.ts server/chargeGenerator.test.ts server/repositoryScanner.ts
git commit -m "feat: generate charge from output packages"
```

### Task 3: GitLab Members and Merge Requests

**Files:**
- Create: `server/gitlabClient.ts`
- Create: `server/gitlabClient.test.ts`
- Create: `server/gitlabConfig.ts`
- Create: `.env.example`

**Interfaces:**
- Produces: `createGitLabClient(config: GitLabConfig, fetcher?: typeof fetch)`.
- Produces: `listReviewers(projectPath: string): Promise<GitLabReviewer[]>`.
- Produces: `createMergeRequest(input: CreateMergeRequestInput): Promise<CreatedMergeRequest>`.
- Produces: `getMergeRequest(projectPath: string, iid: number): Promise<MergeRequestState>`.

- [ ] **Step 1: Write failing request-shape tests with a fake fetcher**

```ts
it('creates an MR with reviewer_ids and keeps the source branch', async () => {
  const fetcher = vi.fn().mockResolvedValue(jsonResponse({
    iid: 3,
    web_url: 'https://gitlfs.lab.tp/project/-/merge_requests/3',
  }))
  const client = createGitLabClient(config, fetcher)

  await client.createMergeRequest({
    projectPath: 'rockteam/dragon/optics/lens-mechanics',
    sourceBranch: 'dev/T2',
    targetBranch: 'main',
    title: '提交所有的BOM交付包',
    description: '提交所有的BOM交付包',
    reviewerIds: [42],
  })

  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
    reviewer_ids: [42],
    remove_source_branch: false,
  })
})
```

- [ ] **Step 2: Run GitLab client tests**

Run: `npm test -- server/gitlabClient.test.ts --run`

Expected: FAIL because the client does not exist.

- [ ] **Step 3: Implement token-safe GitLab REST calls**

Read `GITLAB_BASE_URL` and `GITLAB_TOKEN` only in `gitlabConfig.ts`. Send the token in the `PRIVATE-TOKEN` request header. Convert member access levels `50/40/30/20/10` to Owner/Maintainer/Developer/Reporter/Guest. Mark name `胡庆磊` or username configured by `GITLAB_RECOMMENDED_REVIEWERS` as recommended.

- [ ] **Step 4: Test reviewer sorting and API errors**

Add coverage for recommended-first sorting, duplicate inherited members, `401` credential messages, and `409` existing-MR responses.

- [ ] **Step 5: Run GitLab tests**

Run: `npm test -- server/gitlabClient.test.ts --run`

Expected: PASS with no token values in thrown errors or snapshots.

- [ ] **Step 6: Request confirmation, then commit**

```bash
git add server/gitlabClient.ts server/gitlabClient.test.ts server/gitlabConfig.ts .env.example
git commit -m "feat: connect GitLab reviewers and merge requests"
```

### Task 4: Delivery Preview and Execution API

**Files:**
- Create: `server/deliveryWorkflow.ts`
- Create: `server/deliveryWorkflow.test.ts`
- Modify: `server/repositoryApiPlugin.ts`
- Modify: `server/repositoryApiPlugin.test.ts`
- Create: `src/data/deliveryClient.ts`
- Create: `src/data/deliveryClient.test.ts`

**Interfaces:**
- Produces endpoints:
  - `GET /api/delivery`
  - `GET /api/gitlab/reviewers`
  - `POST /api/delivery/preview`
  - `POST /api/delivery/execute`
- `syncGitLab` returns `GitLabSyncResult` and never creates an MR or publishes Ironforge.
- `createDeliveryMergeRequest` requires reviewers and creates the MR without committing or pushing again.

- [ ] **Step 1: Add failing workflow tests**

Cover preview without file writes, explicit `confirmed: true` enforcement, selected-branch checkout, charge atomic write before commit, commit before push, sync without reviewers, reviewer propagation during separate MR creation, and MR-create retry without a second commit.

- [ ] **Step 2: Run workflow tests**

Run: `npm test -- server/deliveryWorkflow.test.ts --run`

Expected: FAIL because the workflow module does not exist.

- [ ] **Step 3: Implement the orchestration boundary**

`previewDelivery` validates the draft, checks deleted CAD confirmations, calculates charge changes, and returns a complete preview. `syncGitLab` rejects requests without `confirmed: true`, switches to the selected branch, writes charge, calls the existing commit executor with all valid change paths plus `charge.json`, and pushes that branch. `createDeliveryMergeRequest` is a separate confirmed operation that validates reviewers and creates the MR from the already-pushed source branch.

Persist a small local operation receipt under the OS user data directory, keyed by repository root and commit SHA. If push succeeded but MR creation failed, a retry reads the receipt and calls only `createMergeRequest`.

- [ ] **Step 4: Add middleware routes and typed browser client**

Reuse the existing `sendJson` and bounded `readJson` helpers. Return `400` for invalid drafts, `401` for missing GitLab credentials, `409` for unsafe repository state, and `502` for GitLab transport failures.

- [ ] **Step 5: Run API and client tests**

Run: `npm test -- server/deliveryWorkflow.test.ts server/repositoryApiPlugin.test.ts src/data/deliveryClient.test.ts --run`

Expected: PASS.

- [ ] **Step 6: Request confirmation, then commit**

```bash
git add server/deliveryWorkflow.ts server/deliveryWorkflow.test.ts server/repositoryApiPlugin.ts server/repositoryApiPlugin.test.ts src/data/deliveryClient.ts src/data/deliveryClient.test.ts
git commit -m "feat: orchestrate confirmed delivery requests"
```

### Task 5: One-Page Delivery Interface

**Files:**
- Create: `src/features/delivery/DeliveryPage.tsx`
- Create: `src/features/delivery/DeliveryPage.test.tsx`
- Create: `src/features/delivery/ChangeSummary.tsx`
- Create: `src/features/delivery/PackageSelector.tsx`
- Create: `src/features/delivery/ReviewerSelector.tsx`
- Create: `src/features/delivery/DeliveryConfirmationDialog.tsx`
- Create: `src/features/delivery/delivery.css`
- Modify: `src/app/routes.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `DeliveryApi` from `src/data/deliveryClient.ts`.
- Produces: `/workspace` as the default one-page workflow with separate GitLab and Ironforge actions.
- Preserves: `/history` as a secondary read-only route.

- [ ] **Step 1: Write failing page behavior tests**

```tsx
it('opens read-only change details and requires a reviewer', async () => {
  render(<DeliveryPage api={fakeApi} repository={repository} />)
  await user.click(screen.getByRole('button', { name: '32 个文件' }))
  expect(screen.getByRole('dialog', { name: '本次同步文件' })).toBeVisible()
  expect(screen.getByRole('button', { name: '同步到 GitLab' })).toBeDisabled()
  await user.click(screen.getByRole('checkbox', { name: '选择审核人 胡庆磊' }))
  expect(screen.getByRole('button', { name: '同步到 GitLab' })).toBeEnabled()
})
```

Add tests for package selection, package file details, charge diff details, ignored-file details, reviewer search, the required GitLab sync comment dialog, and MR creation as the Ironforge publication review.

- [ ] **Step 2: Run page tests**

Run: `npm test -- src/features/delivery/DeliveryPage.test.tsx --run`

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Implement focused components**

Use button elements for clickable status chips, checkboxes for packages and reviewers, Lucide icons for refresh/search/close/file/status actions, and one accessible right-side drawer for all detail views. Keep file selection read-only. Render “同步到 GitLab” in step 1 and “提交发布审核” in step 2; the latter creates the GitLab MR.

- [ ] **Step 4: Implement the page state machine**

Use explicit states `loading | ready | gitlab_confirming | gitlab_syncing | waiting_review | ironforge_confirming | ironforge_publishing | complete | failed`. Derive button availability from domain validation, never from CSS alone. Both dialogs reject blank comments. Show the completed step, failure point, and retry scope after partial failures.

- [ ] **Step 5: Simplify routes and navigation**

Redirect `/` and `/overview` to `/workspace`. Remove stages and release from primary navigation without deleting their code in this task. Keep a compact repository identity area, one “交付” link, and one “历史” link.

- [ ] **Step 6: Run component and app tests**

Run: `npm test -- src/features/delivery/DeliveryPage.test.tsx src/app/App.test.tsx --run`

Expected: PASS.

- [ ] **Step 7: Request confirmation, then commit**

```bash
git add src/features/delivery src/app/routes.tsx src/components/AppShell.tsx src/styles/global.css
git commit -m "feat: simplify delivery into one guided page"
```

### Task 6: MR Review Status and Ironforge Gate

**Files:**
- Create: `server/mergeRequestStatus.ts`
- Create: `server/mergeRequestStatus.test.ts`
- Modify: `server/repositoryApiPlugin.ts`
- Modify: `src/data/deliveryClient.ts`
- Modify: `src/features/delivery/DeliveryPage.tsx`
- Modify: `src/features/delivery/DeliveryPage.test.tsx`

**Interfaces:**
- Produces: `GET /api/merge-requests/:iid/status`.
- Produces: `canPublishIronforge(state: MergeRequestState): boolean`.
- Does not implement the Ironforge upload transport in this phase.

- [ ] **Step 1: Write failing approval-gate tests**

```ts
expect(canPublishIronforge({ state: 'opened', approved: false })).toBe(false)
expect(canPublishIronforge({ state: 'opened', approved: true })).toBe(true)
expect(canPublishIronforge({ state: 'closed', approved: true })).toBe(false)
```

- [ ] **Step 2: Run status tests**

Run: `npm test -- server/mergeRequestStatus.test.ts --run`

Expected: FAIL because the status adapter does not exist.

- [ ] **Step 3: Implement polling and UI states**

Poll every 30 seconds only while the page is visible and an MR is open. Show `等待审核`, `需要修改`, `审核通过`, `已关闭`, or `已合并发布`. Do not render a second Ironforge publish action.

- [ ] **Step 4: Run status and page tests**

Run: `npm test -- server/mergeRequestStatus.test.ts src/features/delivery/DeliveryPage.test.tsx --run`

Expected: PASS.

- [ ] **Step 5: Request confirmation, then commit**

```bash
git add server/mergeRequestStatus.ts server/mergeRequestStatus.test.ts server/repositoryApiPlugin.ts src/data/deliveryClient.ts src/features/delivery/DeliveryPage.tsx src/features/delivery/DeliveryPage.test.tsx
git commit -m "feat: gate Ironforge delivery on MR approval"
```

### Task 7: End-to-End Verification and Cleanup

**Files:**
- Modify: `tests/e2e/workbench.spec.ts`
- Modify: `README.md`
- Delete only after replacement coverage passes:
  - `src/features/overview/OverviewPage.tsx`
  - `src/features/overview/OverviewPage.test.tsx`
  - `src/features/overview/WorkflowTimeline.tsx`
  - `src/features/stages/StagesPage.tsx`
  - `src/features/stages/StagesPage.test.tsx`
  - `src/features/release/ReleasePage.tsx`
  - `src/features/release/ReleasePage.test.tsx`
  - `src/features/release/ReleaseStepper.tsx`

**Interfaces:**
- Verifies the complete browser workflow against mocked remote GitLab responses and the live local repository scanner.

- [ ] **Step 1: Replace route-loop tests with delivery journeys**

Test desktop and mobile widths for:

- loading a live `dev/T2` snapshot
- opening all three detail drawers
- selecting and deselecting packages
- searching and selecting a reviewer
- opening the final confirmation dialog without executing remote actions
- waiting-for-review and approved states
- no horizontal overflow and no clipped long file paths

- [ ] **Step 2: Run the full automated suite**

Run: `npm test -- --run`

Expected: all Vitest suites pass.

Run: `npm run lint`

Expected: exit code 0.

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully.

Run: `npm run test:e2e`

Expected: desktop and mobile Playwright projects pass.

- [ ] **Step 3: Visually verify live desktop and mobile screenshots**

Start: `npm run dev -- --host 127.0.0.1`

Inspect `/workspace` at `1440x900` and `390x844`. Confirm the page is nonblank, the reviewer list and package controls fit, drawers stay inside the viewport, and no control overlaps another.

- [ ] **Step 4: Remove replaced screens and rerun verification**

Remove only modules with no remaining imports, then rerun:

```bash
npm test -- --run
npm run lint
npm run build
npm run test:e2e
```

Expected: all commands pass.

- [ ] **Step 5: Update README**

Document local startup, required GitLab environment variables, the user confirmation boundary, charge generation behavior, and the fact that Ironforge upload remains gated but its transport is not implemented in this phase.

- [ ] **Step 6: Request confirmation, then commit**

```bash
git add tests/e2e/workbench.spec.ts README.md src/features src/app/routes.tsx
git commit -m "test: verify simplified delivery workflow"
```

### Task 8: Package a Dependency-Free Windows Application

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `electron/ipc.ts`
- Create: `electron/ipc.test.ts`
- Create: `server/gitExecutable.ts`
- Create: `server/gitExecutable.test.ts`
- Create: `tests/fixtures/repositoryFixture.ts`
- Create: `scripts/fetch-portable-git.mjs`
- Create: `scripts/verify-package.mjs`
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `.gitignore`
- Modify: `README.md`

**Interfaces:**
- Produces: `window.ironforge.delivery.*` through a context-isolated preload bridge.
- Produces: `resolveGitExecutable(appResourcesPath: string, packaged: boolean): string`.
- Produces: `npm run package:win` and a versioned Windows `.exe` under `release/`.

- [ ] **Step 1: Add failing bundled-Git resolution tests**

```ts
it('never falls back to system Git in a packaged build', () => {
  expect(resolveGitExecutable('C:/Ironforge/resources', true)).toBe(
    'C:/Ironforge/resources/git/cmd/git.exe',
  )
})

it('uses an explicit test override only outside packaged builds', () => {
  expect(resolveGitExecutable('C:/resources', false, {
    IRONFORGE_TEST_GIT: 'C:/fixtures/git.exe',
  })).toBe('C:/fixtures/git.exe')
})
```

- [ ] **Step 2: Run the resolver tests**

Run: `npm test -- server/gitExecutable.test.ts --run`

Expected: FAIL because `gitExecutable.ts` does not exist.

- [ ] **Step 3: Implement bundled executable resolution**

In packaged mode, construct the path from `process.resourcesPath` and verify both `git/cmd/git.exe` and `git/mingw64/bin/git-lfs.exe` exist before enabling repository actions. Never call `Get-Command`, `where.exe`, or search `PATH` in packaged mode.

- [ ] **Step 4: Add failing Electron IPC security tests**

Verify that the preload exposes only scan, preview, GitLab sync, reviewer, MR-status, and Ironforge publish methods; `nodeIntegration` is false; `contextIsolation` is true; arbitrary command execution and filesystem paths outside the selected repository are not exposed.

- [ ] **Step 5: Implement Electron main, preload, and IPC adapters**

Create one `BrowserWindow` with:

```ts
webPreferences: {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  preload: join(__dirname, 'preload.js'),
}
```

Validate every IPC payload with the same domain validators used by the Vite API. Route operations to `deliveryWorkflow` without putting tokens or private keys in IPC responses.

- [ ] **Step 6: Add a disposable repository fixture**

`createRepositoryFixture()` creates a temporary Git repository, configures a local bare remote, installs a fake LFS filter for fixture files, and returns cleanup helpers. Reject any root whose resolved path equals or contains the configured real repository path.

- [ ] **Step 7: Configure reproducible Windows packaging**

Add `electron` and `electron-builder` as development dependencies. Configure `extraResources` to include `vendor/git`, use an NSIS per-user installer, disable automatic source-directory deletion, and emit SHA-256 checksums. `fetch-portable-git.mjs` downloads only the pinned version and verifies a hard-coded upstream SHA-256 before extracting to the ignored `vendor/git` directory.

- [ ] **Step 8: Build and verify the package without touching the real repository**

Run:

```bash
npm test -- --run
npm run build
npm run package:win
node scripts/verify-package.mjs
```

Expected:

- all tests pass using temporary fixtures
- `release/Ironforge-Workbench-<version>-Setup.exe` exists
- checksum verification passes
- packaged resources contain Git and Git LFS
- the verification script confirms no file timestamp or content changed under the configured real repository

- [ ] **Step 9: Perform supervised real integration later**

When the user is present, first run scan-only mode and compare its output with `git status`. Ask separately before Commit, push, and MR creation. Do not combine those approvals.

- [ ] **Step 10: Request confirmation, then commit**

```bash
git add electron server/gitExecutable.ts server/gitExecutable.test.ts tests/fixtures scripts package.json vite.config.ts .gitignore README.md
git commit -m "build: package standalone Windows workbench"
```
