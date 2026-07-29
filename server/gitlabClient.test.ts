import { describe, expect, it, vi } from 'vitest'
import { createGitLabClient, type GitLabConfig } from './gitlabClient'

const config: GitLabConfig = {
  baseUrl: 'https://gitlfs.lab.tp',
  token: 'secret-token',
  recommendedReviewers: ['huqinglei'],
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('GitLabClient', () => {
  it('sorts recommended reviewers first and removes inherited duplicates', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse([
        {
          id: 7,
          name: '普通成员',
          username: 'member',
          avatar_url: null,
          access_level: 30,
        },
        {
          id: 42,
          name: '胡庆磊',
          username: 'huqinglei',
          avatar_url: 'https://gitlfs.lab.tp/avatar.png',
          access_level: 40,
        },
        {
          id: 42,
          name: '胡庆磊',
          username: 'huqinglei',
          avatar_url: 'https://gitlfs.lab.tp/avatar.png',
          access_level: 30,
        },
      ]),
    )
    const client = createGitLabClient(config, fetcher)

    const reviewers = await client.listReviewers(
      'rockteam/dragon/optics/lens-mechanics',
    )

    expect(reviewers).toEqual([
      expect.objectContaining({
        id: 42,
        username: 'huqinglei',
        role: 'Maintainer',
        recommended: true,
      }),
      expect.objectContaining({
        id: 7,
        username: 'member',
        role: 'Developer',
        recommended: false,
      }),
    ])
    expect(fetcher).toHaveBeenCalledWith(
      'https://gitlfs.lab.tp/api/v4/projects/rockteam%2Fdragon%2Foptics%2Flens-mechanics/members/all?per_page=100',
      expect.objectContaining({
        headers: expect.objectContaining({ 'PRIVATE-TOKEN': 'secret-token' }),
      }),
    )
  })

  it('creates an MR with reviewers and keeps the source branch', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        iid: 3,
        web_url:
          'https://gitlfs.lab.tp/rockteam/dragon/optics/lens-mechanics/-/merge_requests/3',
      }),
    )
    const client = createGitLabClient(config, fetcher)

    await client.createMergeRequest({
      projectPath: 'rockteam/dragon/optics/lens-mechanics',
      sourceBranch: 'dev/T2',
      targetBranch: 'main',
      title: '提交所有的BOM交付包',
      description: '同步注释：提交所有的BOM交付包',
      reviewerIds: [42],
    })

    const request = fetcher.mock.calls[0]
    expect(JSON.parse(request[1].body)).toMatchObject({
      source_branch: 'dev/T2',
      target_branch: 'main',
      reviewer_ids: [42],
      remove_source_branch: false,
    })
  })

  it('uploads a PDF for use in Markdown without setting JSON headers', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        markdown: '[评审资料.pdf](/uploads/example/评审资料.pdf)',
      }),
    )
    const client = createGitLabClient(config, fetcher)

    const result = await client.uploadMarkdownFile(
      'rockteam/dragon/optics/lens-mechanics',
      {
        name: '评审资料.pdf',
        type: 'application/pdf',
        bytes: new Uint8Array([1, 2, 3]),
      },
    )

    expect(result.markdown).toContain('评审资料.pdf')
    expect(fetcher.mock.calls[0][0]).toContain('/uploads')
    expect(fetcher.mock.calls[0][1].body).toBeInstanceOf(FormData)
    expect(fetcher.mock.calls[0][1].headers).not.toHaveProperty('Content-Type')
  })

  it('returns a clear credential error without exposing the token', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({}, 401))
    const client = createGitLabClient(config, fetcher)

    await expect(
      client.listReviewers('rockteam/dragon/optics/lens-mechanics'),
    ).rejects.toThrow('GitLab 登录凭据已失效')
    await expect(
      client.listReviewers('rockteam/dragon/optics/lens-mechanics'),
    ).rejects.not.toThrow('secret-token')
  })

  it('recognizes an already-open MR conflict', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({ message: ['Another open merge request already exists'] }, 409),
    )
    const client = createGitLabClient(config, fetcher)

    await expect(
      client.createMergeRequest({
        projectPath: 'project',
        sourceBranch: 'dev/T2',
        targetBranch: 'main',
        title: '同步',
        description: '同步注释',
        reviewerIds: [42],
      }),
    ).rejects.toThrow('当前分支已经存在开放中的 MR')
  })

  it('still returns MR state when approvals are not permitted', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        iid: 9,
        state: 'merged',
        web_url: 'https://gitlab/project/-/merge_requests/9',
      }))
      .mockResolvedValueOnce(jsonResponse({ message: 'Forbidden' }, 403))
    const client = createGitLabClient(config, fetcher)

    await expect(client.getMergeRequest('project', 9)).resolves.toEqual({
      iid: 9,
      state: 'merged',
      approved: false,
      webUrl: 'https://gitlab/project/-/merge_requests/9',
    })
  })

  it('bounds history requests instead of loading an unlimited repository history', async () => {
    const rows = Array.from({ length: 100 }, (_, index) => ({
      id: `commit-${index}`,
      short_id: `${index}`.padStart(8, '0'),
      title: `Commit ${index}`,
      message: `Commit ${index}`,
      author_name: 'Engineer',
      committed_date: '2026-07-27T12:00:00Z',
    }))
    const fetcher = vi.fn().mockImplementation(() => new Response(
      JSON.stringify(rows),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'x-next-page': '2' },
      },
    ))
    const client = createGitLabClient(config, fetcher)

    const commits = await client.listCommits('project', 120)

    expect(commits).toHaveLength(120)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('reads commit history from the requested cloud branch', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse([]))
    const client = createGitLabClient(config, fetcher)

    await client.listCommits('project', 50, 'dev/T2')

    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining('ref_name=dev%2FT2'),
      expect.any(Object),
    )
  })

  it('reads version Tags and merged reviews for classified history', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse([{
        name: 'T2-第二次打样',
        message: '供应商打样版本',
        commit: { id: 'abc123', committed_date: '2026-07-29T10:00:00Z' },
      }]))
      .mockResolvedValueOnce(jsonResponse([{
        iid: 12,
        title: 'T2 第二次打样',
        source_branch: 'dev/T2',
        target_branch: 'main',
        merged_at: '2026-07-29T11:00:00Z',
        merged_by: { name: '审核人' },
      }]))
    const client = createGitLabClient(config, fetcher)

    await expect(client.listTags('project')).resolves.toEqual([expect.objectContaining({
      name: 'T2-第二次打样',
      commitId: 'abc123',
    })])
    await expect(client.listMergedRequests('project')).resolves.toEqual([expect.objectContaining({
      iid: 12,
      sourceBranch: 'dev/T2',
      targetBranch: 'main',
    })])
  })
})
