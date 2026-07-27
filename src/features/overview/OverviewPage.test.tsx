import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { OverviewPage } from './OverviewPage'

describe('OverviewPage', () => {
  it('shows business and Git terminology together', () => {
    render(<OverviewPage repository={getDemoRepository()} />)

    expect(screen.getAllByText('保存设计版本')[0]).toBeVisible()
    expect(screen.getAllByText('保存修改')[0]).toBeVisible()
    expect(screen.getAllByText('提交审核')[0]).toBeVisible()
    expect(screen.getAllByText('管理员审核单')[0]).toBeVisible()
  })

  it('uses the real working-tree change count in its recommendation', () => {
    const repository = getDemoRepository()
    const view = render(
      <OverviewPage
        repository={{
          ...repository,
          changes: [...repository.changes, ...repository.changes.slice(0, 2)],
        }}
      />,
    )

    expect(view.getByText(/检查 7 个本地修改/)).toBeVisible()
  })
})
