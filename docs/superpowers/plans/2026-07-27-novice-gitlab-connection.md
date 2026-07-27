# Novice GitLab Connection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a three-step GitLab connection wizard that can generate a per-project SSH identity and guide a nontechnical engineer through registration and verification.

**Architecture:** Electron main process owns key generation, secret storage, clipboard-safe public-key reads, and connection checks. The renderer receives only redacted status and public-key text through narrow IPC methods. Existing raw credential fields move into a collapsed advanced section beneath the guided flow.

**Tech Stack:** Electron IPC and `safeStorage`, bundled Git for Windows/OpenSSH, React 19, TypeScript, Vitest, Testing Library.

## Global Constraints

- Default UI must not require understanding Git, Token, SSH, private keys, Push, Pull, or MR.
- Private-key contents and saved Token values must never be returned to the renderer.
- Generated keys live under the application user-data directory, never inside a project.
- Existing key files must never be overwritten.
- All remote-changing operations retain explicit confirmation.

---

### Task 1: Secure identity-key service

**Files:**
- Create: `electron/identityKeyService.ts`
- Create: `electron/identityKeyService.test.ts`
- Modify: `electron/main.ts`
- Modify: `electron/preload.cts`
- Modify: `src/types/desktop.d.ts`

**Interfaces:**
- Produces: `IdentityKeyService.status(projectId)`, `generate({ projectId, passphrase })`, and `publicKey(projectId)`.
- Produces renderer IPC methods returning `{ configured, publicKey?, pathHint? }`; no private-key contents.

- [ ] **Step 1: Write failing service tests**

```ts
it('generates an ed25519 identity outside the repository', async () => {
  const result = await service.generate({ projectId: 'project-one' })
  expect(result.publicKey).toMatch(/^ssh-ed25519 /)
  expect(result.pathHint).not.toContain('lens-mechanics')
})

it('does not overwrite an existing identity', async () => {
  await service.generate({ projectId: 'project-one' })
  await expect(service.generate({ projectId: 'project-one' }))
    .rejects.toThrow('已经创建')
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm.cmd test -- --run electron/identityKeyService.test.ts`

Expected: FAIL because `IdentityKeyService` does not exist.

- [ ] **Step 3: Implement the service with injected `ssh-keygen` execution**

```ts
export interface IdentityKeyResult {
  configured: boolean
  publicKey?: string
  pathHint?: string
}

export class IdentityKeyService {
  async generate(input: { projectId: string; passphrase?: string }): Promise<IdentityKeyResult>
  async status(projectId: string): Promise<IdentityKeyResult>
  async publicKey(projectId: string): Promise<string>
}
```

Use a stable hash of `projectId` for the filename, `ssh-keygen -t ed25519 -f <path> -N <passphrase>`, and `wx`-equivalent preflight checks so existing files are never overwritten.

- [ ] **Step 4: Add narrow IPC and preload methods**

Expose:

```ts
identity: {
  status(projectId: string): Promise<IdentityKeyResult>
  generate(input: { projectId: string; passphrase?: string }): Promise<IdentityKeyResult>
  publicKey(projectId: string): Promise<{ publicKey: string }>
}
```

- [ ] **Step 5: Run service tests and desktop build**

Run: `npm.cmd test -- --run electron/identityKeyService.test.ts && npm.cmd run build:desktop`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add electron src/types/desktop.d.ts
git commit -m "feat: generate per-project computer identities"
```

### Task 2: Renderer client and novice connection wizard

**Files:**
- Create: `src/data/identityClient.ts`
- Create: `src/data/identityClient.test.ts`
- Create: `src/features/account/ConnectionWizard.tsx`
- Create: `src/features/account/ConnectionWizard.test.tsx`
- Create: `src/features/account/connectionWizard.css`
- Modify: `src/features/account/AccountPage.tsx`

**Interfaces:**
- Consumes: `window.ironforgeDesktop.identity`.
- Produces: `ConnectionWizard({ projectId, onConfigured })`.

- [ ] **Step 1: Write failing renderer and wizard tests**

```tsx
it('uses plain language and starts with the software access-code step', () => {
  render(<ConnectionWizard projectId="project-one" onConfigured={vi.fn()} />)
  expect(screen.getByText('让软件连接公司 GitLab')).toBeVisible()
  expect(screen.queryByText('SSH 私钥路径')).not.toBeInTheDocument()
})

it('generates a computer identity and reveals public-key actions', async () => {
  fireEvent.click(screen.getByRole('button', { name: '创建这台电脑的身份钥匙' }))
  expect(await screen.findByRole('button', { name: '复制公钥' })).toBeVisible()
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm.cmd test -- --run src/data/identityClient.test.ts src/features/account/ConnectionWizard.test.tsx`

Expected: FAIL because client and wizard do not exist.

- [ ] **Step 3: Implement the client and three-step wizard**

The visible steps are:

```ts
const steps = [
  '让软件连接公司 GitLab',
  '给这台电脑创建身份钥匙',
  '完成连接',
]
```

Use `软件访问码` and `这台电脑的身份钥匙` in primary copy. Keep technical names only inside help disclosures.

- [ ] **Step 4: Replace the default raw form with the wizard**

`AccountPage` renders `ConnectionWizard` first. Existing fields move into an `<details>` element titled `高级设置`.

- [ ] **Step 5: Run focused tests and responsive component tests**

Run: `npm.cmd test -- --run src/features/account/ConnectionWizard.test.tsx src/features/account/AccountPage.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/data src/features/account
git commit -m "feat: add novice GitLab connection wizard"
```

### Task 3: Contextual question help and actionable errors

**Files:**
- Create: `src/features/account/FieldHelp.tsx`
- Create: `src/features/account/FieldHelp.test.tsx`
- Modify: `src/features/account/ConnectionWizard.tsx`
- Modify: `src/features/account/connectionWizard.css`

**Interfaces:**
- Produces: `FieldHelp({ label, children })`, an accessible icon disclosure.

- [ ] **Step 1: Write the failing disclosure test**

```tsx
it('opens and closes detailed help from a question icon', () => {
  render(<FieldHelp label="软件访问码">创建步骤</FieldHelp>)
  const button = screen.getByRole('button', { name: '软件访问码是什么' })
  expect(button).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(button)
  expect(screen.getByText('创建步骤')).toBeVisible()
  fireEvent.click(button)
  expect(screen.queryByText('创建步骤')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm.cmd test -- --run src/features/account/FieldHelp.test.tsx`

Expected: FAIL because `FieldHelp` does not exist.

- [ ] **Step 3: Implement the icon disclosure and field-specific copy**

Use the Lucide `CircleHelp` icon, `aria-expanded`, `aria-controls`, and a low-emphasis inline help panel. Add Token creation steps, `.pub` clarification, and optional passphrase guidance.

- [ ] **Step 4: Translate errors into next actions**

Map known failures to:

```ts
{
  invalidToken: '访问码不可用。请重新创建一个，并确认权限选择了 api。',
  missingPublicKey: '身份钥匙还没有添加到 GitLab。请复制公钥并点击“打开 GitLab 添加”。',
  unreachable: '暂时无法连接公司服务器。请确认已连接公司网络后重试。',
}
```

- [ ] **Step 5: Run focused and account-page tests**

Run: `npm.cmd test -- --run src/features/account`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/account
git commit -m "feat: explain connection fields in context"
```

### Task 4: Packaged verification and installer replacement

**Files:**
- Modify: `package.json` only if the smoke command needs a reusable script.
- Output: `E:\BaiduSyncdisk\Gitlab\Dragon\Ironforge-Workbench-交付版\Ironforge-Workbench-0.1.0-Setup.exe`

**Interfaces:**
- Consumes all prior tasks.
- Produces the tested Windows installer.

- [ ] **Step 1: Run the complete automated suite**

Run:

```powershell
npm.cmd test -- --run
npm.cmd run lint
npm.cmd run build:desktop
```

Expected: all tests pass, lint exits 0, and desktop TypeScript compiles.

- [ ] **Step 2: Build the installer with bundled Git/OpenSSH**

Run:

```powershell
npm.cmd run stage:git
npx.cmd electron-builder --win nsis --config.directories.output="$env:TEMP\ironforge-workbench-novice"
```

Expected: installer and unpacked app are created.

- [ ] **Step 3: Smoke-test without system Git**

Launch the unpacked executable with `PATH=C:\Windows\System32`. Verify:

- `window.ironforgeDesktop.identity` exists.
- the project API returns HTTP 200.
- the wizard displays `让软件连接公司 GitLab`.
- identity generation in a temporary test profile creates a public key and never writes into the repository.

- [ ] **Step 4: Replace the stable installer and record SHA-256**

```powershell
Copy-Item "$env:TEMP\ironforge-workbench-novice\Ironforge-Workbench-0.1.0-Setup.exe" `
  "E:\BaiduSyncdisk\Gitlab\Dragon\Ironforge-Workbench-交付版\Ironforge-Workbench-0.1.0-Setup.exe" -Force
Get-FileHash "E:\BaiduSyncdisk\Gitlab\Dragon\Ironforge-Workbench-交付版\Ironforge-Workbench-0.1.0-Setup.exe"
```

- [ ] **Step 5: Commit any final packaging change**

```powershell
git add package.json
git commit -m "build: package novice connection workflow"
```
