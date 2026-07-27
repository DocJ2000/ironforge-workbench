import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { AccountPage } from './AccountPage'

it('keeps GitLab secrets hidden and links to Ironforge SSO', () => {
  const repository = getDemoRepository()
  render(
    <AccountPage
      onSelect={() => undefined}
      projects={[{ id: repository.id, repository, connected: true, lastOpened: '刚刚' }]}
      selectedId={repository.id}
    />,
  )
  const token = screen.getByLabelText('GitLab Token', { selector: 'input' })
  expect(token).toHaveAttribute('type', 'password')
  fireEvent.click(screen.getByRole('button', { name: '显示 Token' }))
  expect(token).toHaveAttribute('type', 'text')
  expect(screen.getByRole('link', { name: /打开铁炉堡并登录/ })).toHaveAttribute(
    'href',
    'http://ironforge.holo.tp/projects',
  )
})
