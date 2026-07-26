# Guided Task Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dense delivery workspace with a plain-language task home and guided workflows for whole-project upload, Ironforge output delivery, and project retrieval.

**Architecture:** Keep the existing repository, Git, GitLab, charge generation, attachment, and MR APIs intact. Add route-level task pages and a shared wizard shell, then adapt existing delivery controls into focused steps. Build package trees in the frontend by combining the recursive package paths with the repository change snapshot, so the server API remains backward compatible.

**Tech Stack:** React 19, React Router 7, TypeScript 6, Lucide React, Vitest, Testing Library, Vite, Electron.

## Global Constraints

- Do not write to the real mechanical repository during development or verification.
- “上传整个工程” commits and pushes all valid changes; it does not create a Tag or MR.
- “提交图纸到铁炉堡” selects output parent packages, generates charge, optionally creates a unique free-form Tag, and creates an MR with reviewers.
- Use the labels “本次更新标题”, “本次交付标签”, “本次交付标题”, and “交付补充说明（可选）”.
- Package children are read-only; the parent package is the selection unit.
- Show folder hierarchy and mark files as “新增”, “已修改”, or “已删除”.
- Keep the app usable at 390x844 and 1440x900.

---

### Task 1: Task Home And Wizard Shell

**Files:**
- Create: `src/features/tasks/TaskHomePage.tsx`
- Create: `src/features/tasks/GuidedWorkflow.tsx`
- Create: `src/features/tasks/tasks.css`
- Create: `src/features/tasks/TaskHomePage.test.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/components/AppShell.tsx`

**Interfaces:**
- Produces: `GuidedWorkflow({ title, steps, currentStep, children, onBack, onHome, onNext, nextDisabled, nextLabel })`
- Produces routes `/workspace`, `/workspace/project-upload`, `/workspace/ironforge-delivery`, and `/workspace/retrieve`.

- [ ] **Step 1: Write failing routing and task-card tests**

Verify the home renders three named task links and each link targets its dedicated route.

- [ ] **Step 2: Run the focused test**

Run: `npm.cmd test -- --run src/features/tasks/TaskHomePage.test.tsx`
Expected: FAIL because the task home does not exist.

- [ ] **Step 3: Implement task home, shared wizard, routes, and navigation**

Use `NavLink` task rows with `UploadCloud`, `PackageCheck`, and `Download` icons. Keep the shell navigation limited to “开始” and “历史记录”.

- [ ] **Step 4: Re-run focused tests**

Run: `npm.cmd test -- --run src/features/tasks/TaskHomePage.test.tsx src/app/App.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/features/tasks src/app/routes.tsx src/components/AppShell.tsx && git commit -m "feat: add guided task home"`

### Task 2: Whole-Project Upload Wizard

**Files:**
- Create: `src/features/tasks/ProjectUploadPage.tsx`
- Create: `src/features/tasks/ProjectUploadPage.test.tsx`
- Modify: `src/app/routes.tsx`

**Interfaces:**
- Consumes: `DeliveryApi.createBranch` and `DeliveryApi.syncGitLab`.
- Produces: a four-step flow for branch selection, change review, update title, and confirmation.

- [ ] **Step 1: Write failing workflow tests**

Verify step navigation, branch selection, required update title, and `syncGitLab` execution without `tag`.

- [ ] **Step 2: Run the focused test**

Run: `npm.cmd test -- --run src/features/tasks/ProjectUploadPage.test.tsx`
Expected: FAIL because the page does not exist.

- [ ] **Step 3: Implement the focused upload flow**

Reuse `ChangeSummary` and `CreateBranchDialog`. Send every `repository.changes[].path`, an empty package selection, and the chosen branch to `syncGitLab`.

- [ ] **Step 4: Re-run focused tests**

Run: `npm.cmd test -- --run src/features/tasks/ProjectUploadPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/features/tasks/ProjectUploadPage* src/app/routes.tsx && git commit -m "feat: guide whole-project uploads"`

### Task 3: Hierarchical Output Package Tree

**Files:**
- Create: `src/features/delivery/packageTree.ts`
- Create: `src/features/delivery/packageTree.test.ts`
- Create: `src/features/delivery/PackageTree.tsx`
- Create: `src/features/delivery/PackageTree.test.tsx`
- Modify: `src/domain/delivery.ts`
- Modify: `src/features/delivery/delivery.css`

**Interfaces:**
- Produces: `buildPackageTree(packageCandidate, changes): PackageTreeNode`.
- Produces: `PackageTree({ package, changes, selected, onToggle })`.
- `PackageTreeNode` contains `name`, `path`, `kind`, `status`, `counts`, and `children`.

- [ ] **Step 1: Write failing tree-model tests**

Use nested STEP/PDF paths plus added, modified, and deleted repository changes. Assert nested folders, aggregate counts, and changed-path expansion flags.

- [ ] **Step 2: Run tree-model tests**

Run: `npm.cmd test -- --run src/features/delivery/packageTree.test.ts`
Expected: FAIL because the tree builder does not exist.

- [ ] **Step 3: Implement the tree model**

Normalize separators, insert directory nodes, merge deleted paths that are absent from the package scan, and aggregate status counts upward.

- [ ] **Step 4: Write and run failing component tests**

Verify parent-only checkbox behavior, nested expand/collapse, visible status labels, and changed folders expanded by default.

- [ ] **Step 5: Implement and style the tree component**

Use semantic buttons and nested lists. Keep file rows read-only and use green, amber, and red status badges.

- [ ] **Step 6: Re-run focused tests**

Run: `npm.cmd test -- --run src/features/delivery/packageTree.test.ts src/features/delivery/PackageTree.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

Run: `git add src/domain/delivery.ts src/features/delivery/packageTree* src/features/delivery/PackageTree* src/features/delivery/delivery.css && git commit -m "feat: show output packages as change trees"`

### Task 4: Ironforge Delivery Wizard

**Files:**
- Create: `src/features/tasks/IronforgeDeliveryPage.tsx`
- Create: `src/features/tasks/IronforgeDeliveryPage.test.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/features/delivery/delivery.css`

**Interfaces:**
- Consumes: `DeliveryApi.overview`, `syncGitLab`, `uploadAttachment`, and `createMergeRequest`.
- Consumes: `PackageTree`, `MergeRequestEditor`, `ReviewerSelector`, and `CreateBranchDialog`.
- Produces: a guided package, update, sync, MR-content, reviewer, and submit flow.

- [ ] **Step 1: Write failing delivery-flow tests**

Verify package selection, required update title, optional free-form tag whose annotation reuses the update title, MR title and reviewer requirements, and MR creation after sync.

- [ ] **Step 2: Run the focused test**

Run: `npm.cmd test -- --run src/features/tasks/IronforgeDeliveryPage.test.tsx`
Expected: FAIL because the page does not exist.

- [ ] **Step 3: Implement unsynced engineering-file guard**

Classify changes outside `output/` and generated `charge.json` as whole-project changes. Show a blocking notice with a link to `/workspace/project-upload`.

- [ ] **Step 4: Implement the guided delivery flow**

Keep one current step visible. Sync selected packages and output change paths, then create the MR with uploaded attachments, Feishu links, and selected reviewers.

- [ ] **Step 5: Re-run focused tests**

Run: `npm.cmd test -- --run src/features/tasks/IronforgeDeliveryPage.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

Run: `git add src/features/tasks/IronforgeDeliveryPage* src/app/routes.tsx src/features/delivery/delivery.css && git commit -m "feat: guide Ironforge deliveries"`

### Task 5: Retrieval Entry And Final Verification

**Files:**
- Create: `src/features/tasks/RetrievePage.tsx`
- Create: `src/features/tasks/RetrievePage.test.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/features/tasks/tasks.css`
- Modify: `docs/superpowers/specs/2026-07-26-guided-task-workflows-design.md`

**Interfaces:**
- Produces three explicit paths: “把云端项目下载到这台电脑”, “获取同事刚上传的改动”, and “下载铁炉堡已发布图纸”.

- [ ] **Step 1: Write failing retrieval-entry tests**

Assert all three actions are visible and selectable, with project/path selection presented before execution.

- [ ] **Step 2: Implement the retrieval entry**

Provide the three choices as focused task rows and a next screen describing the selected source and destination fields. Do not execute real clone, pull, or Ironforge downloads in phase one.

- [ ] **Step 3: Run all automated verification**

Run: `npm.cmd test -- --run`
Expected: all tests pass.

Run: `npm.cmd run lint`
Expected: exit code 0.

Run: `npm.cmd run build:desktop`
Expected: exit code 0.

- [ ] **Step 4: Perform visual verification**

Open `/workspace`, both guided workflows, and package trees at 1440x900 and 390x844. Confirm no overlap, clipped labels, blank areas, or horizontal overflow.

- [ ] **Step 5: Commit**

Run: `git add src/features/tasks/RetrievePage* src/features/tasks/tasks.css src/app/routes.tsx docs/superpowers/specs/2026-07-26-guided-task-workflows-design.md && git commit -m "feat: add project retrieval entry"`
