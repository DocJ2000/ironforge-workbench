export const notificationClient = {
  async show(title: string, body: string) {
    if (window.ironforgeDesktop?.notifications) {
      await window.ironforgeDesktop.notifications.show({ title, body })
      return
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  },
}
