import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { UploadEntryPage } from './UploadEntryPage'

it('selects a project and enters the combined Ironforge path', () => {
  const repository = getDemoRepository()
  const onSelect = vi.fn()
  render(
    <MemoryRouter>
      <Routes>
        <Route path="*" element={<UploadEntryPage onSelect={onSelect} projects={[{ id: repository.id, repository, connected: true, lastOpened: '刚刚' }]} selectedId={repository.id} />} />
        <Route path="/workspace/upload/ironforge" element={<span>combined delivery</span>} />
      </Routes>
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.click(screen.getByRole('button', { name: /保存工程并提交图纸审核/ }))
  fireEvent.click(screen.getByRole('button', { name: '进入上传流程' }))
  expect(screen.getByText('combined delivery')).toBeVisible()
})
