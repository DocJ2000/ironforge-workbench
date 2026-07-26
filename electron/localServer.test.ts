// @vitest-environment node

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { startLocalServer } from './localServer'

const roots: string[] = []
const servers: Array<{ close: () => Promise<void> }> = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

it('serves the desktop app and preserves client-side routes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ironforge-desktop-'))
  roots.push(root)
  await writeFile(join(root, 'index.html'), '<main>workbench</main>')
  const server = await startLocalServer({
    staticRoot: root,
    middleware: (_request, _response, next) => next(),
  })
  servers.push(server)

  await expect(fetch(`${server.origin}/workspace/upload`).then((response) => response.text()))
    .resolves.toContain('workbench')
})

it('lets API middleware answer before the static fallback', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ironforge-desktop-'))
  roots.push(root)
  await writeFile(join(root, 'index.html'), '<main>workbench</main>')
  const server = await startLocalServer({
    staticRoot: root,
    middleware: (request, response, next) => {
      if (request.url === '/api/health') {
        response.end('healthy')
      } else {
        next()
      }
    },
  })
  servers.push(server)

  await expect(fetch(`${server.origin}/api/health`).then((response) => response.text()))
    .resolves.toBe('healthy')
})
