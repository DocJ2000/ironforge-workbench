const storageKey = 'ironforge-workbench:navigation:gitlab'

function isGitLabRoute(path: string) {
  return path === '/history' || path === '/stages' || path.startsWith('/workspace')
}

export const navigationMemoryClient = {
  rememberGitLab(path: string) {
    if (isGitLabRoute(path)) localStorage.setItem(storageKey, path)
  },
  gitLabDestination() {
    const saved = localStorage.getItem(storageKey) ?? ''
    return isGitLabRoute(saved) ? saved : '/workspace'
  },
}
