import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { StagesPage } from './StagesPage'

describe('StagesPage', () => {
  it('explains that a new stage initially shares its base commit', () => {
    render(<StagesPage repository={getDemoRepository()} />)

    expect(
      screen.getByText('新工作版本会先复制所选已有版本的全部内容'),
    ).toBeVisible()
  })
})
