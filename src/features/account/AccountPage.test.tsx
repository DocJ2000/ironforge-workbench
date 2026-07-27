import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { AccountPage } from './AccountPage'

it('keeps advanced secrets hidden and has no project selector', () => {
  render(<AccountPage />)
  expect(screen.queryByLabelText('为哪个项目设置连接')).not.toBeInTheDocument()
  const token = screen.getByLabelText('GitLab Token', { selector: 'input' })
  expect(token).toHaveAttribute('type', 'password')
  fireEvent.click(screen.getByRole('button', { name: '显示 Token' }))
  expect(token).toHaveAttribute('type', 'text')
  expect(screen.getByRole('link', { name: /打开铁炉堡并登录/ })).toHaveAttribute(
    'href',
    'http://ironforge.holo.tp/projects',
  )
})
