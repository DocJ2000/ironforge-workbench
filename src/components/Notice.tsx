import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'

export type NoticeTone = 'info' | 'success' | 'warning' | 'danger'

const toneIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const

interface NoticeProps {
  tone?: NoticeTone
  title?: ReactNode
  children?: ReactNode
  actions?: ReactNode
}

/**
 * Inline message block. Replaces the per-page `workspace-feedback`,
 * `delivery-alert` and `safety-notice` variants so the same situation always
 * looks the same.
 */
export function Notice({ tone = 'info', title, children, actions }: NoticeProps) {
  const Icon = toneIcons[tone]
  return (
    <div className={`notice notice--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon aria-hidden="true" className="notice__icon" size={17} />
      <div className="notice__body">
        {title ? <strong className="notice__title">{title}</strong> : null}
        {children ? <div>{children}</div> : null}
        {actions ? <div className="notice__actions">{actions}</div> : null}
      </div>
    </div>
  )
}
