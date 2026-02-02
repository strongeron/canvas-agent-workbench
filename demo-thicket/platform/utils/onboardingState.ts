type OnboardingState = {
  stripe_connected: boolean
  profile_completed: boolean
  course_created: boolean
  all_completed_dismissed: boolean
}

const STORAGE_KEY = "thicket-onboarding-state"

const DEFAULT_STATE: OnboardingState = {
  stripe_connected: false,
  profile_completed: false,
  course_created: false,
  all_completed_dismissed: false,
}

function readState(): OnboardingState {
  if (typeof window === "undefined") return DEFAULT_STATE
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE
  } catch {
    return DEFAULT_STATE
  }
}

function writeState(state: OnboardingState) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function getOnboardingState(): OnboardingState {
  return readState()
}

export function markStepCompleted(step: keyof OnboardingState) {
  const next = { ...readState(), [step]: true }
  writeState(next)
}

export function areAllStepsCompleted() {
  const state = readState()
  return state.stripe_connected && state.profile_completed && state.course_created
}

