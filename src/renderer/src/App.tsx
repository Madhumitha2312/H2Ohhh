import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { AppDataProvider } from './context/AppDataProvider'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/SettingsPage'
import { BrowserReminder } from './components/BrowserReminder'

function LoadingScreen(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-50">
      <div className="animate-bounce text-5xl">💧</div>
    </div>
  )
}

function Protected({ children }: { children: ReactNode }): React.JSX.Element {
  const { user, ready } = useAuth()
  if (!ready) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireOnboarding({ children }: { children: ReactNode }): React.JSX.Element {
  const { user } = useAuth()
  if (user && !user.onboarded) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/onboarding"
        element={
          <Protected>
            <OnboardingPage />
          </Protected>
        }
      />
      <Route
        path="/dashboard"
        element={
          <Protected>
            <RequireOnboarding>
              <DashboardPage />
            </RequireOnboarding>
          </Protected>
        }
      />
      <Route
        path="/settings"
        element={
          <Protected>
            <RequireOnboarding>
              <SettingsPage />
            </RequireOnboarding>
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <AppDataProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
        <BrowserReminder />
      </AppDataProvider>
    </AuthProvider>
  )
}
