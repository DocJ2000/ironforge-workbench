// @vitest-environment node

import { expect, it, vi } from 'vitest'
import { probeCompanyNetwork } from './networkProbe'

it('checks reachability without requiring the company TLS certificate', async () => {
  const lookup = vi.fn().mockResolvedValue({ address: '10.0.0.8', family: 4 })
  const connect = vi.fn().mockResolvedValue(undefined)

  await probeCompanyNetwork('https://git.example.com', { lookup, connect })

  expect(lookup).toHaveBeenCalledWith('git.example.com')
  expect(connect).toHaveBeenCalledWith('10.0.0.8', 443, 5000)
})

it('uses the explicit port in the company address', async () => {
  const lookup = vi.fn().mockResolvedValue({ address: '10.0.0.8', family: 4 })
  const connect = vi.fn().mockResolvedValue(undefined)

  await probeCompanyNetwork('http://git.example.com:8080', { lookup, connect })

  expect(connect).toHaveBeenCalledWith('10.0.0.8', 8080, 5000)
})
