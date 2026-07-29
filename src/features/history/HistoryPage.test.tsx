import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { HistoryPage } from './HistoryPage'

describe('HistoryPage', () => {
  it('links saved work, approval, and publication records', () => {
    render(<MemoryRouter><HistoryPage repository={getDemoRepository()} /></MemoryRouter>)

    expect(screen.getAllByText('审核单 #1')[0]).toBeVisible()
    expect(screen.getByText('尚未开始发布')).toBeVisible()
    expect(screen.getByText('专业显示')).toBeVisible()
  })

  it('uses the selected project without showing another project picker', () => {
    render(<MemoryRouter><HistoryPage repository={getDemoRepository()} /></MemoryRouter>)
    expect(screen.queryByLabelText('查看哪个项目的记录')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回项目操作' })).toHaveAttribute('href', '/workspace/project')
  })

  it('shows which cloud branch contains a commit', () => {
    const repository = {
      ...getDemoRepository(),
      history: [{
        ...getDemoRepository().history[0],
        branches: ['dev/T2'],
      }],
    }
    render(<MemoryRouter><HistoryPage repository={repository} /></MemoryRouter>)
    expect(screen.getByTestId(`history-branches-${repository.history[0].id}`)).toHaveTextContent('dev/T2')
  })

  it('searches history by branch and hides unrelated records', () => {
    const sample = getDemoRepository().history[0]
    const repository = {
      ...getDemoRepository(),
      history: [
        { ...sample, id: 't2-change', title: '更新 T2 图纸', branches: ['dev/T2'] },
        { ...sample, id: 't1-change', title: '更新 T1 图纸', branches: ['dev/T1'] },
      ],
    }
    render(<MemoryRouter><HistoryPage repository={repository} /></MemoryRouter>)

    fireEvent.change(screen.getByLabelText('搜索历史'), { target: { value: 'dev/T2' } })

    expect(screen.getByText('更新 T2 图纸')).toBeVisible()
    expect(screen.queryByText('更新 T1 图纸')).not.toBeInTheDocument()
  })
})
