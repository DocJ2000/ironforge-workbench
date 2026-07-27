import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { HistoryPage } from './HistoryPage'

describe('HistoryPage', () => {
  it('links saved work, approval, and publication records', () => {
    render(<HistoryPage repository={getDemoRepository()} />)

    expect(screen.getAllByText('审核单 #1')[0]).toBeVisible()
    expect(screen.getByText('尚未开始发布')).toBeVisible()
    expect(screen.getByText('专业显示')).toBeVisible()
  })

  it('selects a project before showing its operation history', () => {
    const repository = getDemoRepository()
    const onSelect = vi.fn()
    render(
      <HistoryPage
        onSelect={onSelect}
        projects={[
          { id: repository.id, repository, connected: true, lastOpened: '刚刚' },
          { id: 'other', repository: { ...repository, id: 'other', displayName: '另一个项目' }, connected: true, lastOpened: '昨天' },
        ]}
        repository={repository}
        selectedId={repository.id}
      />,
    )
    fireEvent.change(screen.getByLabelText('查看哪个项目的记录'), {
      target: { value: 'other' },
    })
    expect(onSelect).toHaveBeenCalledWith('other')
  })
})
