import { CircleHelp } from 'lucide-react'
import { type ReactNode, useId, useState } from 'react'

export function FieldHelp({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const contentId = useId()
  return (
    <span className="field-help">
      <button
        aria-controls={contentId}
        aria-expanded={open}
        aria-label={`${label}是什么`}
        className="field-help__button"
        onClick={() => setOpen((value) => !value)}
        title={`${label}是什么`}
        type="button"
      >
        <CircleHelp size={15} />
      </button>
      {open ? (
        <span className="field-help__content" id={contentId}>
          {children}
        </span>
      ) : null}
    </span>
  )
}
