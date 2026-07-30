export function parseExternalHttpUrl(value: string) {
  try {
    const target = new URL(value)
    return target.protocol === 'https:' || target.protocol === 'http:'
      ? target
      : null
  } catch {
    return null
  }
}
