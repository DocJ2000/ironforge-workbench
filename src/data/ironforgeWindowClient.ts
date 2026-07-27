export const ironforgeWindowClient = {
  available() {
    return Boolean(window.ironforgeDesktop?.ironforge)
  },
  async open(url: string) {
    if (window.ironforgeDesktop?.ironforge) {
      await window.ironforgeDesktop.ironforge.open(url)
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  },
}
