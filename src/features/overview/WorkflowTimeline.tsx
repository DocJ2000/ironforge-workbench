import {
  ArrowRight,
  CheckCircle2,
  CloudUpload,
  GitCommitHorizontal,
  GitMerge,
  PackageCheck,
  PencilRuler,
} from 'lucide-react'

const steps = [
  {
    business: '修改图纸',
    git: 'Working tree',
    detail: 'CAD 保存后只在你的电脑里',
    icon: PencilRuler,
    state: 'complete',
  },
  {
    business: '保存设计版本',
    git: 'Commit',
    detail: '把一组修改记录成可追溯版本',
    icon: GitCommitHorizontal,
    state: 'current',
  },
  {
    business: '上传团队仓库',
    git: 'Push',
    detail: '把本地版本推送到 GitLab 分支',
    icon: CloudUpload,
    state: 'upcoming',
  },
  {
    business: '提交审核',
    git: 'Merge Request',
    detail: '请求管理员审核开发分支',
    icon: GitMerge,
    state: 'upcoming',
  },
  {
    business: '管理员合入',
    git: 'Merge',
    detail: '批准不等于合入，Merge 才进入主线',
    icon: CheckCircle2,
    state: 'upcoming',
  },
  {
    business: '生成交付物',
    git: 'Ironforge',
    detail: '合入后校验并发布 output',
    icon: PackageCheck,
    state: 'upcoming',
  },
]

export function WorkflowTimeline() {
  return (
    <ol className="workflow-timeline">
      {steps.map(({ business, git, detail, icon: Icon, state }, index) => (
        <li className={`workflow-step workflow-step--${state}`} key={git}>
          <div className="workflow-step__top">
            <span className="workflow-step__icon" aria-hidden="true">
              <Icon size={17} />
            </span>
            <span className="workflow-step__number">{index + 1}</span>
          </div>
          <strong>{business}</strong>
          <code>{git}</code>
          <p>{detail}</p>
          {index < steps.length - 1 ? (
            <ArrowRight className="workflow-step__arrow" aria-hidden="true" size={16} />
          ) : null}
        </li>
      ))}
    </ol>
  )
}
