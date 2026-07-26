import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
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
  expect(screen.getByText('更新这个本地文件夹')).toBeVisible()
})
