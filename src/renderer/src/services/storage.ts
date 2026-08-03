import type { UserProfile, HydrationState, Session } from '../types'
import { STORAGE_KEYS } from '../utils/constants'
import { todayKey } from '../utils/format'

export const defaultHydration = (): HydrationState => ({
  todayWater: 0,
  todaySips: 0,
  timeline: [],
  lastDrinkTime: null,
  lastReminderTime: null,
  streak: 0,
  longestStreak: 0,
  lastActiveDate: todayKey(),
  history: {},
  achievements: {},
  nextReminderAt: null,
  remindersPaused: false
})

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore write failures (e.g. private mode).
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function getUsers(): UserProfile[] {
  return readJSON<UserProfile[]>(STORAGE_KEYS.users, [])
}

export function saveUsers(users: UserProfile[]): void {
  writeJSON(STORAGE_KEYS.users, users)
}

export function getSession(): Session {
  return readJSON<Session>(STORAGE_KEYS.session, { userId: null, remember: false })
}

export function saveSession(session: Session): void {
  writeJSON(STORAGE_KEYS.session, session)
}

export function clearSession(): void {
  removeKey(STORAGE_KEYS.session)
}

export function getProfile(userId: string): UserProfile | null {
  const users = getUsers()
  const stored = users.find((u) => u.id === userId)
  if (!stored) return null
  const { passwordHash: _ignored, ...profile } = stored as UserProfile & { passwordHash?: string }
  return profile
}

export function saveProfile(profile: UserProfile): void {
  const users = getUsers()
  const idx = users.findIndex((u) => u.id === profile.id)
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...profile }
  } else {
    users.push(profile)
  }
  saveUsers(users)
}

export function getHydration(userId: string): HydrationState {
  return readJSON<HydrationState>(STORAGE_KEYS.hydration(userId), defaultHydration())
}

export function saveHydration(userId: string, state: HydrationState): void {
  writeJSON(STORAGE_KEYS.hydration(userId), state)
}
