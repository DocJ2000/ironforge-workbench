import type { GitRemoteCredentials } from './gitBranchOperations.js'
import { toFriendlyError } from './friendlyError.js'
import type {
  ConnectionCheckItem,
  ConnectionCheckResult,
} from '../src/domain/connection.js'
export type {
  ConnectionCheckItem,
  ConnectionCheckResult,
} from '../src/domain/connection.js'

export interface ConnectionCredentials extends GitRemoteCredentials {
  baseUrl: string
  token: string
}

export interface ConnectionCheckDependencies {
  probeServer: (baseUrl: string) => Promise<void>
  probeApi: (baseUrl: string, token: string) => Promise<{ username: string }>
  probeSsh: (
    repositoryPath: string,
    credentials: GitRemoteCredentials,
  ) => Promise<void>
}

export async function checkConnection(
  repositoryPath: string,
  credentials: ConnectionCredentials,
  dependencies: ConnectionCheckDependencies,
): Promise<ConnectionCheckResult> {
  const checks: ConnectionCheckItem[] = []
  try {
    await dependencies.probeServer(credentials.baseUrl)
    checks.push({ id: 'network', label: '公司网络', status: 'passed' })
  } catch (cause) {
    checks.push({
      id: 'network',
      label: '公司网络',
      status: 'failed',
      error: toFriendlyError(cause),
    })
    checks.push(
      { id: 'access_code', label: '软件访问码', status: 'skipped' },
      { id: 'identity', label: '电脑身份钥匙', status: 'skipped' },
    )
    return { connected: false, checks }
  }

  let username: string
  try {
    username = (await dependencies.probeApi(credentials.baseUrl, credentials.token)).username
    checks.push({
      id: 'access_code',
      label: '软件访问码',
      status: 'passed',
      detail: username,
    })
  } catch (cause) {
    checks.push({
      id: 'access_code',
      label: '软件访问码',
      status: 'failed',
      error: toFriendlyError(cause),
    })
    checks.push({ id: 'identity', label: '电脑身份钥匙', status: 'skipped' })
    return { connected: false, checks }
  }

  try {
    await dependencies.probeSsh(repositoryPath, credentials)
    checks.push({ id: 'identity', label: '电脑身份钥匙', status: 'passed' })
  } catch (cause) {
    checks.push({
      id: 'identity',
      label: '电脑身份钥匙',
      status: 'failed',
      error: toFriendlyError(cause),
    })
    return { connected: false, username, checks }
  }

  return { connected: true, username, checks }
}
