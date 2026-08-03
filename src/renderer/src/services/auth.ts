import type { UserProfile, Gender } from '../types'
import { getUsers, saveUsers, saveProfile, saveSession, getSession, clearSession, getProfile } from './storage'
import { uid } from '../utils/format'

export interface SignupInput {
  name: string
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthResult {
  ok: boolean
  error?: string
  user?: UserProfile
}

function hashPassword(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return `h2o:${hash.toString(36)}:${password.length}`
}

const DEFAULT_PROFILE = (id: string, name: string, email: string, gender: Gender = 'female'): UserProfile => ({
  id,
  name,
  email,
  gender,
  goal: 2500,
  intervalMinutes: 30,
  avatarId: gender === 'male' ? 'boy' : 'girl',
  sound: 'waterdrop',
  voice: { enabled: false, volume: 1, rate: 1, pitch: 1 },
  theme: 'light',
  remindersEnabled: true,
  onboarded: false,
  createdAt: Date.now()
})

export function signup(input: SignupInput): AuthResult {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()

  if (!name) return { ok: false, error: 'Name is required.' }
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: 'Please enter a valid email.' }
  if (input.password.length < 4) return { ok: false, error: 'Password must be at least 4 characters.' }

  const users = getUsers()
  if (users.some((u) => u.email === email)) {
    return { ok: false, error: 'An account with this email already exists.' }
  }

  const profile = DEFAULT_PROFILE(uid(), name, email)
  const storedUser = { ...profile, email, passwordHash: hashPassword(input.password) }
  users.push(storedUser)
  saveUsers(users)
  saveSession({ userId: profile.id, remember: true })

  return { ok: true, user: profile }
}

export function login(input: LoginInput): AuthResult {
  const email = input.email.trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: 'Please enter a valid email.' }
  if (!input.password) return { ok: false, error: 'Password is required.' }

  const users = getUsers()
  const stored = users.find((u) => u.email === email)
  if (!stored) return { ok: false, error: 'No account found with this email.' }

  const hash = hashPassword(input.password)
  if ((stored as UserProfile & { passwordHash?: string }).passwordHash !== hash) {
    return { ok: false, error: 'Incorrect password.' }
  }

  saveSession({ userId: stored.id, remember: true })

  return { ok: true, user: getProfile(stored.id) ?? (stored as UserProfile) }
}

export function continueAsGuest(): UserProfile {
  const id = uid()
  const profile = DEFAULT_PROFILE(id, 'Guest', `guest@${id.slice(0, 8)}.local`, 'neutral')
  saveProfile(profile)
  saveSession({ userId: id, remember: true })
  return profile
}

export function logout(): void {
  clearSession()
}

export function getCurrentUserId(): string | null {
  return getSession().userId
}

export function updateProfile(patch: Partial<UserProfile>): UserProfile | null {
  const session = getSession()
  if (!session.userId) return null
  const current = getProfile(session.userId)
  if (!current) return null
  const updated = { ...current, ...patch }
  saveProfile(updated)
  return updated
}

export function forgotPassword(email: string): { ok: boolean; error?: string } {
  const users = getUsers()
  const found = users.find((u) => u.email === email.trim().toLowerCase())
  if (!found) return { ok: false, error: 'No account found with this email.' }
  return { ok: true }
}
