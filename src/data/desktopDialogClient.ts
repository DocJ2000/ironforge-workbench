export const desktopDialogClient = {
  available: () => Boolean(window.ironforgeDesktop?.dialogs),
  chooseDirectory: () =>
    window.ironforgeDesktop?.dialogs?.chooseDirectory() ?? Promise.resolve(null),
  chooseSshKey: () =>
    window.ironforgeDesktop?.dialogs?.chooseSshKey() ?? Promise.resolve(null),
}
