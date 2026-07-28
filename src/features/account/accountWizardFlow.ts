export type AccountWizardStep =
  | 'welcome'
  | 'organization'
  | 'access-code'
  | 'identity'
  | 'registration'
  | 'connection-check'
  | 'complete'

export interface AccountSetupStatus {
  started: boolean
  organizationSaved: boolean
  credentialsSaved: boolean
  identityCreated: boolean
  connectionVerified: boolean
}

export function firstIncompleteStep(status: AccountSetupStatus): AccountWizardStep {
  if (!status.started) return 'welcome'
  if (!status.organizationSaved) return 'organization'
  if (!status.credentialsSaved) return 'access-code'
  if (!status.identityCreated) return 'identity'
  if (!status.connectionVerified) return 'registration'
  return 'complete'
}
