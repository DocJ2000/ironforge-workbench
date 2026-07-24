import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { WorkspacePage } from './WorkspacePage'

describe('WorkspacePage', () => {
  it('requires explicit selection before a deleted CAD file can be committed', () => {
    render(<WorkspacePage repository={getDemoRepository()} />)

    expect(screen.getByText('删除的 CAD 文件需要逐项确认')).toBeVisible()
    expect(screen.getByRole('button', { name: '保存设计版本' })).toBeDisabled()
  })

  it('previews selected files before executing a local commit', async () => {
    const preview = vi.fn().mockResolvedValue({
      branch: 'dev/T2',
      message: '更新配置',
      paths: ['charge.json'],
      deletedCadPaths: [],
    })
    const commit = vi.fn().mockResolvedValue({
      branch: 'dev/T2',
      commit: 'abc1234',
      paths: ['charge.json'],
    })
    const refresh = vi.fn().mockResolvedValue(undefined)
    const view = render(
      <WorkspacePage
        commitApi={{ preview, commit }}
        onRepositoryRefresh={refresh}
        repository={getDemoRepository()}
      />,
    )

    fireEvent.click(view.getByRole('checkbox', { name: '选择 charge.json' }))
    fireEvent.change(view.getByPlaceholderText(/调整场旋框盖结构/), {
      target: { value: '更新配置' },
    })
    fireEvent.click(view.getByRole('button', { name: '保存设计版本' }))

    await waitFor(() => expect(preview).toHaveBeenCalled())
    expect(view.getByRole('dialog', { name: '确认本地 Commit' })).toBeVisible()
    expect(commit).not.toHaveBeenCalled()

    fireEvent.click(view.getByRole('button', { name: '确认本地 Commit' }))

    await waitFor(() => expect(commit).toHaveBeenCalled())
    expect(await screen.findByText('已保存为 abc1234')).toBeVisible()
    expect(refresh).toHaveBeenCalled()
  })
})
