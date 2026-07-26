import { Link } from 'react-router-dom'
import type { RepositorySnapshot } from '../../domain/repository'

export function ProjectUnavailable({ repository }: { repository: RepositorySnapshot }) {
  return (
    <div className="task-page">
      <header className="task-page__header">
        <Link className="task-home-link" to="/workspace">返回项目中心</Link>
        <div>
          <h1>{repository.displayName}</h1>
          <p>{repository.path}</p>
        </div>
      </header>
      <section className="wizard-panel blocking-notice">
        <h2>这个项目尚未连接</h2>
        <p>当前只展示项目切换效果。连接本地文件夹和 GitLab 后，才能执行上传与交付。</p>
        <Link className="button button--primary" to="/workspace">返回选择项目</Link>
      </section>
    </div>
  )
}
