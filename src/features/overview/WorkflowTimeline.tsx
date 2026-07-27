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
    git: '仅在这台电脑',
    detail: 'CAD 保存后只在你的电脑里',
    icon: PencilRuler,
    state: 'complete',
  },
  {
    business: '保存设计版本',
    git: '保存修改',
    detail: '把一组修改记录成可追溯版本',
    icon: GitCommitHorizontal,
    state: 'current',
  },
  {
    business: '上传项目',
    git: '上传到服务器',
    detail: '把这台电脑上的修改上传到所选工作版本',
    icon: CloudUpload,
    state: 'upcoming',
  },
  {
    business: '提交审核',
    git: '管理员审核单',
    detail: '请求管理员审核本次交付内容',
    icon: GitMerge,
    state: 'upcoming',
  },
  {
    business: '管理员批准',
    git: '进入正式版本',
    detail: '管理员确认后，把内容放入正式版本',
    icon: CheckCircle2,
    state: 'upcoming',
  },
  {
    business: '生成交付物',
    git: '发布到铁炉堡',
    detail: '批准后检查并发布交付图纸',
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
