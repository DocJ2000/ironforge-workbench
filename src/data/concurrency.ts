/** Run an async mapper with at most `limit` calls in flight. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const size = Math.min(Math.max(1, Math.floor(limit)), items.length)
  const results = new Array<R>(items.length)
  let cursor = 0

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await run(items[index], index)
    }
  }

  await Promise.all(Array.from({ length: size }, worker))
  return results
}
