import { describe, expect, it } from 'vitest'
import { summarizeRepository } from './repository'

describe('summarizeRepository', () => {
  it('describes a branch that is ahead of its remote', () => {
    expect(
      summarizeRepository({
        ahead: 1,
        behind: 0,
      }),
    ).toEqual({
      syncLabel: '有 1 个本地版本待推送',
      syncTone: 'warning',
    })
  })

  it('warns when local and remote branches diverge', () => {
    expect(summarizeRepository({ ahead: 2, behind: 1 })).toEqual({
      syncLabel: '本地与远程已分叉，需要人工处理',
      syncTone: 'danger',
    })
  })
})
