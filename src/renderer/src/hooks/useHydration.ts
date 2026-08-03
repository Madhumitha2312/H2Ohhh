import { useCallback, useEffect, useRef, useState } from 'react'
import type { HydrationState, UserProfile } from '../types'
import { loadHydration, addWater, setReminderMeta, setRemindersPaused } from '../services/hydration'
import { todayKey } from '../utils/format'

export function useHydration(profile: UserProfile | null) {
  const userId = profile?.id ?? ''
  const goal = profile?.goal ?? 2500

  const [state, setState] = useState<HydrationState>(() =>
    userId ? loadHydration(userId, goal) : defaultEmptyState()
  )
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (!userId) return
    setState(loadHydration(userId, goal))
  }, [userId, goal])

  useEffect(() => {
    if (!userId) return
    const midnightCheck = window.setInterval(() => {
      if (stateRef.current.lastActiveDate !== todayKey()) {
        const next = loadHydration(userId, goal)
        stateRef.current = next
        setState(next)
      }
    }, 60000)
    return () => window.clearInterval(midnightCheck)
  }, [userId, goal])

  useEffect(() => {
    if (!window.api?.onAddWater) return
    const off = window.api.onAddWater((data) => {
      add(data.amount)
    })
    return off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, goal])

  const add = useCallback(
    (amount: number): string[] => {
      if (!userId) return []
      const res = addWater(userId, profile ?? { id: userId, goal } as UserProfile, stateRef.current, amount)
      stateRef.current = res.state
      setState(res.state)
      return res.unlocked
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, goal]
  )

  const setNextReminderAt = useCallback(
    (timestamp: number | null) => {
      if (!userId) return
      const next = setReminderMeta(userId, stateRef.current, timestamp)
      stateRef.current = next
      setState(next)
    },
    [userId]
  )

  const setPaused = useCallback(
    (paused: boolean) => {
      if (!userId) return
      const next = setRemindersPaused(userId, stateRef.current, paused)
      stateRef.current = next
      setState(next)
    },
    [userId]
  )

  return { state, add, setNextReminderAt, setPaused }
}

function defaultEmptyState(): HydrationState {
  return {
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
  }
}
