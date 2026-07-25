import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    publish: vi.fn().mockResolvedValue({
      jobId: 'job-1',
      packageCount: 1,
    }),
  } as unknown as DeliveryApi
}

describe('DeliveryPage', () => {
  it('opens read-only changes and requires a reviewer', async () => {
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

    const syncButton = screen.getByRole('button', { name: '同步到 GitLab' })
    expect(syncButton).toBeDisabled()

    const reviewer = await screen.findByRole('checkbox', {
      name: '选择审核人 胡庆磊',
    })
    fireEvent.click(reviewer)
    expect(syncButton).toBeEnabled()
  })

  it('requires a sync comment before executing', async () => {
    const api = createApi()
    render(<DeliveryPage api={api} repository={getDemoRepository()} />)

    fireEvent.click(
      await screen.findByRole('checkbox', {
        name: '选择审核人 胡庆磊',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: '同步到 GitLab' }))

    const dialog = screen.getByRole('dialog', { name: '确认同步到 GitLab' })
    expect(dialog).toBeVisible()
    const confirm = screen.getByRole('button', {
      name: '确认同步并创建 MR',
    })
    expect(confirm).toBeDisabled()

    fireEvent.change(screen.getByLabelText('同步注释'), {
      target: { value: '提交所有的BOM交付包' },
    })
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)

    await waitFor(() => expect(api.execute).toHaveBeenCalledOnce())
    expect(api.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '提交所有的BOM交付包',
        reviewerIds: [42],
      }),
    )
  })

  it('selects packages and opens their file list', async () => {
    render(<DeliveryPage api={createApi()} repository={getDemoRepository()} />)

    const packageCheckbox = await screen.findByRole('checkbox', {
      name: '发布 五金件',
    })
    expect(packageCheckbox).toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: '查看 五金件' }))
    expect(screen.getByText('导轴.pdf')).toBeVisible()
  })

  it('requires a separate publication comment after approval', async () => {
    const api = createApi()
    render(
      <DeliveryPage
        api={api}
        initialMergeRequest={{ iid: 3, status: 'approved' }}
        repository={getDemoRepository()}
      />,
    )
    await screen.findByRole('checkbox', { name: '发布 五金件' })

    fireEvent.click(
      screen.getByRole('button', { name: '发布到 Ironforge' }),
    )
    expect(
      screen.getByRole('dialog', { name: '确认发布到 Ironforge' }),
    ).toBeVisible()
    const confirm = screen.getByRole('button', { name: '确认发布' })
    expect(confirm).toBeDisabled()

    fireEvent.change(screen.getByLabelText('发布注释'), {
      target: { value: '发布采购交付包' },
    })
    fireEvent.click(confirm)

    await waitFor(() => expect(api.publish).toHaveBeenCalledOnce())
    expect(api.publish).toHaveBeenCalledWith({
      mergeRequestIid: 3,
      packageIds: ['output/mechanical/五金件'],
      comment: '发布采购交付包',
    })
  })
})
