import type { GitLabConfig } from './gitlabClient.js'

export function loadGitLabConfig(
  environment: NodeJS.ProcessEnv = process.env,
): GitLabConfig {
  const baseUrl = environment.GITLAB_BASE_URL?.trim()
  const token = environment.GITLAB_TOKEN?.trim()

  if (!baseUrl || !token) {
    throw new Error('尚未配置 GitLab 地址或访问凭据')
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    token,
    recommendedReviewers: (
      environment.GITLAB_RECOMMENDED_REVIEWERS ?? ''
    )
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  }
}
