import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { IronforgePortalPage } from './IronforgePortalPage'

it('keeps Ironforge login separate from GitLab credentials', () => {
  localStorage.clear()
  render(<IronforgePortalPage />)
  expect(screen.getByText('正式图纸')).toBeVisible()
  expect(screen.getByText(/不会使用你的 GitLab 访问码/)).toBeVisible()
  expect(screen.getByText(/不会拿走或保存你的登录信息/)).toBeVisible()
})
