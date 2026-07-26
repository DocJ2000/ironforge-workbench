import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { TaskHomePage } from './TaskHomePage'

describe('TaskHomePage', () => {
  it('offers three plain-language task routes', () => {
    render(<MemoryRouter><TaskHomePage repository={getDemoRepository()} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /上传整个工程/ })).toHaveAttribute('href', '/workspace/project-upload')
    expect(screen.getByRole('link', { name: /提交图纸到铁炉堡/ })).toHaveAttribute('href', '/workspace/ironforge-delivery')
    expect(screen.getByRole('link', { name: /获取项目和图纸/ })).toHaveAttribute('href', '/workspace/retrieve')
  })
})
