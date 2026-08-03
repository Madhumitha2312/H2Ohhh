import type { UserProfile, HydrationState, SipEntry, DailyRecord } from '../types'
import { getHydration, saveHydration, defaultHydration } from './storage'
import { todayKey, uid } from '../utils/format'
import { ACHIEVEMENTS_DEF, DRINK_AMOUNT } from '../utils/constants'

export interface AddWaterResult {
  state: HydrationState
  unlocked: string[]
}

function dateKeyOf(key: string): Date {
  return new Date(`${key}T00:00:00`)
}

function addDays(key: string, days: number): string {
  const d = dateKeyOf(key)
  d.setDate(d.getDate() + days)
  return todayKey(d)
}

export function runDailyReset(userId: string, goal: number, current = todayKey()): HydrationState {
  const state = getHydration(userId)
  if (state.lastActiveDate === current) return state

  const next: HydrationState = { ...state }
  let cursor = state.lastActiveDate || current

  // Record every day between lastActiveDate and today.
  let guard = 0
  while (cursor < current && guard < 400) {
    const previousWater = cursor === state.lastActiveDate ? state.todayWater : 0
    const previousGoalMet = previousWater >= goal
    const record: DailyRecord = {
      date: cursor,
      water: previousWater,
      goal,
      goalMet: previousGoalMet,
      sips: cursor === state.lastActiveDate ? state.todaySips : 0
    }
    next.history = { ...next.history, [cursor]: record }
    if (previousGoalMet) {
      next.streak += 1
      next.longestStreak = Math.max(next.longestStreak, next.streak)
    } else {
      next.streak = 0
    }
    cursor = addDays(cursor, 1)
    guard += 1
  }

  next.todayWater = 0
  next.todaySips = 0
  next.timeline = []
  next.lastDrinkTime = null
  next.lastActiveDate = current

  saveHydration(userId, next)
  return next
}

export function loadHydration(userId: string, goal: number): HydrationState {
  const base = getHydration(userId)
  if (!base.lastActiveDate) {
    const fresh = { ...defaultHydration(), lastActiveDate: todayKey() }
    saveHydration(userId, fresh)
    return fresh
  }
  return runDailyReset(userId, goal)
}

function recomputeAchievements(state: HydrationState, goal: number): string[] {
  const unlocked: string[] = []
  const check = (def: (typeof ACHIEVEMENTS_DEF)[number]): void => {
    let condition = false
    switch (def.id) {
      case 'first_sip':
        condition = state.todaySips >= 1
        break
      case 'half_goal':
        condition = state.todayWater >= goal * 0.5
        break
      case 'goal_completed':
        condition = state.todayWater >= goal
        break
      case 'streak_3':
      case 'streak_7':
      case 'streak_15': {
        const n = Number(def.id.split('_')[1])
        condition = state.streak >= n
        break
      }
    }
    if (condition && !state.achievements[def.id]) {
      state.achievements = { ...state.achievements, [def.id]: true }
      unlocked.push(def.id)
    }
  }
  ACHIEVEMENTS_DEF.forEach(check)
  return unlocked
}

export function addWater(userId: string, profile: UserProfile, current: HydrationState, amount: number): AddWaterResult {
  const entry: SipEntry = { id: uid(), amount, timestamp: Date.now() }
  const state: HydrationState = {
    ...current,
    todayWater: current.todayWater + amount,
    todaySips: current.todaySips + 1,
    timeline: [entry, ...current.timeline].slice(0, 50),
    lastDrinkTime: Date.now(),
    lastActiveDate: todayKey()
  }
  const unlocked = recomputeAchievements(state, profile.goal)
  saveHydration(userId, state)
  return { state, unlocked }
}

export function setReminderMeta(userId: string, current: HydrationState, nextReminderAt: number | null): HydrationState {
  const state: HydrationState = {
    ...current,
    lastReminderTime: Date.now(),
    nextReminderAt
  }
  saveHydration(userId, state)
  return state
}

export function setRemindersPaused(userId: string, current: HydrationState, paused: boolean): HydrationState {
  const state: HydrationState = { ...current, remindersPaused: paused }
  saveHydration(userId, state)
  return state
}

export function defaultSipAmount(): number {
  return DRINK_AMOUNT
}
