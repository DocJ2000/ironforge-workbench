import type { RepositorySnapshot, StatusTone } from './repository.js'

export interface ProjectBusinessStatus { label: string; tone: StatusTone; action: string; route: string }

export function summarizeProjectStatus(repository: RepositorySnapshot): ProjectBusinessStatus {
  if (repository.behind > 0) return { label: '公司服务器有新内容', tone: 'warning', action: '获取最新内容', route: '/workspace/retrieve' }
  if (repository.changes.length || repository.ahead > 0) return { label: '有内容等待上传', tone: 'warning', action: '上传这个项目', route: '/workspace/upload' }
  if (repository.mergeRequest.status === 'waiting') return { label: '正在等待管理员审核', tone: 'info', action: '查看交付进度', route: '/history' }
  if (repository.publishJob.status === 'running') return { label: '正在发布到铁炉堡', tone: 'info', action: '查看发布进度', route: '/release' }
  return { label: '本地与服务器一致', tone: 'success', action: '查看项目', route: '/overview' }
}
