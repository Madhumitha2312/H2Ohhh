import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../hooks/useAuth'
import { login, continueAsGuest, forgotPassword } from '../services/auth'

export function LoginPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMessage, setForgotMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = login({ email, password })
    setLoading(false)
    if (!result.ok || !result.user) {
      setError(result.error ?? 'Login failed.')
      return
    }
    setUser(result.user)
    void remember
    navigate(result.user.onboarded ? '/dashboard' : '/onboarding')
  }

  const handleGuest = (): void => {
    const guest = continueAsGuest()
    setUser(guest)
    navigate('/onboarding')
  }

  const handleForgot = (e: FormEvent): void => {
    e.preventDefault()
    const result = forgotPassword(forgotEmail)
    setForgotMessage(result.ok ? 'Password reset link sent. Check your email.' : (result.error ?? 'Something went wrong.'))
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to keep your hydration streak going.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">{error}</p>}

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-600">Email</label>
          <input
            type="email"
            className="input-glass"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-600">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="input-glass pr-12"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-slate-400 transition hover:text-blue-500"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-slate-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-blue-300 accent-blue-600"
            />
            Remember Me
          </label>
          <button type="button" onClick={() => setForgotOpen((v) => !v)} className="font-semibold text-blue-600 hover:text-blue-700">
            Forgot Password?
          </button>
        </div>

        {forgotOpen && (
          <form onSubmit={handleForgot} className="animate-fade-in-up rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <p className="mb-2 text-sm font-medium text-slate-600">Reset your password</p>
            <input
              type="email"
              className="input-glass"
              placeholder="Enter your email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
            />
            {forgotMessage && <p className="mt-2 text-xs font-medium text-blue-600">{forgotMessage}</p>}
            <button type="submit" className="btn-ghost mt-3 w-full text-sm">
              Send Reset Link
            </button>
          </form>
        )}

        <button type="submit" disabled={loading} className="btn-primary mt-1">
          {loading ? 'Logging in…' : 'Log In'}
        </button>
      </form>

      <button onClick={handleGuest} className="btn-ghost mt-3 w-full text-sm">
        Continue as Guest
      </button>

      <p className="mt-5 text-center text-sm text-slate-500">
        Don't have an account?{' '}
        <Link to="/signup" className="font-semibold text-blue-600 hover:text-blue-700">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  )
}
