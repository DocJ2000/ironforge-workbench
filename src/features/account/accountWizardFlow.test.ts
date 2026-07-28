import { describe, expect, it } from 'vitest'
import { firstIncompleteStep } from './accountWizardFlow'

describe('firstIncompleteStep', () => {
  it('starts with a welcome screen', () => {
    expect(firstIncompleteStep({
      started: false,
      organizationSaved: false,
      credentialsSaved: false,
      identityCreated: false,
      connectionVerified: false,
    })).toBe('welcome')
  })

  it.each([
    [{ started: true, organizationSaved: false, credentialsSaved: false, identityCreated: false, connectionVerified: false }, 'organization'],
    [{ started: true, organizationSaved: true, credentialsSaved: false, identityCreated: false, connectionVerified: false }, 'access-code'],
    [{ started: true, organizationSaved: true, credentialsSaved: true, identityCreated: false, connectionVerified: false }, 'identity'],
    [{ started: true, organizationSaved: true, credentialsSaved: true, identityCreated: true, connectionVerified: false }, 'registration'],
    [{ started: true, organizationSaved: true, credentialsSaved: true, identityCreated: true, connectionVerified: true }, 'complete'],
  ] as const)('returns the first unfinished screen', (status, expected) => {
    expect(firstIncompleteStep(status)).toBe(expected)
  })
})
