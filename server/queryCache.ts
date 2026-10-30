/**
 * Small read-through cache with in-flight de-duplication.
 *
 * The workbench reads the same project from several endpoints in one
 * interaction (project list, delivery overview, history, upload wizard). Each
 * read used to re-run the same git scan or GitLab request, so this cache
 * collapses those duplicates while keeping the data fresh for navigation.
 *
 * Rules that keep the cache honest:
 * - `invalidate(path)` runs after every write to that repository.
 * - a failed load is never cached.
 * - concurrent callers share one promise, so a burst cannot amplify.
 * - a forced read supersedes an in-flight one instead of joining it.
 */
export class QueryCache {
  private readonly entries = new Map<string, { expiresAt: number; value: unknown }>()
  private readonly pending = new Map<string, Promise<unknown>>()
  private readonly tokens = new Map<string, symbol>()
  private readonly defaultTtlMs: number

  constructor(defaultTtlMs: number) {
    this.defaultTtlMs = defaultTtlMs
  }

  async read<T>(
    key: string,
    load: () => Promise<T>,
    options: { ttlMs?: number; force?: boolean } = {},
  ): Promise<T> {
    if (!options.force) {
      const entry = this.entries.get(key)
      if (entry && entry.expiresAt > Date.now()) return entry.value as T
      const running = this.pending.get(key)
      if (running) return running as Promise<T>
    }

    const ttlMs = options.ttlMs ?? this.defaultTtlMs
    const token = Symbol(key)
    this.tokens.set(key, token)

    const settle = (settled: symbol) => settled === this.tokens.get(key)

    const promise = load().then(
      (value) => {
        if (settle(token)) {
          this.entries.set(key, { expiresAt: Date.now() + ttlMs, value })
          this.pending.delete(key)
          this.tokens.delete(key)
        }
        return value
      },
      (error: unknown) => {
        if (settle(token)) {
          this.entries.delete(key)
          this.pending.delete(key)
          this.tokens.delete(key)
        }
        throw error
      },
    )
    this.pending.set(key, promise)
    return promise
  }

  invalidate(prefix?: string) {
    if (prefix === undefined) {
      this.entries.clear()
      this.pending.clear()
      this.tokens.clear()
      return
    }
    for (const key of [...this.entries.keys()]) {
      if (key.startsWith(prefix)) this.entries.delete(key)
    }
  }
}
