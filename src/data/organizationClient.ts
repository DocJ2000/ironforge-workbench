export interface OrganizationSettings {
  gitlabUrl: string
  ironforgeUrl: string
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
    return normalized
  },
}
