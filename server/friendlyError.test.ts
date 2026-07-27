import { describe, expect, it } from 'vitest'
import { toFriendlyError } from './friendlyError'

describe('toFriendlyError', () => {
  it('explains an unregistered computer identity', () => {
    expect(toFriendlyError(new Error('Permission denied (publickey)'))).toMatchObject({
      code: 'identity_not_registered',
      filesSafe: true,
      nextAction: '打开“账户与连接”，复制电脑登记码并添加到 GitLab。',
    })
  })

  it('explains an unreachable company network', () => {
    expect(toFriendlyError(new Error('connect ETIMEDOUT'))).toMatchObject({
      code: 'company_network_unreachable',
      filesSafe: true,
    })
  })

  it('redacts and bounds unknown technical details', () => {
    const result = toFriendlyError(
      new Error(`password=secret-value\n${'x'.repeat(400)}`),
    )
    expect(result.code).toBe('unknown_error')
    expect(result.technicalSummary).not.toContain('secret-value')
    expect(result.technicalSummary?.length).toBeLessThanOrEqual(240)
    expect(result.technicalSummary).not.toContain('\n')
  })
})
