import { ArrowLeft, ArrowRight, House } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface GuidedWorkflowProps {
  title: string
  description: string
  steps: string[]
  currentStep: number
  children: ReactNode
  onBack?: () => void
  onExit?: () => void
  onNext?: () => void
  nextDisabled?: boolean
  nextLabel?: string
}

export function GuidedWorkflow({
  title,
  description,
  steps,
  currentStep,
  children,
  onBack,
  onExit,
  onNext,
  nextDisabled = false,
  nextLabel = '下一步',
}: GuidedWorkflowProps) {
  return (
    <div className="task-page task-page--guided">
      <header className="task-page__header">
        <Link className="task-home-link" onClick={onExit} to="/workspace/project">
          <House aria-hidden="true" size={17} />
          返回项目操作
        </Link>
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </header>
      <ol aria-label="操作步骤" className="wizard-steps">
        {steps.map((step, index) => (
          <li
            aria-current={index === currentStep ? 'step' : undefined}
            className={
              index < currentStep
                ? 'wizard-steps__item wizard-steps__item--done'
                : index === currentStep
                  ? 'wizard-steps__item wizard-steps__item--current'
                  : 'wizard-steps__item'
            }
            key={step}
          >
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </li>
        ))}
      </ol>
      <section className="wizard-panel">{children}</section>
      <footer className="wizard-actions">
        {onBack ? (
          <button className="button button--secondary" onClick={onBack} type="button">
            <ArrowLeft aria-hidden="true" size={17} />
            上一步
          </button>
        ) : (
          <span />
        )}
        {onNext ? (
          <button
            className="button button--primary"
            disabled={nextDisabled}
            onClick={onNext}
            type="button"
          >
            {nextLabel}
            <ArrowRight aria-hidden="true" size={17} />
          </button>
        ) : null}
      </footer>
    </div>
  )
}
