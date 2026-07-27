import { render, screen } from '@testing-library/react'
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
})
