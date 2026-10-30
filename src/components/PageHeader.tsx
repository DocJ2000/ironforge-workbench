import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string; onClick?: () => void }
}

/**
 * One header for every page: eyebrow, title, one-line explanation, optional
 * technical path, and the page-level actions on the right.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  back,
}: PageHeaderProps) {
  return (
    <>
      {back ? (
        <Link className="page-frame__back" onClick={back.onClick} to={back.to}>
          <ArrowLeft aria-hidden="true" size={16} />
          {back.label}
        </Link>
      ) : null}
      <header className="page-frame__header">
        <div className="page-frame__heading">
          {eyebrow ? <p className="page-frame__eyebrow">{eyebrow}</p> : null}
          <h1 className="page-frame__title">{title}</h1>
          {description ? <p className="page-frame__subtitle">{description}</p> : null}
          {meta ? <code className="page-frame__meta">{meta}</code> : null}
        </div>
        {actions ? <div className="page-frame__actions">{actions}</div> : null}
      </header>
    </>
  )
}
