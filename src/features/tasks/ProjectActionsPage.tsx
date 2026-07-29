import { ArrowLeft, CloudDownload, ExternalLink, History, UploadCloud } from 'lucide-react'
import { Link } from 'react-router-dom'
import { organizationClient } from '../../data/organizationClient'
import type { RepositorySnapshot } from '../../domain/repository'
import './projectActions.css'

export function ProjectActionsPage({ repository }: { repository: RepositorySnapshot }) {
  const gitLabBase = organizationClient.load().gitlabUrl.replace(/\/+$/, '')
  const projectUrl = gitLabBase && repository.gitlabPath
    ? `${gitLabBase}/${repository.gitlabPath}`
    : ''
  return (
    <div className="task-page project-actions-page">
      <Link className="project-actions__back" to="/workspace">
        <ArrowLeft size={17} />
        返回项目列表
      </Link>
      <header>
        <span className="task-eyebrow">已选择项目</span>
        <h1>{repository.displayName}</h1>
        <p>这次想做什么？请选择一项。</p>
        {projectUrl ? <a className="project-actions__gitlab-link" href={projectUrl} rel="noreferrer" target="_blank"><ExternalLink size={16} />在 GitLab 查看本项目</a> : null}
      </header>
      <div className="project-action-choices">
        <Link to="/workspace/upload/gitlab">
          <span className="project-action-choices__icon"><UploadCloud size={28} /></span>
          <span><strong>上传我的修改</strong><small>把这台电脑上的新内容保存到公司服务器。</small></span>
        </Link>
        <Link to="/workspace/retrieve">
          <span className="project-action-choices__icon"><CloudDownload size={28} /></span>
          <span><strong>下载服务器内容</strong><small>把同事上传的新内容更新到这台电脑。</small></span>
        </Link>
        <Link to="/history">
          <span className="project-action-choices__icon"><History size={28} /></span>
          <span><strong>查看操作历史</strong><small>查看这个项目以前的上传、下载和审核记录。</small></span>
        </Link>
      </div>
    </div>
  )
}
