import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { UserProfile } from '../types'
import { getCurrentUserId, logout as logoutService, updateProfile as updateProfileService } from '../services/auth'
import { getProfile } from '../services/storage'

interface AuthContextValue {
  user: UserProfile | null
  ready: boolean
  setUser: (user: UserProfile | null) => void
  updateUser: (patch: Partial<UserProfile>) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUserState] = useState<UserProfile | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const id = getCurrentUserId()
    if (id) {
      const profile = getProfile(id)
      setUserState(profile)
    }
    setReady(true)
  }, [])

  const setUser = useCallback((next: UserProfile | null) => {
    setUserState(next)
  }, [])

  const updateUser = useCallback((patch: Partial<UserProfile>) => {
    setUserState((prev) => {
      if (!prev) return prev
      const updated = updateProfileService({ ...prev, ...patch })
      return updated ?? { ...prev, ...patch }
    })
  }, [])

  const logout = useCallback(() => {
    logoutService()
    setUserState(null)
  }, [])

  const value = useMemo(
    () => ({ user, ready, setUser, updateUser, logout }),
    [user, ready, setUser, updateUser, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
