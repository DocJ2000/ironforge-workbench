import type { PropsWithChildren } from 'react'
import type { StatusTone } from '../domain/repository'

interface StatusBadgeProps extends PropsWithChildren {
  tone?: StatusTone
}

export function StatusBadge({ children, tone = 'neutral' }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>
}
