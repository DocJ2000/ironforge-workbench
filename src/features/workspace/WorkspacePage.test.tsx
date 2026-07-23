import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { WorkspacePage } from './WorkspacePage'

describe('WorkspacePage', () => {
  it('requires explicit selection before a deleted CAD file can be committed', () => {
    render(<WorkspacePage repository={getDemoRepository()} />)

    expect(screen.getByText('删除的 CAD 文件需要逐项确认')).toBeVisible()
    expect(screen.getByRole('button', { name: '保存设计版本' })).toBeDisabled()
  })
})
