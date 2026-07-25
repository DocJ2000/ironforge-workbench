import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import type { DeliveryApi } from '../../data/deliveryClient'
import { DeliveryPage } from './DeliveryPage'

function createApi(): DeliveryApi {
  return {
    overview: vi.fn().mockResolvedValue({
      packages: [
        {
          id: 'output/mechanical/五金件',
          name: '五金件',
          path: 'output/mechanical/五金件',
          domain: 'mechanical',
          files: [
            {
              name: '导轴.pdf',
              path: 'output/mechanical/五金件/导轴.pdf',
              type: 'PDF',
              size: '1 MB',
            },
          ],
        },
      ],
      reviewers: [
        {
          id: 42,
          name: '胡庆磊',
          username: 'huqinglei',
          role: 'Maintainer',
          recommended: true,
        },
      ],
    }),
    preview: vi.fn().mockResolvedValue({
      branch: 'dev/T2',
      draft: {},
      chargeChanged: true,
      chargeBefore: [],
      chargeAfter: [],
      selectedPackages: [],
    }),
    execute: vi.fn().mockResolvedValue({
      commit: 'abc1234',
      branch: 'dev/T2',
      mergeRequestIid: 3,
      mergeRequestUrl: 'https://gitlfs.lab.tp/mr/3',
    }),
    syncGitLab: vi.fn().mockResolvedValue({
      commit: 'abc1234',
      branch: 'dev/T2',
    }),
    createMergeRequest: vi.fn().mockResolvedValue({
      iid: 3,
      webUrl: 'https://gitlfs.lab.tp/mr/3',
    }),
    createBranch: vi.fn().mockImplementation(async ({ name }) => ({
      branch: name,
    })),
    uploadAttachment: vi.fn().mockResolvedValue({
      markdown: '[资料.pdf](/uploads/example/资料.pdf)',
    }),
  } as unknown as DeliveryApi
}

describe('DeliveryPage', () => {
  it('opens read-only changes and does not require a reviewer to sync', async () => {
    const repository = getDemoRepository()
    render(<DeliveryPage api={createApi()} repository={repository} />)

    fireEvent.click(
      screen.getByRole('button', {
        name: `${repository.changes.length} 个文件`,
      }),
    )
    expect(
      screen.getByRole('dialog', { name: '本次同步文件' }),
    ).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '关闭文件清单' }))

    expect(
      screen.getByRole('button', { name: '同步到 GitLab' }),
    ).toBeEnabled()
  })

  it('requires a sync comment before executing', async () => {
    const api = createApi()
    render(<DeliveryPage api={api} repository={getDemoRepository()} />)

    fireEvent.click(screen.getByRole('button', { name: '同步到 GitLab' }))

    const dialog = screen.getByRole('dialog', { name: '确认同步到 GitLab' })
    expect(dialog).toBeVisible()
    const confirm = screen.getByRole('button', {
      name: '确认同步到 GitLab',
    })
    expect(confirm).toBeDisabled()

    fireEvent.change(screen.getByLabelText('同步注释'), {
      target: { value: '提交所有的BOM交付包' },
    })
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)

    await waitFor(() => expect(api.syncGitLab).toHaveBeenCalledOnce())
    expect(api.syncGitLab).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '提交所有的BOM交付包',
        branch: 'dev/T2',
      }),
    )
  })

  it('optionally creates a generated version Tag during synchronization', async () => {
    const api = createApi()
    render(<DeliveryPage api={api} repository={getDemoRepository()} />)

    fireEvent.click(screen.getByRole('button', { name: '同步到 GitLab' }))
    fireEvent.change(screen.getByLabelText('同步注释'), {
      target: { value: '同步 T2 图纸' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: '保存为版本 Tag' }))
    fireEvent.change(screen.getByLabelText('Tag 版本'), {
      target: { value: 'v3' },
    })
    fireEvent.change(screen.getByLabelText('Tag 说明'), {
      target: { value: 'Dragon T2 第三版存档' },
    })
    expect(screen.getByText('T2-v3')).toBeVisible()
    fireEvent.click(
      screen.getByRole('button', { name: '确认同步到 GitLab' }),
    )

    await waitFor(() =>
      expect(api.syncGitLab).toHaveBeenCalledWith(
        expect.objectContaining({
          tag: {
            name: 'T2-v3',
            message: 'Dragon T2 第三版存档',
          },
        }),
      ),
    )
  })

  it('chooses the synchronization branch before pushing', () => {
    const api = createApi()
    const repository = getDemoRepository()
    render(<DeliveryPage api={api} repository={repository} />)

    fireEvent.change(screen.getByLabelText('同步分支'), {
      target: { value: 'dev/T1' },
    })
    fireEvent.click(screen.getByRole('button', { name: '同步到 GitLab' }))
    expect(
      within(
        screen.getByRole('dialog', { name: '确认同步到 GitLab' }),
      ).getByText('dev/T1'),
    ).toBeVisible()
  })

  it('creates and selects a new local branch before synchronization', async () => {
    const api = createApi()
    render(<DeliveryPage api={api} repository={getDemoRepository()} />)

    fireEvent.click(screen.getByRole('button', { name: '创建新分支' }))
    fireEvent.change(screen.getByLabelText('新分支名称'), {
      target: { value: 'dev/T3' },
    })
    fireEvent.click(screen.getByRole('button', { name: '创建并选中' }))

    await waitFor(() =>
      expect(api.createBranch).toHaveBeenCalledWith({
        name: 'dev/T3',
        startPoint: 'dev/T2',
      }),
    )
    expect(screen.getByLabelText('同步分支')).toHaveValue('dev/T3')
  })

  it('selects packages and opens their file list', async () => {
    render(<DeliveryPage api={createApi()} repository={getDemoRepository()} />)

    const packageCheckbox = await screen.findByRole('checkbox', {
      name: '选择 五金件',
    })
    expect(packageCheckbox).toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: '查看 五金件' }))
    expect(screen.getByText('导轴.pdf')).toBeVisible()
  })

  it('uses MR creation as the Ironforge publication review', async () => {
    const api = createApi()
    render(<DeliveryPage api={api} repository={getDemoRepository()} />)
    await screen.findByRole('checkbox', { name: '选择 五金件' })

    fireEvent.click(screen.getByRole('button', { name: '同步到 GitLab' }))
    fireEvent.change(screen.getByLabelText('同步注释'), {
      target: { value: '提交所有的 BOM 交付包' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: '确认同步到 GitLab' }),
    )
    await waitFor(() => expect(api.syncGitLab).toHaveBeenCalledOnce())

    fireEvent.click(screen.getByRole('checkbox', { name: /胡庆磊/ }))
    fireEvent.click(screen.getByRole('button', { name: '提交发布审核' }))

    await waitFor(() => expect(api.createMergeRequest).toHaveBeenCalledOnce())
    expect(api.createMergeRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceBranch: 'dev/T2',
        reviewerIds: [42],
      }),
    )
    expect(
      screen.queryByRole('button', { name: '发布到 Ironforge' }),
    ).not.toBeInTheDocument()
  })
})
