import { CheckCircle2, Circle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { onboardingClient } from '../../data/onboardingClient'

export function FirstRunChecklist({ connected, projectAdded }: { connected: boolean; projectAdded: boolean }) {
  const [state, setState] = useState(onboardingClient.status())
  const complete = connected && projectAdded && state.firstUpload
  if (state.dismissed || complete) return <button className="button button--quiet" onClick={() => { onboardingClient.update({ dismissed: false }); setState(onboardingClient.status()) }} type="button">查看首次使用步骤</button>
  const items = [
    { done: connected, label: '连接公司服务器', route: '/account' },
    { done: projectAdded, label: '添加或下载一个项目', route: '/workspace/retrieve' },
    { done: state.firstUpload, label: '完成第一次上传', route: '/workspace/upload' },
  ]
  return <section className="project-attention"><strong>首次使用</strong>{items.map((item) => <Link key={item.label} to={item.route}>{item.done ? <CheckCircle2 size={15} /> : <Circle size={15} />}{item.label}</Link>)}<button className="button button--quiet" onClick={() => { onboardingClient.update({ dismissed: true }); setState(onboardingClient.status()) }} type="button">暂时收起</button></section>
}
