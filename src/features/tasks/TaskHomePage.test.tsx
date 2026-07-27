import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { TaskHomePage } from './TaskHomePage'
import { MemoryRouter, useLocation } from 'react-router-dom'

function Location() {
  return <span data-testid="location">{useLocation().pathname}</span>
}

describe('TaskHomePage', () => {
  it('centers the two enlarged project actions when there are no projects', () => {
    const { container } = render(
      <MemoryRouter>
        <TaskHomePage
          onAdd={vi.fn()}
          onSelect={vi.fn()}
          projects={[]}
          selectedId=""
        />
      </MemoryRouter>,
    )

    expect(container.querySelector('.project-center--empty')).not.toBeNull()
    expect(container.querySelector('.project-center__empty-actions')).not.toBeNull()
    expect(
      screen.getByRole('button', { name: '找到本机已有项目' }),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: '下载新项目' })).toBeVisible()
  })

  it('shows local projects and changes the current project', () => {
    const dragon = getDemoRepository()
    const aurora = {
      ...dragon,
      id: 'aurora',
      displayName: 'Aurora Lens Mechanics',
      path: 'D:\\Projects\\Aurora',
    }
    const onSelect = vi.fn()
    const { container } = render(
      <MemoryRouter><TaskHomePage
        onAdd={vi.fn()}
        onSelect={onSelect}
        projects={[
          { id: dragon.id, repository: dragon, connected: true, lastOpened: '刚刚' },
          { id: aurora.id, repository: aurora, connected: false, lastOpened: '昨天' },
        ]}
        selectedId={dragon.id}
      /><Location /></MemoryRouter>,
    )
    expect(screen.getByText('选择一个项目')).toBeVisible()
    expect(screen.getByText('Aurora Lens Mechanics')).toBeVisible()
    expect(container.querySelector('.project-center--empty')).toBeNull()
    expect(screen.queryByRole('button', { name: '上传项目' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Aurora Lens Mechanics/ }))
    expect(onSelect).toHaveBeenCalledWith('aurora')
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/project')
  })

})
