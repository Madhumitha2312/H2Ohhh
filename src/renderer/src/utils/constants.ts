import type { ReminderOption } from '../types'

export const APP_NAME = 'H2Ohhh'
export const TAGLINE = 'Turning Sips Into Streaks'

export const DESKTOP_DOWNLOAD_URL =
  'https://github.com/tanu234234/H2Ohhh/releases/latest/download/H2Ohhh%20Setup%201.0.0.exe'

export const STORAGE_KEYS = {
  users: 'h2ohhh:users',
  session: 'h2ohhh:session',
  profile: (id: string): string => `h2ohhh:user:${id}:profile`,
  hydration: (id: string): string => `h2ohhh:user:${id}:hydration`
} as const

export const TEST_INTERVALS: ReminderOption[] = [
  { minutes: 0.5, label: '30 Seconds' },
  { minutes: 1, label: '1 Minute' },
  { minutes: 2, label: '2 Minutes' },
  { minutes: 5, label: '5 Minutes' },
  { minutes: 10, label: '10 Minutes' },
  { minutes: 15, label: '15 Minutes' }
]

export const NORMAL_INTERVALS: ReminderOption[] = [
  { minutes: 30, label: '30 Minutes' },
  { minutes: 45, label: '45 Minutes' },
  { minutes: 60, label: '1 Hour' },
  { minutes: 120, label: '2 Hours' }
]

export const ALL_INTERVALS: ReminderOption[] = [...TEST_INTERVALS, ...NORMAL_INTERVALS]

export const SNOOZE_OPTIONS: ReminderOption[] = [
  { minutes: 2, label: '2 min' },
  { minutes: 5, label: '5 min' },
  { minutes: 10, label: '10 min' },
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hour' }
]

export const GOAL_OPTIONS = [1500, 2000, 2500, 3000, 3500]

export const SOUND_OPTIONS = [
  { id: 'waterdrop', label: 'Water Drop' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'bell', label: 'Bell' },
  { id: 'none', label: 'None' }
]

export const AVATAR_THEMES = [
  { id: 'girl', label: 'Friendly Girl', gender: 'female' },
  { id: 'boy', label: 'Friendly Boy', gender: 'male' },
  { id: 'waterdrop', label: 'Cute Water Drop', gender: 'neutral' },
  { id: 'bubble', label: 'Minimal Bubble', gender: 'neutral' }
] as const

export const QUICK_ADD = [250, 500, 750, 1000]

export const DRINK_AMOUNT = 250

export const REMINDER_MESSAGES = [
  (name: string): string => `Hey ${name}! 💧 It's time to take a sip.`,
  (name: string): string => `Hey ${name}! Stay hydrated.`,
  (name: string): string => `Hey ${name}! Let's take a quick water break.`
]

export function reminderSpeech(name: string): string {
  return `Hey ${name}! It's time to take a sip.`
}

export const PRAISE_MESSAGES = ['Awesome! 🎉', 'Great job! 💧', 'Keep it up! 💪', 'Perfect! ⭐']

export const VOICE_MESSAGES = [
  (name: string): string => `Hey ${name}, it's time to drink some water.`,
  (_name: string): string => `Hydration improves your focus. Take a quick sip.`,
  (_name: string): string => `You've been working hard. Stay hydrated.`
]

export const HYDRATION_TIPS = [
  'Drinking enough water improves focus and energy.',
  'A glass of water before meals helps digestion.',
  'Staying hydrated keeps your skin healthy and glowing.',
  'Drink water before you feel thirsty — thirst means you are already dehydrated.',
  'Water boosts your metabolism and helps with weight management.',
  'Your brain is about 75% water — keep it topped up.',
  'Cold water can help you cool down after a workout.',
  'Carrying a water bottle makes it easier to reach your goal.'
]

export const ACHIEVEMENTS_DEF = [
  {
    id: 'first_sip',
    title: 'First Sip',
    icon: '💧',
    description: 'Log your first glass of water.'
  },
  {
    id: 'half_goal',
    title: 'Half Goal',
    icon: '🌊',
    description: 'Reach 50% of your daily goal.'
  },
  {
    id: 'goal_completed',
    title: 'Goal Completed',
    icon: '🏆',
    description: 'Reach 100% of your daily goal.'
  },
  {
    id: 'streak_3',
    title: '3 Day Streak',
    icon: '🔥',
    description: 'Meet your goal 3 days in a row.'
  },
  {
    id: 'streak_7',
    title: '7 Day Streak',
    icon: '⚡',
    description: 'Meet your goal 7 days in a row.'
  },
  {
    id: 'streak_15',
    title: '15 Day Streak',
    icon: '🌟',
    description: 'Meet your goal 15 days in a row.'
  }
]

export function greetingForTime(date: Date = new Date()): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export function minutesLabel(minutes: number): string {
  if (minutes < 1) return `Every ${minutes * 60} sec`
  if (minutes < 60) return `Every ${minutes} min`
  const h = minutes / 60
  return `Every ${Number.isInteger(h) ? h : h.toFixed(1)} hr`
}
