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
      syncLabel: '有 1 个本地版本待上传',
      syncTone: 'warning',
    })
  })

  it('warns when local and remote branches diverge', () => {
    expect(summarizeRepository({ ahead: 2, behind: 1 })).toEqual({
      syncLabel: '电脑和公司服务器都有新修改，需要同事协助处理',
      syncTone: 'danger',
    })
  })
})
