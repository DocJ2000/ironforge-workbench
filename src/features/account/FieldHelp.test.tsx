import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { FieldHelp } from './FieldHelp'

it('opens and closes detailed help from a question icon', () => {
  render(<FieldHelp label="软件访问码">创建步骤</FieldHelp>)
  const button = screen.getByRole('button', { name: '软件访问码是什么' })
  expect(button).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByText('创建步骤')).not.toBeInTheDocument()

  fireEvent.click(button)
  expect(button).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText('创建步骤')).toBeVisible()

  fireEvent.click(button)
  expect(screen.queryByText('创建步骤')).not.toBeInTheDocument()
})
