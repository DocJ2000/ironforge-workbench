export interface OrganizationSettings {
  gitlabUrl: string
  ironforgeUrl: string
  connectionVerified?: boolean
}

const storageKey = 'ironforge-workbench:organization'
const emptySettings: OrganizationSettings = { gitlabUrl: '', ironforgeUrl: '' }

export const organizationClient = {
  load(): OrganizationSettings {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Partial<OrganizationSettings>
      return {
        gitlabUrl: parsed.gitlabUrl?.trim() ?? '',
        ironforgeUrl: parsed.ironforgeUrl?.trim() ?? '',
      }
    } catch {
      return emptySettings
    }
  },
  save(settings: OrganizationSettings) {
    const normalized = {
      gitlabUrl: settings.gitlabUrl.trim().replace(/\/$/, ''),
      ironforgeUrl: settings.ironforgeUrl.trim().replace(/\/$/, ''),
    }
    localStorage.setItem(storageKey, JSON.stringify(normalized))
    void window.ironforgeDesktop?.settings?.save({
      ...normalized,
      connectionVerified: settings.connectionVerified === true,
    })
    return normalized
  },
  async loadDurable(): Promise<OrganizationSettings> {
    const local = this.load()
    const bridge = window.ironforgeDesktop?.settings
    if (!bridge) return local
    const saved = await bridge.load()
    if (!saved.gitlabUrl && local.gitlabUrl) {
      await bridge.save({
        ...local,
        connectionVerified:
          localStorage.getItem('ironforge-workbench:connection-verified') === 'true',
      })
      return local
    }
    localStorage.setItem(storageKey, JSON.stringify(saved))
    if (saved.connectionVerified) {
      localStorage.setItem('ironforge-workbench:connection-verified', 'true')
    }
    return saved
  },
}
