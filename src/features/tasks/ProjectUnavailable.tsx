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
        <p>软件还没有找到这个项目在电脑上的文件夹。重新添加项目文件夹后，才能上传工程和提交图纸。</p>
        <Link className="button button--primary" to="/workspace">重新选择项目文件夹</Link>
      </section>
    </div>
  )
}
