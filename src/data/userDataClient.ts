export const userDataClient = {
  available: () => Boolean(window.ironforgeDesktop?.userData),

  async reset() {
    localStorage.clear()
    sessionStorage.clear()
    if (!window.ironforgeDesktop?.userData) {
      window.location.reload()
      return
    }
    await window.ironforgeDesktop.userData.reset()
  },
}
