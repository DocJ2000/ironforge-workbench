import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { WorkspacePage } from './WorkspacePage'

describe('WorkspacePage', () => {
  it('shows deleted design files without requiring a second confirmation', () => {
    render(<WorkspacePage repository={getDemoRepository()} />)

    expect(screen.getByText(/个已删除的设计文件/)).toBeVisible()
    expect(screen.queryByText(/尚未确认|逐项确认/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '确认全部删除' })).not.toBeInTheDocument()
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
    fireEvent.change(view.getByPlaceholderText(/调整示例零件结构/), {
      target: { value: '更新配置' },
    })
    fireEvent.click(view.getByRole('button', { name: '保存设计版本' }))

    await waitFor(() => expect(preview).toHaveBeenCalled())
    expect(view.getByRole('dialog', { name: '确认保存本次修改' })).toBeVisible()
    expect(commit).not.toHaveBeenCalled()

    fireEvent.click(view.getByRole('button', { name: '确认保存' }))

    await waitFor(() => expect(commit).toHaveBeenCalled())
    expect(await screen.findByText('已保存为 abc1234')).toBeVisible()
    expect(refresh).toHaveBeenCalled()
  })
})
