# Local Repository Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hard-coded engineer-workbench snapshot with a safe, read-only view of the real `lens-mechanics` Git repository.

**Architecture:** A Vite server plugin exposes one loopback-only `GET /api/repository` endpoint. A focused Node scanner invokes Git with `execFile`, reads `charge.json` and `output` with structured filesystem APIs, and returns the existing `RepositorySnapshot` contract. The React application loads this snapshot through a provider and retains demo data only as an explicit offline fallback.

**Tech Stack:** React 19, TypeScript 6, Vite 8 server plugins, Node.js `fs/promises` and `child_process`, Vitest, Testing Library, Playwright.

## Global Constraints

- The integration is read-only: no Commit, Push, checkout, branch creation, deletion, or remote mutation.
- Git commands use `execFile` argument arrays and never interpolate repository content into a shell command.
- The repository root comes from `IRONFORGE_REPOSITORY_PATH`, with the current Dragon repository as the local development default.
- Existing page components continue consuming `RepositorySnapshot`.
- Network failure keeps the application usable and visibly labels data as demonstration data.

---

### Task 1: Real Repository Scanner

**Files:**
- Create: `server/repositoryScanner.ts`
- Create: `server/repositoryScanner.test.ts`
- Modify: `src/domain/repository.ts`

**Interfaces:**
- Consumes: an absolute repository path.
- Produces: `scanRepository(repositoryPath: string): Promise<RepositorySnapshot>`.

- [ ] **Step 1: Write failing scanner tests**

Create a temporary Git repository with a tracked modified file, an untracked output package, and a valid `charge.json`. Assert that the scanner returns the branch, latest commit, working-tree changes, upstream counts, and delivery package contents.

- [ ] **Step 2: Run the scanner test and verify RED**

Run: `npm.cmd test -- server/repositoryScanner.test.ts --run`

Expected: FAIL because `scanRepository` does not exist.

- [ ] **Step 3: Implement the scanner**

Use `execFile('git', ['-C', repositoryPath, ...args])`, porcelain status output, `for-each-ref`, `rev-parse`, `log`, and Node filesystem APIs. Normalize repository paths to forward slashes and map extensions to the existing CAD/file-type labels.

- [ ] **Step 4: Run scanner tests and verify GREEN**

Run: `npm.cmd test -- server/repositoryScanner.test.ts --run`

Expected: PASS with real temporary-repository behavior.

- [ ] **Step 5: Commit**

Commit message: `feat: scan local hardware repository`

### Task 2: Loopback Repository API

**Files:**
- Create: `server/repositoryApiPlugin.ts`
- Create: `server/repositoryApiPlugin.test.ts`
- Modify: `vite.config.ts`

**Interfaces:**
- Consumes: `scanRepository(repositoryPath)`.
- Produces: Vite middleware for `GET /api/repository` returning `{ repository, source: "live" }` or a structured error.

- [ ] **Step 1: Write failing middleware tests**

Invoke the middleware with minimal request/response doubles and assert JSON success, method rejection, and scanner error responses.

- [ ] **Step 2: Run API tests and verify RED**

Run: `npm.cmd test -- server/repositoryApiPlugin.test.ts --run`

Expected: FAIL because the plugin factory does not exist.

- [ ] **Step 3: Implement and register the plugin**

Register identical middleware for Vite development and preview servers. Bind it only through the existing local Vite server and return `Cache-Control: no-store`.

- [ ] **Step 4: Run API tests and verify GREEN**

Run: `npm.cmd test -- server/repositoryApiPlugin.test.ts --run`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: expose local repository snapshot`

### Task 3: Live Snapshot Provider and Refresh

**Files:**
- Create: `src/data/repositoryClient.ts`
- Create: `src/data/repositoryClient.test.ts`
- Create: `src/data/RepositoryProvider.tsx`
- Create: `src/data/RepositoryProvider.test.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/routes.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/features/overview/OverviewPage.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `GET /api/repository`.
- Produces: `useRepository()` with `repository`, `source`, `loading`, `error`, and `refresh()`.

- [ ] **Step 1: Write failing client and provider tests**

Assert successful snapshot loading, refresh replacement, and demo fallback with an offline warning.

- [ ] **Step 2: Run frontend tests and verify RED**

Run: `npm.cmd test -- src/data --run`

Expected: FAIL because the client/provider do not exist.

- [ ] **Step 3: Implement client and provider**

Load once on application startup, preserve the last good snapshot during refresh, and fall back to `getDemoRepository()` only when no live snapshot has succeeded.

- [ ] **Step 4: Wire routes and refresh controls**

Use provider data for all five pages. Connect “刷新状态” to `refresh()`, disable it during loading, and show a compact live/demo source indicator in the application shell.

- [ ] **Step 5: Run frontend tests and verify GREEN**

Run: `npm.cmd test -- src/data src/app src/features --run`

Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: display live repository status`

### Task 4: End-to-End Verification

**Files:**
- Modify: `tests/e2e/workbench.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: the live local API and current hardware repository.
- Produces: verified desktop/mobile live-state behavior and setup documentation.

- [ ] **Step 1: Add failing live-source browser assertion**

Assert that the overview reports live local data and that refresh completes without horizontal overflow.

- [ ] **Step 2: Run Playwright and verify RED**

Run: `npm.cmd run test:e2e`

Expected: FAIL until the source indicator and refresh behavior are wired.

- [ ] **Step 3: Document local startup and repository override**

Document `npm.cmd run dev`, the default Dragon path, and `IRONFORGE_REPOSITORY_PATH`.

- [ ] **Step 4: Run all verification**

Run:

```powershell
npm.cmd test -- --run
npm.cmd run build
npm.cmd run lint
npm.cmd run test:e2e
```

Expected: all commands pass.

- [ ] **Step 5: Commit**

Commit message: `test: verify live repository integration`
