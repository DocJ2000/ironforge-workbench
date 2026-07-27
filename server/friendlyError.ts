import type { FriendlyError } from '../src/domain/connection.js'
export type { FriendlyError } from '../src/domain/connection.js'

const rules: Array<{
  code: string
  pattern: RegExp
  title: string
  detail: string
  nextAction: string
}> = [
  {
    code: 'company_network_unreachable',
    pattern: /ETIMEDOUT|ENETUNREACH|ECONNREFUSED|network|fetch failed|timeout/i,
    title: '暂时无法连接公司服务器',
    detail: '通常是电脑没有连接公司网络，或者服务器暂时不可用。',
    nextAction: '连接公司网络后，再点一次“检查连接”。',
  },
  {
    code: 'access_code_invalid',
    pattern: /\b401\b|\b403\b|unauthorized|forbidden|token|access code|访问码|令牌/i,
    title: '软件访问码不可用',
    detail: '访问码可能填写错误、已经到期，或者没有勾选 api 权限。',
    nextAction: '打开“账户与连接”，重新创建并填写软件访问码。',
  },
  {
    code: 'identity_not_registered',
    pattern: /publickey|public key|host key verification|identity.*not|身份钥匙|公钥/i,
    title: '这台电脑还没有登记',
    detail: 'GitLab 尚未认可这台电脑的身份钥匙。',
    nextAction: '打开“账户与连接”，复制电脑登记码并添加到 GitLab。',
  },
  {
    code: 'local_changes_block_update',
    pattern: /local changes|would be overwritten|dirty worktree/i,
    title: '本地文件还没有保存到服务器',
    detail: '直接获取服务器内容可能覆盖当前改动。',
    nextAction: '先上传本地改动，或请同事帮助确认后再获取。',
  },
  {
    code: 'history_diverged',
    pattern: /diverg|non-fast-forward|unrelated histories/i,
    title: '本地和服务器都发生了改动',
    detail: '软件无法自动判断应该保留哪一边。',
    nextAction: '请熟悉项目的同事处理版本差异后再继续。',
  },
  {
    code: 'branch_missing',
    pattern: /pathspec.*did not match|remote branch.*not found|unknown revision/i,
    title: '找不到所选工作版本',
    detail: '该工作版本可能已被改名或删除。',
    nextAction: '刷新工作版本列表并重新选择。',
  },
  {
    code: 'tag_already_exists',
    pattern: /tag .*already exists|tag .*已存在|远端版本.*已存在/i,
    title: '本次交付标签已经使用过',
    detail: '交付标签必须对应唯一一次交付。',
    nextAction: '换一个新的本次交付标签，例如在末尾增加日期或序号。',
  },
  {
    code: 'permission_denied',
    pattern: /permission denied|access denied|not allowed/i,
    title: '当前账户没有操作权限',
    detail: '你的本地文件没有改变。',
    nextAction: '请项目管理员确认你已经获得这个项目的工程师权限。',
  },
  {
    code: 'path_locked',
    pattern: /EBUSY|resource busy|being used by another process|cannot lock/i,
    title: '文件正在被其他软件使用',
    detail: '常见原因是图纸或工程文件仍在编辑软件中打开。',
    nextAction: '关闭正在使用这些文件的软件，然后重试。',
  },
  {
    code: 'invalid_path',
    pattern: /ENOENT|not found|no such file|invalid path/i,
    title: '找不到所选文件夹',
    detail: '文件夹可能被移动、改名或断开连接。',
    nextAction: '重新选择项目文件夹。',
  },
  {
    code: 'disk_full',
    pattern: /ENOSPC|no space left|disk full/i,
    title: '电脑磁盘空间不足',
    detail: '软件无法安全写入新的项目文件。',
    nextAction: '清理磁盘空间后再重试。',
  },
]

function messageOf(cause: unknown) {
  return cause instanceof Error ? cause.message : String(cause ?? '')
}

function redact(message: string) {
  return message
    .replace(/(PRIVATE-TOKEN|authorization|token|passphrase|password)\s*[:=]\s*\S+/gi, '$1: [已隐藏]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240)
}

export function toFriendlyError(cause: unknown): FriendlyError {
  const message = messageOf(cause)
  const rule = rules.find((candidate) => candidate.pattern.test(message))
  if (rule) {
    return {
      code: rule.code,
      title: rule.title,
      detail: rule.detail,
      filesSafe: true,
      nextAction: rule.nextAction,
    }
  }
  return {
    code: 'unknown_error',
    title: '操作没有完成',
    detail: '软件没有改动你的本地文件，可以按下面的方法处理后重试。',
    filesSafe: true,
    nextAction: '重试一次；如果仍然失败，把技术信息发给技术同事。',
    ...(message ? { technicalSummary: redact(message) } : {}),
  }
}
