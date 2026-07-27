export interface FriendlyError {
  code: string
  title: string
  detail: string
  filesSafe: boolean
  nextAction: string
  technicalSummary?: string
}

export interface ConnectionCheckItem {
  id: 'network' | 'access_code' | 'identity'
  label: string
  status: 'passed' | 'failed' | 'skipped'
  detail?: string
  error?: FriendlyError
}

export interface ConnectionCheckResult {
  connected: boolean
  username?: string
  checks: ConnectionCheckItem[]
}
