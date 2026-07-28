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
  const [network, accessCode, identity] = await Promise.allSettled([
    dependencies.probeServer(credentials.baseUrl),
    dependencies.probeApi(credentials.baseUrl, credentials.token),
    dependencies.probeSsh(repositoryPath, credentials),
  ])
  const username = accessCode.status === 'fulfilled'
    ? accessCode.value.username
    : undefined
  const checks: ConnectionCheckItem[] = [
    network.status === 'fulfilled'
      ? { id: 'network', label: '公司网络', status: 'passed' }
      : { id: 'network', label: '公司网络', status: 'failed', error: toFriendlyError(network.reason) },
    accessCode.status === 'fulfilled'
      ? { id: 'access_code', label: '软件访问码', status: 'passed', detail: accessCode.value.username }
      : { id: 'access_code', label: '软件访问码', status: 'failed', error: toFriendlyError(accessCode.reason) },
    identity.status === 'fulfilled'
      ? { id: 'identity', label: '电脑身份钥匙', status: 'passed' }
      : { id: 'identity', label: '电脑身份钥匙', status: 'failed', error: toFriendlyError(identity.reason) },
  ]
  return {
    connected: checks.every((item) => item.status === 'passed'),
    ...(username ? { username } : {}),
    checks,
  }
}
