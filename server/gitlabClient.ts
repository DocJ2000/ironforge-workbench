import type {
  GitLabProjectRole,
  GitLabReviewer,
} from '../src/domain/delivery.js'

export interface GitLabConfig {
  baseUrl: string
  token: string
  recommendedReviewers: string[]
}

interface GitLabMemberResponse {
  id: number
  name: string
  username: string
  avatar_url?: string | null
  access_level: number
}

export interface CreateMergeRequestInput {
  projectPath: string
  sourceBranch: string
  targetBranch: string
  title: string
  description: string
  reviewerIds: number[]
}

export interface CreatedMergeRequest {
  iid: number
  webUrl: string
}

export interface MergeRequestState {
  iid: number
  state: 'opened' | 'closed' | 'merged'
  approved: boolean
  webUrl: string
}

export interface MarkdownUpload {
  name: string
  type: string
  bytes: Uint8Array
}

export interface GitLabCurrentUser {
  username: string
  name: string
}

function projectUrl(baseUrl: string, projectPath: string) {
  return `${baseUrl}/api/v4/projects/${encodeURIComponent(projectPath)}`
}

function roleFromAccessLevel(accessLevel: number): GitLabProjectRole {
  if (accessLevel >= 50) return 'Owner'
  if (accessLevel >= 40) return 'Maintainer'
  if (accessLevel >= 30) return 'Developer'
  if (accessLevel >= 20) return 'Reporter'
  return 'Guest'
}

async function readError(response: Response) {
  try {
    return (await response.json()) as unknown
  } catch {
    return null
  }
}

function gitLabError(status: number, _payload: unknown) {
  if (status === 401 || status === 403) {
    return new Error('GitLab 登录凭据已失效，请重新连接')
  }
  if (status === 409) {
    return new Error('当前分支已经存在开放中的 MR')
  }
  return new Error(`GitLab 请求失败 (${status})`)
}

export function createGitLabClient(
  config: GitLabConfig,
  fetcher: typeof fetch = fetch,
) {
  async function request(path: string, init?: RequestInit) {
    const response = await fetcher(`${config.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'PRIVATE-TOKEN': config.token,
        ...init?.headers,
      },
    })
    if (!response.ok) {
      throw gitLabError(response.status, await readError(response))
    }
    return response
  }

  return {
    async currentUser(): Promise<GitLabCurrentUser> {
      const response = await request('/api/v4/user')
      const user = (await response.json()) as GitLabCurrentUser
      return { username: user.username, name: user.name }
    },

    async listReviewers(projectPath: string): Promise<GitLabReviewer[]> {
      const response = await request(
        `/api/v4/projects/${encodeURIComponent(projectPath)}/members/all?per_page=100`,
      )
      const members = (await response.json()) as GitLabMemberResponse[]
      const membersById = new Map<number, GitLabMemberResponse>()

      for (const member of members) {
        const existing = membersById.get(member.id)
        if (!existing || member.access_level > existing.access_level) {
          membersById.set(member.id, member)
        }
      }

      const recommended = new Set(
        config.recommendedReviewers.map((value) => value.toLowerCase()),
      )

      return [...membersById.values()]
        .map((member) => ({
          id: member.id,
          name: member.name,
          username: member.username,
          avatarUrl: member.avatar_url ?? undefined,
          role: roleFromAccessLevel(member.access_level),
          recommended: recommended.has(member.username.toLowerCase()),
        }))
        .sort(
          (left, right) =>
            Number(right.recommended) - Number(left.recommended) ||
            left.name.localeCompare(right.name, 'zh-CN'),
        )
    },

    async createMergeRequest(
      input: CreateMergeRequestInput,
    ): Promise<CreatedMergeRequest> {
      const response = await request(
        `${projectUrl('', input.projectPath)}/merge_requests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_branch: input.sourceBranch,
            target_branch: input.targetBranch,
            title: input.title,
            description: input.description,
            reviewer_ids: input.reviewerIds,
            remove_source_branch: false,
          }),
        },
      )
      const result = (await response.json()) as {
        iid: number
        web_url: string
      }
      return { iid: result.iid, webUrl: result.web_url }
    },

    async uploadMarkdownFile(
      projectPath: string,
      upload: MarkdownUpload,
    ): Promise<{ markdown: string }> {
      const body = new FormData()
      body.append(
        'file',
        new Blob([new Uint8Array(upload.bytes).buffer], { type: upload.type }),
        upload.name,
      )
      const response = await request(
        `${projectUrl('', projectPath)}/uploads`,
        { method: 'POST', body },
      )
      const result = (await response.json()) as { markdown: string }
      return { markdown: result.markdown }
    },

    async getMergeRequest(
      projectPath: string,
      iid: number,
    ): Promise<MergeRequestState> {
      const [mergeRequestResponse, approvalsResponse] = await Promise.all([
        request(
          `${projectUrl('', projectPath)}/merge_requests/${iid}`,
        ),
        request(
          `${projectUrl('', projectPath)}/merge_requests/${iid}/approvals`,
        ),
      ])
      const mergeRequest = (await mergeRequestResponse.json()) as {
        iid: number
        state: 'opened' | 'closed' | 'merged'
        web_url: string
      }
      const approvals = (await approvalsResponse.json()) as {
        approved: boolean
      }
      return {
        iid: mergeRequest.iid,
        state: mergeRequest.state,
        approved: approvals.approved,
        webUrl: mergeRequest.web_url,
      }
    },
  }
}
