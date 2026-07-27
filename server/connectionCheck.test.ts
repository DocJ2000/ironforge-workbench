import { describe, expect, it, vi } from 'vitest'
import { checkConnection } from './connectionCheck'

const credentials = {
  baseUrl: 'https://gitlfs.lab.tp',
  token: 'secret',
  sshKeyPath: 'C:\\keys\\id_ed25519',
}

describe('checkConnection', () => {
  it('runs all three read-only checks in order', async () => {
    const result = await checkConnection('C:\\project', credentials, {
      probeServer: vi.fn().mockResolvedValue(undefined),
      probeApi: vi.fn().mockResolvedValue({ username: 'jiangcheng' }),
      probeSsh: vi.fn().mockResolvedValue(undefined),
    })

    expect(result.connected).toBe(true)
    expect(result.username).toBe('jiangcheng')
    expect(result.checks.map((item) => item.status)).toEqual([
      'passed',
      'passed',
      'passed',
    ])
  })

  it('skips the identity check when the access code is invalid', async () => {
    const probeSsh = vi.fn()
    const result = await checkConnection('C:\\project', credentials, {
      probeServer: vi.fn().mockResolvedValue(undefined),
      probeApi: vi.fn().mockRejectedValue(new Error('401 Unauthorized')),
      probeSsh,
    })

    expect(result.connected).toBe(false)
    expect(result.checks.map((item) => item.status)).toEqual([
      'passed',
      'failed',
      'skipped',
    ])
    expect(result.checks[1].error?.code).toBe('access_code_invalid')
    expect(probeSsh).not.toHaveBeenCalled()
  })
})
