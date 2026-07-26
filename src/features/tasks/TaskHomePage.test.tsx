import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { TaskHomePage } from './TaskHomePage'

describe('TaskHomePage', () => {
  it('shows local projects and changes the current project', () => {
    const dragon = getDemoRepository()
    const aurora = {
      ...dragon,
      id: 'aurora',
      displayName: 'Aurora Lens Mechanics',
      path: 'D:\\Projects\\Aurora',
    }
    const onSelect = vi.fn()
    render(
      <TaskHomePage
        onSelect={onSelect}
        projects={[
          { id: dragon.id, repository: dragon, connected: true, lastOpened: '刚刚' },
          { id: aurora.id, repository: aurora, connected: false, lastOpened: '昨天' },
        ]}
        selectedId={dragon.id}
      />,
    )
    expect(screen.getByText('这台电脑上的项目')).toBeVisible()
    expect(screen.getByText('Aurora Lens Mechanics')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '设为当前项目' }))
    expect(onSelect).toHaveBeenCalledWith('aurora')
  })
})
