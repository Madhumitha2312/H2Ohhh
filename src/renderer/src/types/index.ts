export type Gender = 'female' | 'male' | 'neutral'

export interface VoiceSettings {
  enabled: boolean
  volume: number
  rate: number
  pitch: number
}

export interface UserProfile {
  id: string
  name: string
  email: string
  gender: Gender
  goal: number
  intervalMinutes: number
  avatarId: string
  sound: string
  voice: VoiceSettings
  theme: 'light' | 'dark'
  remindersEnabled: boolean
  onboarded?: boolean
  createdAt: number
}

export interface SipEntry {
  id: string
  amount: number
  timestamp: number
}

export interface Achievement {
  id: string
  title: string
  icon: string
  description: string
  unlocked: boolean
  unlockedAt?: number
}

export interface DailyRecord {
  date: string
  water: number
  goal: number
  goalMet: boolean
  sips: number
}

export interface HydrationState {
  todayWater: number
  todaySips: number
  timeline: SipEntry[]
  lastDrinkTime: number | null
  lastReminderTime: number | null
  streak: number
  longestStreak: number
  lastActiveDate: string
  history: Record<string, DailyRecord>
  achievements: Record<string, boolean>
  nextReminderAt: number | null
  remindersPaused: boolean
}

export interface ReminderOption {
  minutes: number
  label: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
}

export interface Session {
  userId: string | null
  remember: boolean
}

export type AvatarTheme =
  | { kind: 'gender'; gender: Exclude<Gender, 'neutral'>; id: string; label: string }
  | { kind: 'custom'; id: string; label: string; asset: string }
