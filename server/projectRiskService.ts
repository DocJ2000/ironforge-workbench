import type { GitLabSyncDraft } from '../src/domain/delivery.js'

export interface ProjectRisk { code: string; title: string; blocking: true; nextAction: string }

export function inspectUploadRisks(repository: { branch: string; behind?: number }, draft: GitLabSyncDraft): ProjectRisk[] {
  const risks: ProjectRisk[] = []
  if (!draft.changePaths.length) risks.push({ code: 'empty_changes', title: '没有需要上传的文件', blocking: true, nextAction: '先修改或新增文件。' })
  if (repository.behind && repository.behind > 0) risks.push({ code: 'server_ahead', title: '公司服务器有更新', blocking: true, nextAction: '先获取同事刚上传的改动。' })
  if (repository.branch !== draft.branch) risks.push({ code: 'unexpected_branch', title: '当前工作版本与选择不一致', blocking: true, nextAction: '刷新项目后重新选择工作版本。' })
  const deleted = draft.changePaths.filter((path) => !draft.confirmedDeletions.includes(path) && /\.(prt|asm|drw|sldprt|sldasm|step|stp)$/i.test(path))
  if (deleted.length) risks.push({ code: 'unconfirmed_cad_deletion', title: '有删除的设计文件尚未确认', blocking: true, nextAction: '返回文件清单，逐项确认删除。' })
  return risks
}
