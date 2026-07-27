import type { RepositorySnapshot } from '../domain/repository'

const demoRepository: RepositorySnapshot = {
  id: 'sample-project',
  name: 'sample-project',
  displayName: '示例项目',
  path: 'D:\\Projects\\sample-project',
  gitlabPath: 'example-group/sample-project',
  branch: 'dev/T2',
  upstream: 'origin/dev/T2',
  stage: 'T2 设计',
  ahead: 1,
  behind: 0,
  latestCommit: 'a1b2c3d',
  latestCommitMessage: '更新示例零件',
  changes: [
    { id: 'change-1', path: 'source/assembly.asm', name: 'assembly.asm', kind: 'modified', fileType: '装配文件', size: '2 MB', isCad: true, lfsTracked: true },
    { id: 'change-2', path: 'output/mechanical/sample-part/sample-part.pdf', name: 'sample-part.pdf', kind: 'untracked', fileType: '工程图 PDF', size: '80 KB', isCad: false, lfsTracked: true },
    { id: 'change-3', path: 'charge.json', name: 'charge.json', kind: 'modified', fileType: '交付清单', size: '2 KB', isCad: false, lfsTracked: false },
    { id: 'change-4', path: 'source/sample-part.prt', name: 'sample-part.prt', kind: 'modified', fileType: '零件文件', size: '1 MB', isCad: true, lfsTracked: true },
    { id: 'change-5', path: 'source/old-part.prt', name: 'old-part.prt', kind: 'deleted', fileType: '零件文件', size: '1 MB', isCad: true, lfsTracked: true },
  ],
  branches: [
    { name: 'dev/T2', stage: 'T2 设计', commit: 'a1b2c3d', commitMessage: '更新示例零件', updatedAt: '今天 10:00', remote: true, current: true },
    { name: 'dev/T1', stage: 'T1 设计', commit: 'b2c3d4e', commitMessage: '保存上一阶段设计', updatedAt: '上周', remote: true, current: false },
    { name: 'main', stage: '正式版本', commit: 'd4e5f6a', commitMessage: '建立示例项目', updatedAt: '昨天 16:00', remote: true, current: false },
  ],
  deliveryPackages: [
    {
      id: 'sample-package',
      name: '示例交付包',
      path: 'output/mechanical/sample-part',
      supplier: '示例供应商',
      validation: 'valid',
      files: [
        { name: 'sample-part.pdf', type: 'PDF', size: '80 KB' },
        { name: 'sample-part.step', type: 'STEP', size: '240 KB' },
      ],
    },
  ],
  mergeRequest: {
    id: 1,
    sourceBranch: 'dev/T2',
    targetBranch: 'main',
    title: '示例项目 T2 交付',
    status: 'waiting',
    reviewer: '示例审核人',
  },
  publishJob: {
    id: 'publish-sample-01',
    status: 'not_started',
    commit: 'a1b2c3d',
    packageCount: 1,
  },
  history: [
    { id: 'event-1', type: 'commit', title: '保存示例修改', description: '更新示例零件', actor: '示例用户', timestamp: '今天 10:00', reference: 'a1b2c3d', tone: 'info' },
    { id: 'event-2', type: 'push', title: '上传到项目服务器', description: '工程内容已上传', actor: '示例用户', timestamp: '今天 10:05', reference: 'origin/dev/T2', tone: 'success' },
    { id: 'event-3', type: 'merge_request', title: '提交管理员审核', description: '正在等待示例审核人处理', actor: '示例用户', timestamp: '今天 10:10', reference: '审核单 #1', tone: 'warning' },
    { id: 'event-4', type: 'publish', title: '尚未开始发布', description: '管理员批准后才会开始发布', actor: '系统', timestamp: '等待中', reference: 'publish-sample-01', tone: 'neutral' },
  ],
}

export function getDemoRepository(): RepositorySnapshot {
  return demoRepository
}
