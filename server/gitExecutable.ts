export function gitExecutable() {
  return process.env.IRONFORGE_GIT_EXECUTABLE?.trim() || 'git'
}
