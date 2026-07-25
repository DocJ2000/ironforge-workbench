# Branches, Version Tags, and MR Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let engineers create a branch, optionally tag a synchronized commit with a unique version, and create an MR with independent Markdown content, Feishu links, and GitLab-hosted PDF/image attachments.

**Architecture:** Keep Git mutations in focused server modules and expose explicit local API endpoints. Extend the existing delivery domain types so the React page can compose branch, tag, and MR data without shell access. Attachments remain local selections until MR confirmation; the server uploads them to GitLab, appends returned Markdown, and then creates the MR.

**Tech Stack:** React 19, TypeScript, Vite middleware, Vitest, Node `child_process`, GitLab REST API v4, GitLab Flavored Markdown.

## Global Constraints

- Never write to the real `lens-mechanics` repository during development or automated verification.
- Never overwrite, force-move, or delete an existing local or remote Tag.
- Branch creation, Commit, push, Tag creation/push, attachment upload, and MR creation require explicit user actions.
- The installed desktop application must not require system Node.js, npm, Git, or Git LFS.
- Feishu links retain their existing Feishu permissions; the application does not copy document content or alter access.
- PDF and image files are uploaded to GitLab only after the user confirms MR creation.

---

### Task 1: Branch Creation Service and UI

**Files:**
- Create: `server/gitBranchOperations.test.ts`
- Modify: `server/gitBranchOperations.ts`
- Modify: `server/repositoryApiPlugin.ts`
- Modify: `server/repositoryApiPlugin.test.ts`
- Create: `src/features/delivery/CreateBranchDialog.tsx`
- Modify: `src/features/delivery/DeliveryPage.tsx`
- Modify: `src/features/delivery/DeliveryPage.test.tsx`
- Modify: `src/features/delivery/delivery.css`
- Modify: `src/data/deliveryClient.ts`

**Interfaces:**
- Produces: `createRepositoryBranch(repositoryPath, { name, startPoint }): Promise<void>`
- Produces: `DeliveryApi.createBranch({ name, startPoint }): Promise<{ branch: string }>`
- Route: `POST /api/gitlab/branches`

- [ ] **Step 1: Write failing branch validation and API tests**

```ts
it('creates a new branch from the selected start point', async () => {
  await createRepositoryBranch(repositoryPath, {
    name: 'dev/T3',
    startPoint: 'dev/T2',
  })
  expect(await currentBranch(repositoryPath)).toBe('dev/T3')
})

it('refuses an existing or invalid branch name', async () => {
  await expect(createRepositoryBranch(repositoryPath, {
    name: 'dev/T2',
    startPoint: 'main',
  })).rejects.toThrow('分支已存在')
})
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm.cmd test -- server/gitBranchOperations.test.ts server/repositoryApiPlugin.test.ts --run`

Expected: FAIL because `createRepositoryBranch` and `/api/gitlab/branches` do not exist.

- [ ] **Step 3: Implement safe local branch creation**

```ts
export interface CreateBranchInput {
  name: string
  startPoint: string
}

export async function createRepositoryBranch(
  repositoryPath: string,
  input: CreateBranchInput,
) {
  await git(repositoryPath, ['check-ref-format', '--branch', input.name])
  const exists = await branchExists(repositoryPath, input.name)
  if (exists) throw new Error(`分支 ${input.name} 已存在`)
  await git(repositoryPath, ['switch', '-c', input.name, input.startPoint])
}
```

Add a JSON-only POST route that calls this function and returns `{ branch: input.name }`. Do not push the branch from this endpoint.

- [ ] **Step 4: Add the `+` branch dialog and select the new branch**

The dialog contains a branch-name input, a start-point select populated from `repository.branches`, Cancel, and Create buttons. After success, close the dialog and set `selectedBranch` to the returned branch.

- [ ] **Step 5: Run focused tests, lint, and commit**

Run: `npm.cmd test -- server/gitBranchOperations.test.ts server/repositoryApiPlugin.test.ts src/features/delivery/DeliveryPage.test.tsx --run`

Run: `npm.cmd run lint`

Expected: all selected tests and lint pass.

Commit:

```bash
git add server src
git commit -m "feat: create delivery branches from the workbench"
```

---

### Task 2: Unique Version Tags During GitLab Sync

**Files:**
- Modify: `src/domain/delivery.ts`
- Modify: `src/domain/delivery.test.ts`
- Modify: `server/gitBranchOperations.ts`
- Modify: `server/gitBranchOperations.test.ts`
- Modify: `server/deliveryWorkflow.ts`
- Modify: `server/deliveryWorkflow.test.ts`
- Modify: `src/features/delivery/GitLabSyncDialog.tsx`
- Modify: `src/features/delivery/DeliveryPage.tsx`
- Modify: `src/features/delivery/DeliveryPage.test.tsx`

**Interfaces:**
- Extends: `GitLabSyncDraft` with `tag?: { name: string; message: string }`
- Produces: `assertTagAvailable(repositoryPath, name): Promise<void>`
- Produces: `createAndPushTag(repositoryPath, tag, commit): Promise<void>`
- Extends: `GitLabSyncResult` with `tag?: string`

- [ ] **Step 1: Write failing validation and workflow-order tests**

```ts
expect(validateGitLabSyncDraft({
  ...syncDraft,
  tag: { name: 'T2-v1', message: '' },
})).toContain('请填写 Tag 说明')

expect(order).toEqual([
  'tag-check',
  'checkout',
  'charge',
  'commit',
  'push',
  'tag-create',
  'tag-push',
])
```

Add cases for no Tag, duplicate local Tag, duplicate remote Tag, and Tag push retry without another Commit.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm.cmd test -- src/domain/delivery.test.ts server/gitBranchOperations.test.ts server/deliveryWorkflow.test.ts --run`

Expected: FAIL because tag fields and operations do not exist.

- [ ] **Step 3: Implement Tag uniqueness and annotated Tag push**

```ts
export async function assertTagAvailable(
  repositoryPath: string,
  name: string,
) {
  await git(repositoryPath, ['check-ref-format', `refs/tags/${name}`])
  if (await localTagExists(repositoryPath, name)) {
    throw new Error(`版本 Tag ${name} 已存在`)
  }
  if (await remoteTagExists(repositoryPath, name)) {
    throw new Error(`远端版本 Tag ${name} 已存在`)
  }
}

export async function createAndPushTag(
  repositoryPath: string,
  tag: { name: string; message: string },
  commit: string,
) {
  await git(repositoryPath, ['tag', '-a', tag.name, commit, '-m', tag.message])
  await git(repositoryPath, ['push', 'origin', `refs/tags/${tag.name}`])
}
```

Call `assertTagAvailable` before checkout/Commit. After the branch push succeeds, create and push the Tag against the returned commit SHA.

- [ ] **Step 4: Add optional Tag controls to the sync dialog**

Use a checkbox labeled `保存为版本 Tag`. When checked, show:

- Stage select: `T0`, `T1`, `T2`, `自定义`
- Version input, default `v1`
- Final-version toggle; final generates `T2`, otherwise `T2-v1`
- Tag description input
- Read-only generated Tag preview

Never auto-select Tag creation.

- [ ] **Step 5: Run focused tests, lint, and commit**

Run: `npm.cmd test -- src/domain/delivery.test.ts server/gitBranchOperations.test.ts server/deliveryWorkflow.test.ts src/features/delivery/DeliveryPage.test.tsx --run`

Run: `npm.cmd run lint`

Expected: all selected tests and lint pass.

Commit:

```bash
git add server src
git commit -m "feat: add unique version tags to GitLab sync"
```

---

### Task 3: GitLab Markdown Uploads and MR Composition

**Files:**
- Modify: `src/domain/delivery.ts`
- Modify: `src/domain/delivery.test.ts`
- Modify: `server/gitlabClient.ts`
- Modify: `server/gitlabClient.test.ts`
- Modify: `server/deliveryWorkflow.ts`
- Modify: `server/deliveryWorkflow.test.ts`
- Modify: `server/repositoryApiPlugin.ts`
- Modify: `server/repositoryApiPlugin.test.ts`

**Interfaces:**
- Extends: `MergeRequestDraft` with `feishuLinks: string[]` and `attachmentMarkdown: string[]`
- Produces: `GitLabClient.uploadMarkdownFile(projectPath, attachment): Promise<{ markdown: string }>`
- Produces: `composeMergeRequestDescription(draft, uploadedMarkdown): string`
- Route: `POST /api/gitlab/uploads` accepts one multipart `file`

- [ ] **Step 1: Write failing Markdown and upload tests**

```ts
expect(composeMergeRequestDescription({
  ...draft,
  description: '## 改动说明\n更新结构图纸',
  feishuLinks: ['https://tinyphoton.feishu.cn/docx/example'],
  attachments: [],
}, ['[评审资料.pdf](/uploads/example/评审资料.pdf)'])).toContain(
  '## 相关资料',
)
```

Mock `POST /projects/:id/uploads` and assert multipart form data contains the selected PDF. Add failure coverage proving `createMergeRequest` is not called when any upload fails.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm.cmd test -- src/domain/delivery.test.ts server/gitlabClient.test.ts server/deliveryWorkflow.test.ts server/repositoryApiPlugin.test.ts --run`

Expected: FAIL because upload and composition APIs do not exist.

- [ ] **Step 3: Implement upload and description composition**

Use GitLab `POST /projects/:id/uploads` with `FormData`. Accept only `.pdf`, `.png`, `.jpg`, `.jpeg`, and `.webp`; enforce a configurable maximum matching the server response when available. Compose:

```md
## 改动说明
<user Markdown>

## 飞书文档
- <Feishu URL>

## 附件
- <GitLab upload Markdown>
```

The client calls `/api/gitlab/uploads` for every queued attachment only after final confirmation. It creates the MR only when every upload succeeds, passing the returned Markdown strings in `attachmentMarkdown`.

- [ ] **Step 4: Run focused tests and commit**

Run: `npm.cmd test -- src/domain/delivery.test.ts server/gitlabClient.test.ts server/deliveryWorkflow.test.ts server/repositoryApiPlugin.test.ts --run`

Expected: all selected tests pass.

Commit:

```bash
git add server src/domain
git commit -m "feat: upload GitLab MR attachments"
```

---

### Task 4: MR Markdown Editor, Links, and Attachment Queue

**Files:**
- Create: `src/features/delivery/MergeRequestEditor.tsx`
- Create: `src/features/delivery/MergeRequestEditor.test.tsx`
- Create: `src/features/delivery/MarkdownPreview.tsx`
- Modify: `src/features/delivery/DeliveryPage.tsx`
- Modify: `src/features/delivery/DeliveryPage.test.tsx`
- Modify: `src/features/delivery/delivery.css`
- Modify: `src/data/deliveryClient.ts`

**Interfaces:**
- Consumes: extended `MergeRequestDraft`
- Produces: editor values `{ title, description, feishuLinks, attachments }`
- Produces: `DeliveryApi.uploadAttachment(file: File): Promise<{ markdown: string }>`

- [ ] **Step 1: Write failing editor interaction tests**

Test independent title/description, toolbar insertion, preview toggle, valid/invalid Feishu links, PDF/image queue removal, and disabled submit while title/reviewer/source branch is missing.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm.cmd test -- src/features/delivery/MergeRequestEditor.test.tsx src/features/delivery/DeliveryPage.test.tsx --run`

Expected: FAIL because the editor does not exist.

- [ ] **Step 3: Implement the Markdown editor and safe attachment picker**

Use icon buttons with tooltips for heading, bold, bullet list, quote, and link. Keep editor and preview as tabs. Install exact dependency `react-markdown@10.1.0`; do not enable `rehype-raw`, so raw HTML is not rendered. Record the exact version in `package.json` and `package-lock.json`.

Use `<input type="file" multiple accept=".pdf,image/png,image/jpeg,image/webp">` in both browser development and Electron. Keep selected `File` objects only in renderer memory, show `{ name, size, type }`, and upload them with `FormData` only after final MR confirmation.

- [ ] **Step 4: Integrate the editor into step 2**

Replace the implicit sync-comment MR title with the editor values. Show attachment upload status beside each file. Label the final button `提交发布审核`, and show a final summary before calling `/api/gitlab/merge-requests`.

- [ ] **Step 5: Run tests, lint, production build, and visual checks**

Run: `npm.cmd test -- --run`

Run: `npm.cmd run lint`

Run: `npm.cmd run build:desktop`

Inspect `/workspace` at `1440x900` and `390x844`. Expected: no horizontal overflow; branch-create dialog, Tag fields, Markdown tabs, link rows, attachment queue, reviewer list, and submit button remain readable without overlap.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src
git commit -m "feat: compose rich GitLab merge requests"
```

---

### Task 5: End-to-End Simulation and Documentation

**Files:**
- Create: `server/deliveryReleaseFlow.test.ts`
- Modify: `docs/superpowers/specs/2026-07-25-simple-delivery-workbench-design.md`
- Modify: `README.md`

**Interfaces:**
- Verifies the complete simulated flow without touching `lens-mechanics`.

- [ ] **Step 1: Add a temporary-repository integration test**

Create a temporary Git repository and bare `origin`. Simulate create branch, modify output, generate charge, Commit, push, create `T2-v1`, push Tag, upload fake PDF through a mocked GitLab client, and create MR. Assert branch and Tag exist in the bare remote and the MR description contains the Feishu and PDF links.

- [ ] **Step 2: Run the integration test and full verification**

Run: `npm.cmd test -- server/deliveryReleaseFlow.test.ts --run`

Run: `npm.cmd test -- --run`

Run: `npm.cmd run lint`

Run: `npm.cmd run build:desktop`

Expected: all tests, lint, web build, and Electron TypeScript build pass.

- [ ] **Step 3: Document the user-facing flow**

Document:

1. Reuse or create a branch.
2. Select output packages.
3. Enter sync comment and optionally create a unique version Tag.
4. Sync branch and Tag.
5. Write MR Markdown, add Feishu links/PDFs, and select reviewer.
6. Submit MR; administrator merge completes Ironforge publication.

- [ ] **Step 4: Commit**

```bash
git add README.md docs server/deliveryReleaseFlow.test.ts
git commit -m "test: verify tagged Ironforge delivery flow"
```
