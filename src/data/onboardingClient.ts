export interface OnboardingState { firstUpload: boolean; dismissed: boolean }
const key = 'ironforge-workbench:onboarding'
export const onboardingClient = {
  status(): OnboardingState {
    try { return { firstUpload: false, dismissed: false, ...JSON.parse(localStorage.getItem(key) ?? '{}') } }
    catch { return { firstUpload: false, dismissed: false } }
  },
  update(value: Partial<OnboardingState>) {
    localStorage.setItem(key, JSON.stringify({ ...this.status(), ...value }))
  },
}
