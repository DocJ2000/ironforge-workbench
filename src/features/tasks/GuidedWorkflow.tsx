import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { PageHeader } from '../../components/PageHeader'
import './guidedWorkflow.css'

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
    <div className="page-frame page-frame--guided">
      <PageHeader
        back={{ to: '/workspace/project', label: '返回项目操作', onClick: onExit }}
        description={description}
        title={title}
      />
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
