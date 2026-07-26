import { ArrowRight, Download, FolderSync, PackageCheck, UploadCloud } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { RepositorySnapshot } from '../../domain/repository'
import './tasks.css'

interface TaskHomePageProps {
  repository: RepositorySnapshot
}

const tasks = [
  {
    to: '/workspace/project-upload',
    title: '上传整个工程',
    description: '把本地工程的新增和修改保存到 GitLab，方便同事获取。',
    icon: UploadCloud,
    tone: 'cyan',
  },
  {
    to: '/workspace/ironforge-delivery',
    title: '提交图纸到铁炉堡',
    description: '选择 OUTPUT 交付包，提交审核；审核通过后发布到铁炉堡。',
    icon: PackageCheck,
    tone: 'red',
  },
  {
    to: '/workspace/retrieve',
    title: '获取项目和图纸',
    description: '在新电脑下载项目、获取同事改动，或下载已发布图纸。',
    icon: Download,
    tone: 'green',
  },
]

export function TaskHomePage({ repository }: TaskHomePageProps) {
  return (
    <div className="task-page task-home">
      <header className="task-home__header">
        <div>
          <span className="task-eyebrow">当前项目</span>
          <h1>{repository.displayName}</h1>
          <p>你现在想做什么？选择一项，软件会一步一步带你完成。</p>
        </div>
        <div className="current-project">
          <FolderSync aria-hidden="true" size={18} />
          <span>
            <small>当前分支</small>
            <strong>{repository.branch}</strong>
          </span>
        </div>
      </header>
      <nav aria-label="选择要做的事情" className="task-list">
        {tasks.map(({ to, title, description, icon: Icon, tone }) => (
          <Link className={`task-entry task-entry--${tone}`} key={to} to={to}>
            <span className="task-entry__icon">
              <Icon aria-hidden="true" size={25} />
            </span>
            <span className="task-entry__copy">
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
            <ArrowRight aria-hidden="true" className="task-entry__arrow" size={21} />
          </Link>
        ))}
      </nav>
    </div>
  )
}
