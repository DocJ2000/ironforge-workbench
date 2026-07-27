import {
  Check,
  CloudUpload,
  FileCheck2,
  GitMerge,
  PackageCheck,
  Send,
} from 'lucide-react'

const steps = [
  { label: '选择交付物', term: '交付图纸', icon: PackageCheck, state: 'complete' },
  { label: '自动检查', term: '交付清单', icon: FileCheck2, state: 'current' },
  { label: '上传项目', term: '公司服务器', icon: CloudUpload, state: 'upcoming' },
  { label: '提交审核', term: '管理员审核单', icon: Send, state: 'upcoming' },
  { label: '跟踪发布', term: '发布到铁炉堡', icon: GitMerge, state: 'upcoming' },
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
