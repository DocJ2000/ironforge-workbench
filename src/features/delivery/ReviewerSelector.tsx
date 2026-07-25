import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { GitLabReviewer } from '../../domain/delivery'

interface ReviewerSelectorProps {
  reviewers: GitLabReviewer[]
  selectedIds: Set<number>
  onToggle: (id: number) => void
}

export function ReviewerSelector({
  reviewers,
  selectedIds,
  onToggle,
}: ReviewerSelectorProps) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return reviewers
    return reviewers.filter(
      (reviewer) =>
        reviewer.name.toLowerCase().includes(normalized) ||
        reviewer.username.toLowerCase().includes(normalized),
    )
  }, [query, reviewers])

  return (
    <>
      <label className="reviewer-search">
        <Search aria-hidden="true" size={15} />
        <input
          aria-label="搜索审核人"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索姓名或 GitLab 用户名"
          value={query}
        />
      </label>
      <div className="reviewer-list">
        {filtered.map((reviewer) => (
          <label className="reviewer-row" key={reviewer.id}>
            <span className="reviewer-avatar" aria-hidden="true">
              {reviewer.name.slice(0, 1)}
            </span>
            <span>
              <strong>{reviewer.name}</strong>
              <small>
                @{reviewer.username} · {reviewer.role}
                {reviewer.recommended ? ' · 推荐' : ''}
              </small>
            </span>
            <input
              aria-label={`选择审核人 ${reviewer.name}`}
              checked={selectedIds.has(reviewer.id)}
              onChange={() => onToggle(reviewer.id)}
              type="checkbox"
            />
          </label>
        ))}
      </div>
    </>
  )
}
