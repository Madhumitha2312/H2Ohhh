import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useHydration } from '../hooks/useHydration'
import { useReminder } from '../hooks/useReminder'
import type { ReminderApi } from '../hooks/useReminder'

interface AppDataValue {
  hydration: ReturnType<typeof useHydration>['state']
  add: (amount: number) => string[]
  setNextReminderAt: (timestamp: number | null) => void
  setPaused: (paused: boolean) => void
  reminder: ReminderApi
}

const AppDataContext = createContext<AppDataValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { user } = useAuth()
  const hydration = useHydration(user)
  const reminder = useReminder({
    profile: user,
    hydration: hydration.state,
    setNextReminderAt: hydration.setNextReminderAt,
    add: hydration.add
  })

  const value = useMemo<AppDataValue>(
    () => ({
      hydration: hydration.state,
      add: hydration.add,
      setNextReminderAt: hydration.setNextReminderAt,
      setPaused: hydration.setPaused,
      reminder
    }),
    [hydration, reminder]
  )

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
