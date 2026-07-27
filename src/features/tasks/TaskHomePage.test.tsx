import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { TaskHomePage } from './TaskHomePage'
import { MemoryRouter, useLocation } from 'react-router-dom'

function Location() {
  return <span data-testid="location">{useLocation().pathname}</span>
}

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
    expect(screen.queryByRole('button', { name: '上传项目' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Aurora Lens Mechanics/ }))
    expect(onSelect).toHaveBeenCalledWith('aurora')
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/project')
  })

})
