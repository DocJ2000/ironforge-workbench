import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5199'
const outDir = fileURLToPath(new URL('../artifacts/ui-review/', import.meta.url))
await mkdir(outDir, { recursive: true })

const pages = [
  ['workspace', '/workspace'],
  ['project-actions', '/workspace/project'],
  ['upload-wizard', '/workspace/upload/gitlab'],
  ['history', '/history'],
  ['account', '/account'],
  ['ironforge', '/ironforge'],
]

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const pageErrors = []
// The preview runs without GitLab credentials, so GitLab-backed endpoints are
// expected to answer 400 here. Anything else is a regression worth failing on.
const gitLabDependent = /\/api\/gitlab\/(history|branches|merge-request-status|pull)/
const httpIssues = []

page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
    pageErrors.push(message.text())
  }
})
page.on('pageerror', (error) => pageErrors.push(error.message))
page.on('response', (response) => {
  const status = response.status()
  if (status < 400) return
  const url = response.url()
  if (status === 400 && gitLabDependent.test(url)) return
  httpIssues.push(`${status} ${url}`)
})

async function shot(name) {
  await page.waitForTimeout(500)
  await page.screenshot({ path: join(outDir, `${name}.png`) })
  console.log(`captured ${name}`)
}

for (const [name, path] of pages) {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
  await shot(name)
}

await page.goto(`${base}/workspace`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: '找到本机已有项目' }).click()
await shot('workspace-add-project')

await page.goto(`${base}/workspace/upload/gitlab`, { waitUntil: 'networkidle' })
for (let index = 0; index < 4; index += 1) {
  await page.getByRole('button', { name: '下一步' }).click()
}
await shot('upload-step5')

await browser.close()

if (pageErrors.length) console.error(`页面脚本错误:\n- ${pageErrors.join('\n- ')}`)
if (httpIssues.length) console.error(`异常请求:\n- ${httpIssues.join('\n- ')}`)
if (pageErrors.length || httpIssues.length) process.exitCode = 1
