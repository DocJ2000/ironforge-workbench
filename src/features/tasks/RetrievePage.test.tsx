import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import type { DeliveryApi } from '../../data/deliveryClient'
import { getDemoRepository } from '../../data/demoRepository'
import { RetrievePage } from './RetrievePage'

it('offers explicit retrieval actions before choosing a local path', () => {
  const repository = getDemoRepository()
  render(
    <MemoryRouter>
      <RetrievePage
        onSelect={() => undefined}
        projects={[{ id: repository.id, repository, connected: true, lastOpened: '刚刚' }]}
        selectedId={repository.id}
      />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  expect(screen.getByRole('button', { name: /把云端项目下载到这台电脑/ })).toBeVisible()
  expect(screen.getByRole('button', { name: /获取同事刚上传的改动/ })).toBeVisible()
  expect(screen.getByRole('button', { name: /下载铁炉堡已发布图纸/ })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: /获取同事刚上传的改动/ }))
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  expect(screen.getByLabelText('本地保存位置')).toHaveValue(repository.path)
  expect(screen.getByText('项目所在的电脑文件夹')).toBeVisible()
})

it('runs a confirmed safe update and shows the number of received versions', async () => {
  const repository = getDemoRepository()
  const pull = vi.fn().mockResolvedValue({
    branch: repository.branch,
    updated: true,
    receivedCommits: 2,
    commit: 'abc1234',
  })
  render(
    <MemoryRouter>
      <RetrievePage
        api={{ pull } as unknown as DeliveryApi}
        onSelect={() => undefined}
        projects={[{ id: repository.id, repository, connected: true, lastOpened: '刚刚' }]}
        selectedId={repository.id}
      />
    </MemoryRouter>,
  )

  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: /获取同事刚上传的改动/ }))
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: '确认获取' }))

  expect(await screen.findByText('已获取同事上传的改动')).toBeVisible()
  expect(screen.getByText('本次获取了 2 个新版本。')).toBeVisible()
  expect(pull).toHaveBeenCalledOnce()
})

it('uses the saved computer identity without asking for a key path', () => {
  const repository = getDemoRepository()
  render(
    <MemoryRouter>
      <RetrievePage
        onSelect={() => undefined}
        projects={[{ id: repository.id, repository, connected: true, lastOpened: '刚刚' }]}
        selectedId={repository.id}
      />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: /把云端项目下载到这台电脑/ }))
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  expect(screen.queryByText(/高级连接设置/)).not.toBeInTheDocument()
  expect(screen.queryByLabelText(/身份钥匙的位置/)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '项目的 SSH是什么' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: '项目的 SSH是什么' }))
  expect(screen.getByText('请向管理员确认你有该项目的权限。')).toBeVisible()
})
