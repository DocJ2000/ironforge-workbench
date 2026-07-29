export function gitLabProjectPath(remote: string) {
  const value = remote.trim()
  const scpPath = value.match(/^[^@]+@[^:]+:(.+?)(?:\.git)?$/)?.[1]
  if (scpPath) return scpPath

  try {
    const url = new URL(value)
    return url.pathname.replace(/^\/|\/$/g, '').replace(/\.git$/, '')
  } catch {
    return value.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '')
  }
}
