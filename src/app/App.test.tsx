import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('shows the simplified delivery navigation', () => {
    render(<App />)

    expect(screen.getByRole('link', { name: 'GitLab' })).toHaveAttribute(
      'href',
      '/workspace',
    )
    expect(screen.queryByRole('link', { name: '上传项目' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '获取项目和图纸' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '铁炉堡' })).toHaveAttribute(
      'href',
      '/ironforge',
    )
    expect(screen.queryByRole('link', { name: '历史记录' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /账户与连接/ })).toHaveAttribute(
      'href',
      '/account',
    )
    expect(screen.queryByRole('link', { name: '版本阶段' })).not.toBeInTheDocument()
  })
})
