import {
  Check,
  CloudUpload,
  FileCheck2,
  GitMerge,
  PackageCheck,
  Send,
} from 'lucide-react'

const steps = [
  { label: '选择交付物', term: 'output', icon: PackageCheck, state: 'complete' },
  { label: '自动校验', term: 'forge + charge', icon: FileCheck2, state: 'current' },
  { label: '保存并推送', term: 'Commit + Push', icon: CloudUpload, state: 'upcoming' },
  { label: '提交审核', term: 'Merge Request', icon: Send, state: 'upcoming' },
  { label: '跟踪发布', term: 'Merge + Ironforge', icon: GitMerge, state: 'upcoming' },
]

export function ReleaseStepper() {
  return (
    <ol className="release-stepper">
      {steps.map(({ label, term, icon: Icon, state }, index) => (
        <li className={`release-step release-step--${state}`} key={label}>
          <span className="release-step__icon" aria-hidden="true">
            {state === 'complete' ? <Check size={17} /> : <Icon size={17} />}
          </span>
          <span className="release-step__number">{index + 1}</span>
          <strong>{label}</strong>
          <code>{term}</code>
        </li>
      ))}
    </ol>
  )
}
