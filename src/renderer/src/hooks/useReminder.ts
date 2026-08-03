import { useCallback, useEffect, useRef, useState } from 'react'
import type { HydrationState, UserProfile } from '../types'
import { REMINDER_MESSAGES, PRAISE_MESSAGES } from '../utils/constants'
import { randomOf } from '../utils/format'
import { stopSpeaking } from '../services/voice'

interface ReminderOptions {
  profile: UserProfile | null
  hydration: HydrationState
  setNextReminderAt: (timestamp: number | null) => void
  add: (amount: number) => string[]
}

export interface ReminderApi {
  visible: boolean
  message: string
  praise: string | null
  snoozeOpen: boolean
  secondsLeft: number
  drank: () => void
  snooze: (minutes: number) => void
  close: () => void
  toggleSnooze: () => void
}

export function useReminder({ profile, hydration, setNextReminderAt, add }: ReminderOptions): ReminderApi {
  const [visible, setVisible] = useState(false)
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [praise, setPraise] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (hydration.nextReminderAt) {
      return Math.max(0, Math.ceil((hydration.nextReminderAt - Date.now()) / 1000))
    }
    return 0
  })

  const deadlineRef = useRef<number | null>(hydration.nextReminderAt)
  const intervalRef = useRef<number | null>(null)
  const firedRef = useRef(false)
  const lastMessageRef = useRef<string | null>(null)
  const lastDrinkRef = useRef(hydration.lastDrinkTime)
  const [ipcPaused, setIpcPaused] = useState(false)
  const paused = hydration.remindersPaused || ipcPaused

  // Always point at the latest profile so a reminder that is already scheduled
  // speaks the CURRENT name / uses the current sound/voice, even if the profile
  // changes (rename, settings edit) after the timer was created.
  const profileRef = useRef(profile)
  profileRef.current = profile

  const stopTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    deadlineRef.current = null
  }, [])

  const closeAssistant = useCallback(() => {
    setVisible(false)
    setSnoozeOpen(false)
    setPraise(null)
    stopSpeaking()
    window.api?.closeOverlay?.()
  }, [])

  const fire = useCallback(() => {
    if (firedRef.current) return
    const p = profileRef.current
    if (!p) return
    firedRef.current = true
    stopTimer()

    const pool = REMINDER_MESSAGES.filter((fn) => fn(p.name) !== lastMessageRef.current)
    const pick = pool.length > 0 ? pool : REMINDER_MESSAGES
    const text = randomOf(pick)(p.name)
    lastMessageRef.current = text
    setMessage(text)
    setPraise(null)
    setSnoozeOpen(false)

    setNextReminderAt(null)

    const payload = {
      name: p.name,
      avatarId: p.avatarId,
      gender: p.gender,
      message: text,
      sound: p.sound,
      voice: p.voice
    }

    if (window.api?.reminderTriggered) {
      // Electron mode: the desktop overlay window handles the reminder.
      window.api.reminderTriggered(payload)
      setVisible(false)
    } else {
      // Browser mode: no desktop overlay, so show the in-page assistant.
      setVisible(true)
    }
  }, [stopTimer, setNextReminderAt])

  const schedule = useCallback(
    (minutes: number) => {
      stopTimer()
      firedRef.current = false
      deadlineRef.current = Date.now() + minutes * 60000
      setSecondsLeft(minutes * 60)
      setNextReminderAt(deadlineRef.current)

      intervalRef.current = window.setInterval(() => {
        const remaining = (deadlineRef.current ?? 0) - Date.now()
        setSecondsLeft(Math.max(0, Math.ceil(remaining / 1000)))
        if (remaining <= 0) {
          fire()
        }
      }, 1000)
    },
    [stopTimer, fire, setNextReminderAt]
  )

  useEffect(() => {
    if (!profile) return
    const minutes = profile.intervalMinutes
    const enabled = profile.remindersEnabled && !paused
    if (!enabled) {
      stopTimer()
      setSecondsLeft(0)
      setNextReminderAt(null)
      closeAssistant()
      return
    }
    schedule(minutes)
    return () => {
      stopTimer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.intervalMinutes, profile?.remindersEnabled, paused])

  useEffect(() => {
    if (!profile) return
    window.api?.sendReminderSync?.({
      intervalMinutes: profile.intervalMinutes,
      enabled: profile.remindersEnabled,
      paused,
      name: profile.name,
      avatarId: profile.avatarId,
      sound: profile.sound
    })
  }, [profile, paused])

  useEffect(() => {
    if (!window.api?.onSnooze) return
    const off = window.api.onSnooze((data) => {
      closeAssistant()
      schedule(data.minutes)
    })
    return off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  useEffect(() => {
    if (!window.api?.onReminderPaused) return
    const off = window.api.onReminderPaused((pausedValue) => {
      setIpcPaused(pausedValue)
    })
    return off
  }, [])

  // Restart the timer when water is added from an external source
  // (desktop overlay "I Drank" or tray "Drink Water") while the
  // reminder is already in its fired/idle state.
  useEffect(() => {
    if (hydration.lastDrinkTime === lastDrinkRef.current) return
    lastDrinkRef.current = hydration.lastDrinkTime
    if (!profile) return
    if (firedRef.current && profile.remindersEnabled && !paused) {
      schedule(profile.intervalMinutes)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydration.lastDrinkTime])

  const drank = useCallback(() => {
    if (!profile) return
    add(250)
    setPraise(randomOf(PRAISE_MESSAGES))
    closeAssistant()
    schedule(profile.intervalMinutes)
  }, [profile, add, closeAssistant, schedule])

  const snooze = useCallback(
    (minutes: number) => {
      closeAssistant()
      schedule(minutes)
    },
    [closeAssistant, schedule]
  )

  const toggleSnooze = useCallback(() => {
    setSnoozeOpen((prev) => !prev)
  }, [])

  return { visible, message, praise, snoozeOpen, secondsLeft, drank, snooze, close: closeAssistant, toggleSnooze }
}
